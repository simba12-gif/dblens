import { Parser } from 'node-sql-parser';
import {
  Column,
  Index,
  TableNode,
  RelationshipEdge,
  SchemaGraph,
  ParseError,
} from '../types/schema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateTableId(name: string): string {
  return `table_${name.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
}

function generateEdgeId(
  sourceTable: string,
  sourceCol: string,
  targetTable: string,
  targetCol: string,
): string {
  return `edge_${sourceTable}_${sourceCol}_to_${targetTable}_${targetCol}`.toLowerCase();
}

function stripQuotes(value: string): string {
  return value.replace(/^["`']|["`']$/g, '');
}

function normaliseType(raw: string | undefined): string {
  if (!raw) return 'unknown';
  return raw.replace(/\s+/g, ' ').trim().toUpperCase();
}

// ---------------------------------------------------------------------------
// AST-based parser (node-sql-parser)
// ---------------------------------------------------------------------------

function parseWithAst(sql: string): SchemaGraph {
  const parser = new Parser();

  // Try PostgreSQL first, then MySQL, then fall back to generic
  const dialects: Array<'postgresql' | 'mysql'> = ['postgresql', 'mysql'];
  let ast: any = null;
  let lastErr: Error | null = null;

  for (const db of dialects) {
    try {
      const opts = { database: db as string };
      ast = parser.astify(sql, opts);
      break;
    } catch (err) {
      lastErr = err as Error;
    }
  }

  if (!ast) {
    // One more attempt without specifying database
    try {
      ast = parser.astify(sql);
    } catch {
      throw lastErr ?? new Error('Failed to parse SQL');
    }
  }

  const statements: any[] = Array.isArray(ast) ? ast : [ast];

  const tables: Map<string, TableNode> = new Map();
  const edges: RelationshipEdge[] = [];
  const indexList: { tableName: string; index: Index }[] = [];

  for (const stmt of statements) {
    if (!stmt) continue;

    // ---- CREATE TABLE ---------------------------------------------------
    if (
      stmt.type === 'create' &&
      stmt.keyword === 'table'
    ) {
      const rawTableName: string =
        typeof stmt.table === 'string'
          ? stmt.table
          : stmt.table?.[0]?.table ?? 'unknown';
      const tableName = stripQuotes(rawTableName);
      const tableId = generateTableId(tableName);

      const columns: Column[] = [];
      const tableIndexes: Index[] = [];

      // Track table-level PK columns
      const pkColumns = new Set<string>();

      // First pass: collect table-level constraints
      const definitions: any[] = stmt.create_definitions ?? [];
      for (const def of definitions) {
        if (def.resource === 'constraint' || def.constraint_type) {
          const ctype = (
            def.constraint_type ??
            def.definition?.[0]?.constraint_type ??
            ''
          )
            .toString()
            .toUpperCase();

          if (ctype.includes('PRIMARY')) {
            const keyCols: any[] = def.definition ?? def.columns ?? [];
            for (const kc of keyCols) {
              const colName =
                typeof kc === 'string'
                  ? stripQuotes(kc)
                  : stripQuotes(kc.column ?? kc.expr?.column ?? '');
              if (colName) pkColumns.add(colName.toLowerCase());
            }
          }

          if (ctype.includes('FOREIGN') || ctype.includes('REFERENCES')) {
            const fkCols: any[] = def.definition ?? def.columns ?? [];
            const refTable = stripQuotes(
              def.reference_definition?.table?.[0]?.table ??
                def.reference?.table ?? '',
            );
            const refCols: any[] =
              def.reference_definition?.definition ??
              def.reference?.columns ??
              [];

            for (let i = 0; i < fkCols.length; i++) {
              const srcCol =
                typeof fkCols[i] === 'string'
                  ? stripQuotes(fkCols[i])
                  : stripQuotes(
                      fkCols[i].column ?? fkCols[i].expr?.column ?? '',
                    );
              const tgtCol =
                refCols[i] != null
                  ? typeof refCols[i] === 'string'
                    ? stripQuotes(refCols[i])
                    : stripQuotes(
                        refCols[i].column ?? refCols[i].expr?.column ?? '',
                      )
                  : srcCol;

              if (srcCol && refTable) {
                edges.push({
                  id: generateEdgeId(tableName, srcCol, refTable, tgtCol),
                  source: tableName,
                  target: refTable,
                  sourceColumn: srcCol,
                  targetColumn: tgtCol,
                  type: 'one-to-many',
                });
              }
            }
          }
        }
      }

      // Second pass: columns
      for (const def of definitions) {
        if (def.resource === 'constraint' || def.constraint_type) continue;

        const colName = stripQuotes(def.column?.column ?? def.column ?? '');
        if (!colName) continue;

        const dataType = normaliseType(
          def.definition?.dataType ?? def.dataType ?? def.definition?.type ?? '',
        );

        let nullable = true;
        let isPK = pkColumns.has(colName.toLowerCase());
        let defaultValue: string | undefined;
        let references: Column['references'] | undefined;

        // Inline constraints
        const inlineConstraints: any[] =
          def.nullable ?? def.constraint ?? def.definition?.constraint ?? [];
        const constraintArr = Array.isArray(inlineConstraints)
          ? inlineConstraints
          : [inlineConstraints];

        for (const c of constraintArr) {
          if (!c) continue;
          const cVal =
            typeof c === 'string' ? c.toUpperCase() : '';
          const cType =
            typeof c === 'object'
              ? (c.type ?? c.constraint_type ?? '').toString().toUpperCase()
              : cVal;

          if (cType.includes('NOT NULL') || cVal === 'NOT NULL') {
            nullable = false;
          }
          if (cType.includes('PRIMARY')) {
            isPK = true;
          }
        }

        // Check nullable field directly
        if (def.nullable?.type === 'not null' || def.nullable === 'not null') {
          nullable = false;
        }

        // Primary keys are inherently NOT NULL
        if (isPK) nullable = false;

        // Default value
        if (def.default_val != null) {
          defaultValue =
            typeof def.default_val === 'object'
              ? JSON.stringify(def.default_val.value ?? def.default_val)
              : String(def.default_val);
        }

        // Inline REFERENCES
        if (def.reference_definition || def.references) {
          const ref = def.reference_definition ?? def.references;
          const refTable = stripQuotes(
            ref?.table?.[0]?.table ?? ref?.table ?? '',
          );
          const refCol = stripQuotes(
            ref?.definition?.[0]?.column ??
              ref?.columns?.[0]?.column ??
              ref?.columns?.[0] ??
              '',
          );
          if (refTable) {
            references = { table: refTable, column: refCol || colName };
            edges.push({
              id: generateEdgeId(tableName, colName, refTable, refCol || colName),
              source: tableName,
              target: refTable,
              sourceColumn: colName,
              targetColumn: refCol || colName,
              type: 'one-to-many',
            });
          }
        }

        columns.push({
          name: colName,
          type: dataType,
          nullable,
          isPrimaryKey: isPK,
          isForeignKey: !!references,
          defaultValue,
          references,
        });
      }

      tables.set(tableName, {
        id: tableId,
        name: tableName,
        columns,
        indexes: tableIndexes,
      });
    }

    // ---- CREATE INDEX ----------------------------------------------------
    if (
      stmt.type === 'create' &&
      (stmt.keyword === 'index' || stmt.keyword === 'unique index')
    ) {
      const idxName = stripQuotes(stmt.index ?? stmt.name ?? 'unnamed_index');
      const idxTable = stripQuotes(
        stmt.table?.[0]?.table ?? stmt.table ?? '',
      );
      const idxCols: string[] = (stmt.columns ?? stmt.definition ?? []).map(
        (c: any) =>
          typeof c === 'string'
            ? stripQuotes(c)
            : stripQuotes(c.column ?? c.expr?.column ?? ''),
      );
      const unique =
        stmt.index_type === 'unique' ||
        (stmt.keyword ?? '').toString().toLowerCase().includes('unique');

      indexList.push({
        tableName: idxTable,
        index: { name: idxName, columns: idxCols, unique },
      });
    }
  }

  // Attach indexes to their tables
  for (const { tableName, index } of indexList) {
    const tbl = tables.get(tableName);
    if (tbl) {
      tbl.indexes.push(index);
    }
  }

  // Mark foreign key columns based on collected edges
  for (const edge of edges) {
    const tbl = tables.get(edge.source);
    if (tbl) {
      const col = tbl.columns.find((c) => c.name === edge.sourceColumn);
      if (col) {
        col.isForeignKey = true;
        if (!col.references) {
          col.references = {
            table: edge.target,
            column: edge.targetColumn,
          };
        }
      }
    }
  }

  const tableArr = Array.from(tables.values());
  const totalColumns = tableArr.reduce((s, t) => s + t.columns.length, 0);

  return {
    tables: tableArr,
    edges,
    metadata: {
      tableCount: tableArr.length,
      columnCount: totalColumns,
      relationshipCount: edges.length,
      parseTimeMs: 0, // filled by caller
    },
  };
}

