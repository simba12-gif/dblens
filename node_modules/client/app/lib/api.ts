const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export interface SchemaGraph {
  tables: {
    id: string;
    name: string;
    columns: {
      name: string;
      type: string;
      nullable: boolean;
      isPrimaryKey: boolean;
      isForeignKey: boolean;
      defaultValue?: string;
      references?: { table: string; column: string };
    }[];
    indexes: {
      name: string;
      columns: string[];
      unique: boolean;
    }[];
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    sourceColumn: string;
    targetColumn: string;
    type: "one-to-one" | "one-to-many" | "many-to-many";
  }[];
  metadata: {
    tableCount: number;
    columnCount: number;
    relationshipCount: number;
    parseTimeMs: number;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    line?: number;
    suggestion?: string;
  };
}

/**
 * Parse a SQL string and get the schema graph.
 */
export async function parseSqlContent(
  sql: string
): Promise<ApiResponse<SchemaGraph>> {
  const res = await fetch(`${API_BASE}/schema/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: sql, type: "sql" }),
  });
  return res.json();
}

/**
 * Parse a JSON schema string and get the schema graph.
 */
export async function parseJsonContent(
  json: string
): Promise<ApiResponse<SchemaGraph>> {
  const res = await fetch(`${API_BASE}/schema/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: json, type: "json" }),
  });
  return res.json();
}

/**
 * Upload a schema file (.sql, .ddl, or .json) and get the schema graph.
 */
export async function uploadSchemaFile(
  file: File
): Promise<ApiResponse<SchemaGraph>> {
  const formData = new FormData();
  formData.append("schema", file);
  const res = await fetch(`${API_BASE}/schema/parse`, {
    method: "POST",
    body: formData,
  });
  return res.json();
}

/**
 * Health check the server.
 */
export async function checkHealth(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}
