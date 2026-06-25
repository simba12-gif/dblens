import {
  Column,
  TableNode,
  RelationshipEdge,
  SchemaGraph,
  ParseError,
} from '../types/schema';

// ---------------------------------------------------------------------------
// Input shape validation helpers
// ---------------------------------------------------------------------------

interface RawColumn {
  name?: unknown;
  type?: unknown;
  nullable?: unknown;
  primaryKey?: unknown;
  primary_key?: unknown;
  foreignKey?: unknown;
  foreign_key?: unknown;
  default?: unknown;
  defaultValue?: unknown;
  references?: unknown;
}

interface RawTable {
  name?: unknown;
  columns?: unknown;
  indexes?: unknown;
}

interface RawRelationship {
  from?: unknown;
  to?: unknown;
  type?: unknown;
}

interface RawSchema {
  tables?: unknown;
  relationships?: unknown;
}

function assertString(value: unknown, fieldPath: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw makeError(
      `"${fieldPath}" must be a non-empty string, got ${typeof value}.`,
      `Check the value at "${fieldPath}" in your JSON.`,
    );
  }
  return value.trim();
}

function makeError(message: string, suggestion?: string): ParseError {
  return { message, suggestion };
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

export function parseJsonSchema(jsonContent: string): SchemaGraph {
  const start = performance.now();

  if (!jsonContent || !jsonContent.trim()) {
    throw makeError(
      'JSON input is empty.',
      'Provide a JSON object with a "tables" array.',
    );
  }

  let raw: RawSchema;
  try {
    raw = JSON.parse(jsonContent);
  } catch (err) {
    throw makeError(
      `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
      'Make sure the input is valid JSON. Check for trailing commas or unquoted keys.',
    );
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw makeError(
      'JSON root must be an object with a "tables" array.',
      'Expected format: { "tables": [...], "relationships": [...] }',
    );
  }

  // --- Tables -----------------------------------------------------------

  if (!Array.isArray(raw.tables)) {
    throw makeError(
      '"tables" must be an array.',
      'Provide "tables" as an array of table objects, each with "name" and "columns".',
    );
  }

  if (raw.tables.length === 0) {
    throw makeError(
      '"tables" array is empty.',
      'Add at least one table object: { "name": "users", "columns": [...] }',
    );
  }

  const tables: TableNode[] = [];
  const tableNames = new Set<string>();

  for (let ti = 0; ti < (raw.tables as RawTable[]).length; ti++) {
    const rawTable = (raw.tables as RawTable[])[ti];
    const pathPrefix = `tables[${ti}]`;

    if (typeof rawTable !== 'object' || rawTable === null || Array.isArray(rawTable)) {
      throw makeError(
        `${pathPrefix} must be an object.`,
        'Each table needs at least "name" and "columns" properties.',
      );
    }

    const tableName = assertString(rawTable.name, `${pathPrefix}.name`);

    if (tableNames.has(tableName.toLowerCase())) {
      throw makeError(
        `Duplicate table name "${tableName}".`,
        'Each table must have a unique name.',
      );
    }
    tableNames.add(tableName.toLowerCase());

    if (!Array.isArray(rawTable.columns)) {
      throw makeError(
        `${pathPrefix}.columns must be an array.`,
        `Provide columns for table "${tableName}".`,
      );
    }

    if ((rawTable.columns as RawColumn[]).length === 0) {
      throw makeError(
        `${pathPrefix}.columns is empty.`,
        `Table "${tableName}" must have at least one column.`,
      );
    }

    const columns: Column[] = [];
    const colNames = new Set<string>();

    for (let ci = 0; ci < (rawTable.columns as RawColumn[]).length; ci++) {
      const rawCol = (rawTable.columns as RawColumn[])[ci];
      const colPath = `${pathPrefix}.columns[${ci}]`;

      if (typeof rawCol !== 'object' || rawCol === null || Array.isArray(rawCol)) {
        throw makeError(
          `${colPath} must be an object.`,
          'Each column needs "name" and "type".',
        );
      }

      const colName = assertString(rawCol.name, `${colPath}.name`);
      const colType = assertString(rawCol.type, `${colPath}.type`);

      if (colNames.has(colName.toLowerCase())) {
        throw makeError(
          `Duplicate column "${colName}" in table "${tableName}".`,
          'Column names must be unique within a table.',
        );
      }
      colNames.add(colName.toLowerCase());

      const isPrimaryKey = rawCol.primaryKey === true || rawCol.primary_key === true;
      const nullable =
        rawCol.nullable === false || isPrimaryKey ? false : true;
      const isForeignKey = rawCol.foreignKey === true || rawCol.foreign_key === true;

      let defaultValue: string | undefined;
      const defVal = rawCol.default ?? rawCol.defaultValue;
      if (defVal !== undefined && defVal !== null) {
        defaultValue = String(defVal);
      }

      let references: Column['references'] | undefined;
      if (rawCol.references && typeof rawCol.references === 'object') {
        const refObj = rawCol.references as { table?: unknown; column?: unknown };
        if (refObj.table && refObj.column) {
          references = {
            table: String(refObj.table),
            column: String(refObj.column),
          };
        }
      }

      columns.push({
        name: colName,
        type: colType.toUpperCase(),
        nullable,
        isPrimaryKey,
        isForeignKey: isForeignKey || !!references,
        defaultValue,
        references,
      });
    }

    // Indexes (optional)
    const indexes: TableNode['indexes'] = [];
    if (Array.isArray(rawTable.indexes)) {
      for (const rawIdx of rawTable.indexes as any[]) {
        if (
          typeof rawIdx === 'object' &&
          rawIdx !== null &&
          typeof rawIdx.name === 'string' &&
          Array.isArray(rawIdx.columns)
        ) {
          indexes.push({
            name: rawIdx.name,
            columns: rawIdx.columns.map(String),
            unique: rawIdx.unique === true,
          });
        }
      }
    }

    const tableId = `table_${tableName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
    tables.push({ id: tableId, name: tableName, columns, indexes });
  }

  // --- Relationships ----------------------------------------------------

  const edges: RelationshipEdge[] = [];

  if (raw.relationships !== undefined) {
    if (!Array.isArray(raw.relationships)) {
      throw makeError(
        '"relationships" must be an array.',
        'Provide relationships as: [{ "from": "orders.user_id", "to": "users.id" }]',
      );
    }

    for (let ri = 0; ri < (raw.relationships as RawRelationship[]).length; ri++) {
      const rel = (raw.relationships as RawRelationship[])[ri];
      const relPath = `relationships[${ri}]`;

      const fromStr = assertString(rel.from, `${relPath}.from`);
      const toStr = assertString(rel.to, `${relPath}.to`);

      const fromParts = fromStr.split('.');
      const toParts = toStr.split('.');

      if (fromParts.length !== 2) {
        throw makeError(
          `${relPath}.from must be in "table.column" format, got "${fromStr}".`,
          'Example: "orders.user_id"',
        );
      }
      if (toParts.length !== 2) {
        throw makeError(
          `${relPath}.to must be in "table.column" format, got "${toStr}".`,
          'Example: "users.id"',
        );
      }

      const [sourceTable, sourceColumn] = fromParts;
      const [targetTable, targetColumn] = toParts;

      // Determine relationship type
      let relType: RelationshipEdge['type'] = 'one-to-many';
      if (typeof rel.type === 'string') {
        const normalised = rel.type.toLowerCase().replace(/\s+/g, '-');
        if (
          normalised === 'one-to-one' ||
          normalised === 'one-to-many' ||
          normalised === 'many-to-one' ||
          normalised === 'many-to-many'
        ) {
          // Normalise many-to-one → swap and make one-to-many
          if (normalised === 'many-to-one') {
            relType = 'one-to-many';
          } else {
            relType = normalised as RelationshipEdge['type'];
          }
        }
      }

      const edgeId =
        `edge_${sourceTable}_${sourceColumn}_to_${targetTable}_${targetColumn}`.toLowerCase();

      edges.push({
        id: edgeId,
        source: sourceTable,
        target: targetTable,
        sourceColumn,
        targetColumn,
        type: relType,
      });

      // Mark FK column on the source table
      const srcTbl = tables.find(
        (t) => t.name.toLowerCase() === sourceTable.toLowerCase(),
      );
      if (srcTbl) {
        const srcCol = srcTbl.columns.find(
          (c) => c.name.toLowerCase() === sourceColumn.toLowerCase(),
        );
        if (srcCol) {
          srcCol.isForeignKey = true;
          if (!srcCol.references) {
            srcCol.references = { table: targetTable, column: targetColumn };
          }
        }
      }
    }
  }

  const totalColumns = tables.reduce((s, t) => s + t.columns.length, 0);
  const elapsed = performance.now() - start;

  return {
    tables,
    edges,
    metadata: {
      tableCount: tables.length,
      columnCount: totalColumns,
      relationshipCount: edges.length,
      parseTimeMs: Math.round(elapsed * 100) / 100,
    },
  };
}
