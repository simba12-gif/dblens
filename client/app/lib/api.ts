import { SchemaGraph, InsightsReport } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001/api";

export interface ApiResponse<T> {
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
 * Generate insights for a parsed schema graph.
 */
export async function fetchInsights(
  graph: SchemaGraph
): Promise<ApiResponse<InsightsReport>> {
  const res = await fetch(`${API_BASE}/schema/insights`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(graph),
  });
  return res.json();
}

/**
 * Connect to a live PostgreSQL database and get the schema graph.
 */
export async function connectDatabase(
  connectionString: string
): Promise<ApiResponse<SchemaGraph>> {
  const res = await fetch(`${API_BASE}/db/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ connectionString }),
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

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function askAI(
  graph: SchemaGraph,
  messages: ChatMessage[],
  message: string,
): Promise<ApiResponse<{ reply: string }>> {
  const res = await fetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ graph, messages, message }),
  });
  return res.json();
}

export async function shareSchema(
  graph: SchemaGraph
): Promise<ApiResponse<{ id: string; shareUrl: string }>> {
  const res = await fetch(`${API_BASE}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ graph }),
  });
  return res.json();
}

export async function fetchSharedSchema(
  id: string
): Promise<ApiResponse<{ graph: SchemaGraph; createdAt: string; expiresAt: string; viewCount: number }>> {
  const res = await fetch(`${API_BASE}/share/${id}`);
  return res.json();
}
