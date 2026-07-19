import { GoogleGenerativeAI } from '@google/generative-ai';
import { SchemaGraph } from '../types/schema';

const SYSTEM_PROMPT = `You are DBLens AI, an expert database assistant built into DBLens — a database schema visualization tool. You help developers understand, analyze, and improve their database schemas.

You are given the full schema context as a JSON object. Use it to give accurate, specific answers about THIS schema — not generic database advice.

Guidelines:
- Be concise but thorough. Bullet points for lists, prose for explanations.
- Always reference actual table names and column names from the schema when relevant.
- When suggesting SQL, use PostgreSQL syntax.
- If asked to explain a relationship, describe it in plain English first, then technical terms.
- If asked for optimization suggestions, reference the specific tables/columns that need work.
- Never make up tables or columns that don't exist in the schema.
- Keep responses focused — don't pad with unnecessary caveats.`;

function buildSchemaContext(graph: SchemaGraph): string {
  const tablesSummary = graph.tables.map(t => ({
    name: t.name,
    columns: t.columns.map(c => ({
      name: c.name,
      type: c.type,
      isPrimaryKey: c.isPrimaryKey,
      isForeignKey: c.isForeignKey,
      nullable: c.nullable,
      references: c.references,
    })),
    indexes: t.indexes,
    columnCount: t.columns.length,
  }));

  const edgesSummary = graph.edges.map(e => ({
    from: `${e.source}.${e.sourceColumn}`,
    to: `${e.target}.${e.targetColumn}`,
    type: e.type,
  }));

  return JSON.stringify({
    summary: {
      tableCount: graph.metadata.tableCount,
      columnCount: graph.metadata.columnCount,
      relationshipCount: graph.metadata.relationshipCount,
      mostConnectedTable: graph.metadata.mostConnectedTable,
      orphanTableCount: graph.metadata.orphanTableCount,
    },
    tables: tablesSummary,
    relationships: edgesSummary,
  }, null, 2);
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function askAssistant(
  graph: SchemaGraph,
  messages: ChatMessage[],
  userMessage: string,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: `${SYSTEM_PROMPT}\n\nCurrent Schema:\n${buildSchemaContext(graph)}`,
  });

  // Build conversation history for multi-turn chat
  const history = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(userMessage);
  return result.response.text();
}
