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

function computeMetadataStats(tables: TableNode[], edges: RelationshipEdge[]) {
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();

  for (const table of tables) {
    incoming.set(table.name, 0);
    outgoing.set(table.name, 0);
  }

  for (const edge of edges) {
    if (outgoing.has(edge.source)) outgoing.set(edge.source, outgoing.get(edge.source)! + 1);
    if (incoming.has(edge.target)) incoming.set(edge.target, incoming.get(edge.target)! + 1);
  }

  let mostConnectedTable: string | null = null;
  let maxEdges = -1;
  let orphans = 0;

  for (const table of tables) {
    const total = (incoming.get(table.name) || 0) + (outgoing.get(table.name) || 0);
    if (total === 0) orphans++;
    if (total > maxEdges) {
      maxEdges = total;
      mostConnectedTable = table.id;
    }
  }

  return { orphanTableCount: orphans, mostConnectedTable: maxEdges > 0 ? mostConnectedTable : null };
}

function refineEdgeTypes(tables: Map<string, TableNode> | TableNode[], edges: RelationshipEdge[]) {
  // If the foreign key column has a UNIQUE constraint/index, it's one-to-one
  for (const edge of edges) {
    const table = Array.isArray(tables) ? tables.find(t => t.name === edge.source) : tables.get(edge.source);
    if (!table) continue;
    
    // Check if the source column is unique
    const isUnique = table.indexes.some(idx => idx.unique && idx.columns.length === 1 && idx.columns[0] === edge.sourceColumn);
    if (isUnique) {
      edge.type = 'one-to-one';
    } else {
      edge.type = 'one-to-many';
    }
  }
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

  // Pass 1: CREATE TABLE
  for (const stmt of statements) {
    if (!stmt) continue;

    if (stmt.type === 'create' && stmt.keyword === 'table') {
      const rawTableName: string =
        typeof stmt.table === 'string'
          ? stmt.table
          : stmt.table?.[0]?.table ?? 'unknown';
      const tableName = stripQuotes(rawTableName);
      const tableId = generateTableId(tableName);

      const columns: Column[] = [];
      const tableIndexes: Index[] = [];
      const pkColumns = new Set<string>();
      const definitions: any[] = stmt.create_definitions ?? [];
      
      // Inline UNIQUE constraints
      for (const def of definitions) {
        if (def.resource === 'constraint' || def.constraint_type) {
          const ctype = (def.constraint_type ?? def.definition?.[0]?.constraint_type ?? '').toString().toUpperCase();

          if (ctype.includes('PRIMARY')) {
            const keyCols: any[] = def.definition ?? def.columns ?? [];
            for (const kc of keyCols) {
              let rawCol = kc;
              if (typeof kc !== 'string') {
                rawCol = kc.column?.expr?.value ?? kc.column?.expr?.column ?? kc.column ?? kc.expr?.column ?? '';
              }
              const colName = stripQuotes(String(rawCol));
              if (colName && colName !== '[object Object]') pkColumns.add(colName.toLowerCase());
            }
          }

          if (ctype.includes('FOREIGN') || ctype.includes('REFERENCES')) {
            const fkCols: any[] = def.definition ?? def.columns ?? [];
            const refTable = stripQuotes(def.reference_definition?.table?.[0]?.table ?? def.reference?.table ?? '');
            const refCols: any[] = def.reference_definition?.definition ?? def.reference?.columns ?? [];

            for (let i = 0; i < fkCols.length; i++) {
              let rawSrc = fkCols[i];
              if (typeof fkCols[i] !== 'string') {
                rawSrc = fkCols[i].column?.expr?.value ?? fkCols[i].column?.expr?.column ?? fkCols[i].column ?? fkCols[i].expr?.column ?? '';
              }
              const srcCol = stripQuotes(String(rawSrc));

              let rawTgt = refCols[i];
              if (refCols[i] != null && typeof refCols[i] !== 'string') {
                rawTgt = refCols[i].column?.expr?.value ?? refCols[i].column?.expr?.column ?? refCols[i].column ?? refCols[i].expr?.column ?? '';
              }
              const tgtCol = refCols[i] != null ? stripQuotes(String(rawTgt)) : srcCol;

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
          
          if (ctype.includes('UNIQUE')) {
            const uqCols: any[] = def.definition ?? def.columns ?? [];
            const cols = uqCols.map((kc: any) => {
              let rawCol = kc;
              if (typeof kc !== 'string') {
                rawCol = kc.column?.expr?.value ?? kc.column?.expr?.column ?? kc.column ?? kc.expr?.column ?? '';
              }
              return stripQuotes(String(rawCol));
            }).filter(c => c && c !== '[object Object]');
            tableIndexes.push({ name: def.constraint ?? `uq_${tableName}_${cols.join('_')}`, columns: cols, unique: true });
          }
        }
      }

      for (const def of definitions) {
        if (def.resource === 'constraint' || def.constraint_type) continue;

        const colName = stripQuotes(typeof def.column?.column === 'string' ? def.column.column : typeof def.column === 'string' ? def.column : String(def.column?.column?.expr?.value ?? def.column?.expr?.value ?? def.column?.column ?? def.column ?? ''));
        if (!colName) continue;

        const dataType = normaliseType(def.definition?.dataType ?? def.dataType ?? def.definition?.type ?? '');
        let nullable = true;
        let isPK = pkColumns.has(colName.toLowerCase());
        let defaultValue: string | undefined;
        let references: Column['references'] | undefined;

        const inlineConstraints: any[] = def.nullable ?? def.constraint ?? def.definition?.constraint ?? [];
        const constraintArr = Array.isArray(inlineConstraints) ? inlineConstraints : [inlineConstraints];

        if (def.primary_key === 'primary key') {
          isPK = true;
        }

        for (const c of constraintArr) {
          if (!c) continue;
          const cVal = typeof c === 'string' ? c.toUpperCase() : '';
          const cType = typeof c === 'object' ? (c.type ?? c.constraint_type ?? '').toString().toUpperCase() : cVal;

          if (cType.includes('NOT NULL') || cVal === 'NOT NULL') nullable = false;
          if (cType.includes('PRIMARY')) {
            isPK = true;
          }
          if (cType.includes('UNIQUE')) {
            tableIndexes.push({ name: `uq_${tableName}_${colName}`, columns: [colName], unique: true });
          }
        }

        if (def.nullable?.type === 'not null' || def.nullable === 'not null') nullable = false;
        if (isPK) nullable = false;
        if (def.default_val != null) {
          defaultValue = typeof def.default_val === 'object' ? JSON.stringify(def.default_val.value ?? def.default_val) : String(def.default_val);
        }

        if (def.reference_definition || def.references) {
          const ref = def.reference_definition ?? def.references;
          const refTable = stripQuotes(ref?.table?.[0]?.table ?? ref?.table ?? '');
          const refCol = stripQuotes(ref?.definition?.[0]?.column ?? ref?.columns?.[0]?.column ?? ref?.columns?.[0] ?? '');
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

        if (isPK) pkColumns.add(colName.toLowerCase());

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

      for (const col of columns) {
        if (pkColumns.has(col.name.toLowerCase())) {
          col.isPrimaryKey = true;
          col.nullable = false;
        }
      }

      tables.set(tableName, { id: tableId, name: tableName, columns, indexes: tableIndexes });
    }
  }

  // Pass 2: ALTER TABLE and CREATE INDEX
  for (const stmt of statements) {
    if (!stmt) continue;

    if (stmt.type === 'create' && (stmt.keyword === 'index' || stmt.keyword === 'unique index')) {
      const idxName = stripQuotes(stmt.index ?? stmt.name ?? 'unnamed_index');
      const idxTable = stripQuotes(stmt.table?.[0]?.table ?? stmt.table ?? '');
      const idxCols: string[] = (stmt.columns ?? stmt.definition ?? []).map(
        (c: any) => typeof c === 'string' ? stripQuotes(c) : stripQuotes(c.column ?? c.expr?.column ?? '')
      );
      const unique = stmt.index_type === 'unique' || (stmt.keyword ?? '').toString().toLowerCase().includes('unique');
      
      const tbl = tables.get(idxTable);
      if (tbl) tbl.indexes.push({ name: idxName, columns: idxCols, unique });
    }

    if (stmt.type === 'alter' && stmt.table) {
      const tableName = stripQuotes(typeof stmt.table === 'string' ? stmt.table : stmt.table[0]?.table);
      const exprs = Array.isArray(stmt.expr) ? stmt.expr : [stmt.expr];
      
      for (const expr of exprs) {
        if (!expr) continue;
        if (expr.action === 'add' && (expr.constraint_type === 'foreign key' || expr.constraint_type === 'FOREIGN KEY' || expr.resource === 'constraint' || expr.create_definitions?.constraint_type?.toUpperCase().includes('FOREIGN'))) {
          const fkDef = expr.create_definitions ?? expr;
          const fkCols = fkDef.definition ?? fkDef.columns ?? [];
          const refTable = stripQuotes(fkDef.reference_definition?.table?.[0]?.table ?? fkDef.reference?.table ?? '');
          const refCols = fkDef.reference_definition?.definition ?? fkDef.reference?.columns ?? [];

          for (let i = 0; i < fkCols.length; i++) {
            let rawSrc = fkCols[i];
            if (typeof fkCols[i] !== 'string') {
              rawSrc = fkCols[i].column?.expr?.value ?? fkCols[i].column?.expr?.column ?? fkCols[i].column ?? fkCols[i].expr?.column ?? '';
            }
            const srcCol = stripQuotes(String(rawSrc));

            let rawTgt = refCols[i];
            if (refCols[i] != null && typeof refCols[i] !== 'string') {
              rawTgt = refCols[i].column?.expr?.value ?? refCols[i].column?.expr?.column ?? refCols[i].column ?? refCols[i].expr?.column ?? '';
            }
            const tgtCol = refCols[i] != null ? stripQuotes(String(rawTgt)) : srcCol;

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
  }

  // Mark foreign key columns based on collected edges
  for (const edge of edges) {
    const tbl = tables.get(edge.source);
    if (tbl) {
      const col = tbl.columns.find((c) => c.name === edge.sourceColumn);
      if (col) {
        col.isForeignKey = true;
        if (!col.references) {
          col.references = { table: edge.target, column: edge.targetColumn };
        }
      }
    }
  }

  refineEdgeTypes(tables, edges);

  const tableArr = Array.from(tables.values());
  const totalColumns = tableArr.reduce((s, t) => s + t.columns.length, 0);
  const stats = computeMetadataStats(tableArr, edges);

  return {
    tables: tableArr,
    edges,
    metadata: {
      tableCount: tableArr.length,
      columnCount: totalColumns,
      relationshipCount: edges.length,
      parseTimeMs: 0,
      orphanTableCount: stats.orphanTableCount,
      mostConnectedTable: stats.mostConnectedTable,
    },
  };
}

// ---------------------------------------------------------------------------
// Regex-based fallback parser
// ---------------------------------------------------------------------------

function parseWithRegex(sql: string): SchemaGraph {
  const tables: TableNode[] = [];
  const edges: RelationshipEdge[] = [];

  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?(\w+)["`]?\s*\(([\s\S]*?)\)\s*;/gi;
  let tableMatch: RegExpExecArray | null;
  
  while ((tableMatch = tableRegex.exec(sql)) !== null) {
    const tableName = stripQuotes(tableMatch[1]);
    const tableId = generateTableId(tableName);
    const body = tableMatch[2];

    const columns: Column[] = [];
    const indexes: Index[] = [];
    const pkColumns = new Set<string>();

    const lines = splitConstraintAware(body);

    // Pass 1 - Table level constraints
    for (const line of lines) {
      const trimmed = line.trim();

      const pkMatch = trimmed.match(/PRIMARY\s+KEY\s*\(\s*([^)]+)\)/i);
      if (pkMatch && !trimmed.match(/^\w+\s+/)) {
        const cols = pkMatch[1].split(',').map((c) => stripQuotes(c.trim()));
        cols.forEach((c) => pkColumns.add(c.toLowerCase()));
      }

      const fkMatch = trimmed.match(/FOREIGN\s+KEY\s*\(\s*["`]?(\w+)["`]?\s*\)\s*REFERENCES\s+["`]?(\w+)["`]?\s*\(\s*["`]?(\w+)["`]?\s*\)/i);
      if (fkMatch) {
        edges.push({
          id: generateEdgeId(tableName, fkMatch[1], fkMatch[2], fkMatch[3]),
          source: tableName,
          target: fkMatch[2],
          sourceColumn: fkMatch[1],
          targetColumn: fkMatch[3],
          type: 'one-to-many',
        });
      }
      
      const uniqMatch = trimmed.match(/UNIQUE\s*(?:KEY\s*)?(?:["`]?\w+["`]?\s*)?\(\s*([^)]+)\)/i);
      if (uniqMatch && !trimmed.match(/^\w+\s+/)) {
        const cols = uniqMatch[1].split(',').map((c) => stripQuotes(c.trim()));
        indexes.push({ name: `uq_${tableName}_${cols.join('_')}`, columns: cols, unique: true });
      }
    }

    // Pass 2 - Columns
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/^(PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK|CONSTRAINT)\s/i.test(trimmed)) continue;

      const colMatch = trimmed.match(/^["`]?(\w+)["`]?\s+([\w]+(?:\s*\([^)]*\))?)\s*(.*)/i);
      if (!colMatch) continue;

      const colName = colMatch[1];
      const colType = normaliseType(colMatch[2]);
      const rest = colMatch[3] ?? '';

      const isPK = pkColumns.has(colName.toLowerCase()) || /PRIMARY\s+KEY/i.test(rest);
      const notNull = /NOT\s+NULL/i.test(rest) || isPK;
      const nullable = !notNull;

      let defaultValue: string | undefined;
      const defMatch = rest.match(/DEFAULT\s+(\S+)/i);
      if (defMatch) defaultValue = defMatch[1];

      if (/UNIQUE/i.test(rest)) {
        indexes.push({ name: `uq_${tableName}_${colName}`, columns: [colName], unique: true });
      }

      let references: Column['references'] | undefined;
      const refMatch = rest.match(/REFERENCES\s+["`]?(\w+)["`]?\s*\(\s*["`]?(\w+)["`]?\s*\)/i);
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

    for (const col of columns) {
      if (pkColumns.has(col.name.toLowerCase())) {
        col.isPrimaryKey = true;
        col.nullable = false;
      }
    }

    tables.push({ id: tableId, name: tableName, columns, indexes });
  }

  // CREATE INDEX
  const indexRegex = /CREATE\s+(UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?(\w+)["`]?\s+ON\s+["`]?(\w+)["`]?\s*\(\s*([^)]+)\)/gi;
  let idxMatch: RegExpExecArray | null;
  while ((idxMatch = indexRegex.exec(sql)) !== null) {
    const unique = !!idxMatch[1];
    const idxName = idxMatch[2];
    const idxTable = idxMatch[3];
    const cols = idxMatch[4].split(',').map((c) => stripQuotes(c.trim()));

    const tbl = tables.find((t) => t.name === idxTable);
    if (tbl) tbl.indexes.push({ name: idxName, columns: cols, unique });
  }

  // ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY
  const alterRegex = /ALTER\s+TABLE\s+["`]?(\w+)["`]?\s+ADD\s+(?:CONSTRAINT\s+["`]?\w+["`]?\s+)?FOREIGN\s+KEY\s*\(\s*["`]?(\w+)["`]?\s*\)\s*REFERENCES\s+["`]?(\w+)["`]?\s*\(\s*["`]?(\w+)["`]?\s*\)/gi;
  let alterMatch: RegExpExecArray | null;
  while ((alterMatch = alterRegex.exec(sql)) !== null) {
    const tableName = stripQuotes(alterMatch[1]);
    const fkCol = stripQuotes(alterMatch[2]);
    const refTable = stripQuotes(alterMatch[3]);
    const refCol = stripQuotes(alterMatch[4]);
    
    edges.push({
      id: generateEdgeId(tableName, fkCol, refTable, refCol),
      source: tableName,
      target: refTable,
      sourceColumn: fkCol,
      targetColumn: refCol,
      type: 'one-to-many',
    });
  }

  // Final FK marking
  for (const edge of edges) {
    const tbl = tables.find(t => t.name === edge.source);
    if (tbl) {
      const col = tbl.columns.find((c) => c.name === edge.sourceColumn);
      if (col && !col.isForeignKey) {
        col.isForeignKey = true;
        col.references = { table: edge.target, column: edge.targetColumn };
      }
    }
  }

  refineEdgeTypes(tables, edges);

  const totalColumns = tables.reduce((s, t) => s + t.columns.length, 0);
  const stats = computeMetadataStats(tables, edges);

  return {
    tables,
    edges,
    metadata: {
      tableCount: tables.length,
      columnCount: totalColumns,
      relationshipCount: edges.length,
      parseTimeMs: 0,
      orphanTableCount: stats.orphanTableCount,
      mostConnectedTable: stats.mostConnectedTable,
    },
  };
}

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

  let graph: SchemaGraph | null = null;
  let astError: Error | null = null;

  try {
    graph = parseWithAst(sqlContent);
  } catch (err) {
    astError = err as Error;
  }

  // If the AST parser failed completely, OR if it succeeded but found 0 tables, trigger fallback
  if (!graph || graph.tables.length === 0) {
    try {
      const regexGraph = parseWithRegex(sqlContent);
      if (regexGraph.tables.length > 0) {
        graph = regexGraph; // Fallback successfully found tables
      } else if (!graph) {
        // Both failed and AST threw an error initially
        throw astError;
      }
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

  if (!graph || graph.tables.length === 0) {
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
