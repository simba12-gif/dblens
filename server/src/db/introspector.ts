import { Client } from 'pg';
import { SchemaGraph, TableNode, Column, RelationshipEdge, ParseError } from '../types/schema';

function normaliseType(udtName: string, dataType: string): string {
  const typeStr = (udtName || dataType || '').toLowerCase();
  
  if (typeStr.includes('character varying') || typeStr === 'varchar') return 'VARCHAR';
  if (typeStr === 'character' || typeStr === 'bpchar' || typeStr === 'char') return 'CHAR';
  if (typeStr === 'integer' || typeStr === 'int4') return 'INT';
  if (typeStr === 'bigint' || typeStr === 'int8') return 'BIGINT';
  if (typeStr === 'boolean' || typeStr === 'bool') return 'BOOLEAN';
  if (typeStr === 'timestamp without time zone' || typeStr === 'timestamp') return 'TIMESTAMP';
  if (typeStr === 'timestamp with time zone' || typeStr === 'timestamptz') return 'TIMESTAMPTZ';
  if (typeStr === 'double precision' || typeStr === 'float8') return 'FLOAT';
  if (typeStr === 'text') return 'TEXT';
  if (typeStr === 'uuid') return 'UUID';
  if (typeStr === 'jsonb') return 'JSONB';
  if (typeStr === 'json') return 'JSON';
  if (typeStr === 'numeric' || typeStr === 'decimal') return 'NUMERIC';
  if (typeStr === 'date') return 'DATE';
  
  return udtName ? udtName.toUpperCase() : dataType.toUpperCase();
}

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

export async function introspectDatabase(connectionString: string): Promise<SchemaGraph> {
  const start = performance.now();
  
  if (!connectionString.startsWith('postgresql://') && !connectionString.startsWith('postgres://')) {
    const err: ParseError = {
      message: "Invalid connection string format",
      suggestion: "Format: postgresql://user:password@host:port/database"
    };
    throw err;
  }
  
  const cleanConnectionString = connectionString.split('?')[0];

  const safeLog = cleanConnectionString.replace(/:\/\/[^@]+@/, '://***:***@');
  console.log(`[DBLens] Connecting to: ${safeLog}`);

  const client = new Client({
    connectionString: cleanConnectionString,
    connectionTimeoutMillis: 10000,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    await client.query("SET statement_timeout = '8000'");
    await client.query("SET TRANSACTION READ ONLY");

    const tableRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tablesMap = new Map<string, TableNode>();
    for (const row of tableRes.rows) {
      const name = row.table_name;
      tablesMap.set(name, {
        id: generateTableId(name),
        name,
        columns: [],
        indexes: []
      });
    }

    const colRes = await client.query(`
      SELECT
        c.table_name,
        c.column_name,
        c.data_type,
        c.udt_name,
        c.is_nullable,
        c.column_default,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END AS is_primary_key
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.table_name, ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku
          ON tc.constraint_name = ku.constraint_name
          AND tc.table_schema = ku.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = 'public'
      ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
      WHERE c.table_schema = 'public'
      ORDER BY c.table_name, c.ordinal_position;
    `);

    for (const row of colRes.rows) {
      const tbl = tablesMap.get(row.table_name);
      if (tbl) {
        tbl.columns.push({
          name: row.column_name,
          type: normaliseType(row.udt_name, row.data_type),
          nullable: row.is_nullable === 'YES',
          isPrimaryKey: row.is_primary_key,
          isForeignKey: false,
          defaultValue: row.column_default || undefined,
        });
      }
    }

    const fkRes = await client.query(`
      SELECT
        tc.table_name AS source_table,
        kcu.column_name AS source_column,
        ccu.table_name AS target_table,
        ccu.column_name AS target_column,
        tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
        AND tc.table_schema = ccu.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name;
    `);

    const edges: RelationshipEdge[] = [];
    for (const row of fkRes.rows) {
      if (tablesMap.has(row.source_table) && tablesMap.has(row.target_table)) {
        edges.push({
          id: generateEdgeId(row.source_table, row.source_column, row.target_table, row.target_column),
          source: row.source_table,
          target: row.target_table,
          sourceColumn: row.source_column,
          targetColumn: row.target_column,
          type: 'one-to-many'
        });
      }
    }

    const idxRes = await client.query(`
      SELECT
        t.relname AS table_name,
        i.relname AS index_name,
        ix.indisunique AS is_unique,
        array_agg(a.attname ORDER BY k.ordering) AS columns
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS k(attnum, ordering) ON TRUE
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relkind = 'r'
      GROUP BY t.relname, i.relname, ix.indisunique
      ORDER BY t.relname, i.relname;
    `);

    for (const row of idxRes.rows) {
      const tbl = tablesMap.get(row.table_name);
      if (tbl) {
        tbl.indexes.push({
          name: row.index_name,
          unique: row.is_unique,
          columns: row.columns
        });
      }
    }

    for (const edge of edges) {
      const tbl = tablesMap.get(edge.source);
      if (tbl) {
        const col = tbl.columns.find(c => c.name === edge.sourceColumn);
        if (col) {
          col.isForeignKey = true;
          col.references = { table: edge.target, column: edge.targetColumn };
        }
        
        const isUnique = tbl.indexes.some(idx => 
          idx.unique && idx.columns.length === 1 && idx.columns[0] === edge.sourceColumn
        );
        if (isUnique) {
          edge.type = 'one-to-one';
        }
      }
    }

    const tables = Array.from(tablesMap.values());
    const totalColumns = tables.reduce((acc, t) => acc + t.columns.length, 0);

    const incoming = new Map<string, number>();
    const outgoing = new Map<string, number>();
    for (const t of tables) {
      incoming.set(t.name, 0);
      outgoing.set(t.name, 0);
    }
    for (const e of edges) {
      if (outgoing.has(e.source)) outgoing.set(e.source, outgoing.get(e.source)! + 1);
      if (incoming.has(e.target)) incoming.set(e.target, incoming.get(e.target)! + 1);
    }

    let orphans = 0;
    let maxEdges = -1;
    let mostConnected: string | null = null;
    for (const t of tables) {
      const total = (incoming.get(t.name) || 0) + (outgoing.get(t.name) || 0);
      if (total === 0) orphans++;
      if (total > maxEdges) {
        maxEdges = total;
        mostConnected = t.id;
      }
    }

    const parseTimeMs = Math.round((performance.now() - start) * 100) / 100;

    const graph: SchemaGraph = {
      tables,
      edges,
      metadata: {
        tableCount: tables.length,
        columnCount: totalColumns,
        relationshipCount: edges.length,
        parseTimeMs,
        orphanTableCount: orphans,
        mostConnectedTable: maxEdges > 0 ? mostConnected : null
      }
    };
    
    return graph;

  } catch (err: any) {
    if ((err as ParseError).message === "Invalid connection string format") {
      throw err;
    }
    const message = err.message || "Failed to introspect database";
    const parseError: ParseError = {
      message,
      suggestion: "Check your connection string and ensure the database is reachable."
    };
    throw parseError;
  } finally {
    try { await client.end(); } catch (e) {}
  }
}
