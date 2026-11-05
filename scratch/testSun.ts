import { parseSqlSchema } from '../client/app/lib/schemaParser';

const schema = `
CREATE TABLE users (id INT PRIMARY KEY);
CREATE TABLE orders (id INT PRIMARY KEY, user_id INT, FOREIGN KEY (user_id) REFERENCES users(id));
`;

const data = parseSqlSchema(schema);

const connectionCount = new Map<string, number>();
data.tables.forEach(t => connectionCount.set(t.name, 0));

data.edges.forEach(e => {
  connectionCount.set(e.source, (connectionCount.get(e.source) || 0) + 1);
  connectionCount.set(e.target, (connectionCount.get(e.target) || 0) + 1);
});

console.log('[SunSelection] connection counts:', Object.fromEntries(connectionCount));
console.log('[SunSelection] sample edge:', data.edges[0]);

const maxConnections = Math.max(...connectionCount.values());
const candidates = data.tables.filter(
  t => connectionCount.get(t.name) === maxConnections
);

console.log('[SunSelection] maxConnections:', maxConnections, 'candidates:', candidates.map(c => c.name));