// ---------------------------------------------------------------------------
// Regex-based fallback parser
// ---------------------------------------------------------------------------

function parseWithRegex(sql: string): SchemaGraph {
  const tables: TableNode[] = [];
  const edges: RelationshipEdge[] = [];

  // Match CREATE TABLE blocks
  const tableRegex =
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?(\w+)["`]?\s*\(([\s\S]*?)\)\s*;/gi;

  let tableMatch: RegExpExecArray | null;
  while ((tableMatch = tableRegex.exec(sql)) !== null) {
    const tableName = stripQuotes(tableMatch[1]);
    const tableId = generateTableId(tableName);
    const body = tableMatch[2];

    const columns: Column[] = [];
    const indexes: Index[] = [];
    const pkColumns = new Set<string>();

    // Split on commas that are NOT inside parentheses
    const lines = splitConstraintAware(body);

    // First pass – table-level PRIMARY KEY & FOREIGN KEY
    for (const line of lines) {
      const trimmed = line.trim();

      // Table-level PRIMARY KEY (col1, col2)
      const pkMatch = trimmed.match(
        /PRIMARY\s+KEY\s*\(\s*([^)]+)\)/i,
      );
      if (pkMatch && !trimmed.match(/^\w+\s+/)) {
        // Only if it's a standalone constraint (not a column definition)
        const cols = pkMatch[1].split(',').map((c) => stripQuotes(c.trim()));
        cols.forEach((c) => pkColumns.add(c.toLowerCase()));
      }

      // FOREIGN KEY (col) REFERENCES table(col)
      const fkMatch = trimmed.match(
        /FOREIGN\s+KEY\s*\(\s*["`]?(\w+)["`]?\s*\)\s*REFERENCES\s+["`]?(\w+)["`]?\s*\(\s*["`]?(\w+)["`]?\s*\)/i,
      );
      if (fkMatch) {
        const srcCol = fkMatch[1];
        const refTable = fkMatch[2];
        const refCol = fkMatch[3];
        edges.push({
          id: generateEdgeId(tableName, srcCol, refTable, refCol),
          source: tableName,
          target: refTable,
          sourceColumn: srcCol,
          targetColumn: refCol,
          type: 'one-to-many',
        });
      }
    }

    // Second pass – column definitions
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Skip pure constraints
      if (/^(PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK|CONSTRAINT)\s/i.test(trimmed)) {
        // But capture UNIQUE (cols) as an index
        const uniqMatch = trimmed.match(
          /UNIQUE\s*(?:KEY\s*)?(?:["`]?\w+["`]?\s*)?\(\s*([^)]+)\)/i,
        );
        if (uniqMatch) {
          const cols = uniqMatch[1].split(',').map((c) => stripQuotes(c.trim()));
          indexes.push({ name: `uq_${tableName}_${cols.join('_')}`, columns: cols, unique: true });
        }
        continue;
      }

      // Column definition: name type [constraints...]
      const colMatch = trimmed.match(
        /^["`]?(\w+)["`]?\s+([\w]+(?:\s*\([^)]*\))?)\s*(.*)/i,
      );
      if (!colMatch) continue;

      const colName = colMatch[1];
      const colType = normaliseType(colMatch[2]);
      const rest = colMatch[3] ?? '';

      const isPK =
        pkColumns.has(colName.toLowerCase()) ||
        /PRIMARY\s+KEY/i.test(rest);
      const notNull = /NOT\s+NULL/i.test(rest) || isPK;
      const nullable = !notNull;

      let defaultValue: string | undefined;
      const defMatch = rest.match(/DEFAULT\s+(\S+)/i);
      if (defMatch) defaultValue = defMatch[1];

      let references: Column['references'] | undefined;
      const refMatch = rest.match(
        /REFERENCES\s+["`]?(\w+)["`]?\s*\(\s*["`]?(\w+)["`]?\s*\)/i,
      );
      if (refMatch) {
        references = { table: refMatch[1], column: refMatch[2] };
        edges.push({
          id: generateEdgeId(tableName, colName, refMatch[1], refMatch[2]),
          source: tableName,
          target: refMatch[1],
          sourceColumn: colName,
          targetColumn: refMatch[2],
          type: 'one-to-many',
        });
      }

      if (isPK) pkColumns.add(colName.toLowerCase());

      columns.push({
        name: colName,
        type: colType,
        nullable,
        isPrimaryKey: isPK,
        isForeignKey: !!references,
        defaultValue,
        references,
      });
    }

    // Mark FK columns from edges
    for (const edge of edges) {
      if (edge.source === tableName) {
        const col = columns.find((c) => c.name === edge.sourceColumn);
        if (col && !col.isForeignKey) {
          col.isForeignKey = true;
          col.references = { table: edge.target, column: edge.targetColumn };
        }
      }
    }

    tables.push({ id: tableId, name: tableName, columns, indexes });
  }

  // CREATE INDEX statements
  const indexRegex =
    /CREATE\s+(UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?(\w+)["`]?\s+ON\s+["`]?(\w+)["`]?\s*\(\s*([^)]+)\)/gi;

  let idxMatch: RegExpExecArray | null;
  while ((idxMatch = indexRegex.exec(sql)) !== null) {
    const unique = !!idxMatch[1];
    const idxName = idxMatch[2];
    const idxTable = idxMatch[3];
    const cols = idxMatch[4].split(',').map((c) => stripQuotes(c.trim()));

    const tbl = tables.find((t) => t.name === idxTable);
    if (tbl) {
      tbl.indexes.push({ name: idxName, columns: cols, unique });
    }
  }

  const totalColumns = tables.reduce((s, t) => s + t.columns.length, 0);

  return {
    tables,
    edges,
    metadata: {
      tableCount: tables.length,
      columnCount: totalColumns,
      relationshipCount: edges.length,
      parseTimeMs: 0,
    },
  };
}

/**
 * Split a CREATE TABLE body on top-level commas (not inside parentheses).
 */
function splitConstraintAware(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';

  for (const ch of body) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function parseSql(sqlContent: string): SchemaGraph {
  const start = performance.now();

  if (!sqlContent || !sqlContent.trim()) {
    const err: ParseError = {
      message: 'SQL input is empty.',
      suggestion: 'Provide at least one CREATE TABLE statement.',
    };
    throw err;
  }

  let graph: SchemaGraph;

  try {
    graph = parseWithAst(sqlContent);
  } catch {
    // AST parser failed — fall back to regex
    try {
      graph = parseWithRegex(sqlContent);
    } catch (regexErr) {
      const err: ParseError = {
        message: `Failed to parse SQL: ${regexErr instanceof Error ? regexErr.message : String(regexErr)}`,
        suggestion:
          'Ensure your SQL contains valid CREATE TABLE statements. ' +
          'Supported dialects: MySQL, PostgreSQL.',
      };
      throw err;
    }
  }

  // If the AST parser succeeded but returned nothing useful, try regex
  if (graph.tables.length === 0) {
    const regexGraph = parseWithRegex(sqlContent);
    if (regexGraph.tables.length > 0) {
      graph = regexGraph;
    }
  }

  if (graph.tables.length === 0) {
    const err: ParseError = {
      message: 'No tables found in the provided SQL.',
      suggestion:
        'Make sure your input contains CREATE TABLE statements. ' +
        'Example: CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(100));',
    };
    throw err;
  }

  const elapsed = performance.now() - start;
  graph.metadata.parseTimeMs = Math.round(elapsed * 100) / 100;

  return graph;
}
