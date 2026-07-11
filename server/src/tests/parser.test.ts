import { parseSql } from '../parsers/sqlParser';
import { parseJsonSchema } from '../parsers/jsonParser';
import { generateInsights } from '../analyzers/insights';

const sqlInput = `
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100)
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  body TEXT
);

ALTER TABLE posts ADD CONSTRAINT fk_posts_user FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE comments ADD CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES posts(id);
ALTER TABLE comments ADD CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id);
`;

const jsonInput = JSON.stringify({
  tables: [
    {
      name: 'users',
      columns: [
        { name: 'id', type: 'SERIAL', primaryKey: true },
        { name: 'email', type: 'VARCHAR(255)', nullable: false },
        { name: 'name', type: 'VARCHAR(100)' }
      ],
      indexes: [
        { name: 'uq_email', columns: ['email'], unique: true }
      ]
    },
    {
      name: 'posts',
      columns: [
        { name: 'id', type: 'SERIAL', primaryKey: true },
        { name: 'user_id', type: 'INT', nullable: false },
        { name: 'title', type: 'VARCHAR(255)', nullable: false }
      ]
    },
    {
      name: 'comments',
      columns: [
        { name: 'id', type: 'SERIAL', primaryKey: true },
        { name: 'post_id', type: 'INT', nullable: false },
        { name: 'user_id', type: 'INT', nullable: false },
        { name: 'body', type: 'TEXT' }
      ]
    }
  ],
  relationships: [
    { from: 'posts.user_id', to: 'users.id' },
    { from: 'comments.post_id', to: 'posts.id' },
    { from: 'comments.user_id', to: 'users.id' }
  ]
});

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err);
    process.exit(1);
  }
}

console.log('Running Parser & Analyzer Tests...\n');

let sqlGraph: ReturnType<typeof parseSql>;

runTest('SQL Parser: parses 3 tables and 3 edges', () => {
  sqlGraph = parseSql(sqlInput);
  
  if (sqlGraph.tables.length !== 3) throw new Error(`Expected 3 tables, got ${sqlGraph.tables.length}`);
  if (sqlGraph.edges.length !== 3) throw new Error(`Expected 3 edges, got ${sqlGraph.edges.length}`);
  if (sqlGraph.metadata.orphanTableCount !== 0) throw new Error(`Expected 0 orphans, got ${sqlGraph.metadata.orphanTableCount}`);
  if (sqlGraph.metadata.mostConnectedTable !== 'table_users') throw new Error(`Expected table_users as most connected, got ${sqlGraph.metadata.mostConnectedTable}`);
});

runTest('JSON Parser: parses equivalent schema correctly', () => {
  const jsonGraph = parseJsonSchema(jsonInput);
  
  if (jsonGraph.tables.length !== 3) throw new Error(`Expected 3 tables, got ${jsonGraph.tables.length}`);
  if (jsonGraph.edges.length !== 3) throw new Error(`Expected 3 edges, got ${jsonGraph.edges.length}`);
  if (jsonGraph.metadata.mostConnectedTable !== 'table_users') throw new Error(`Expected table_users as most connected, got ${jsonGraph.metadata.mostConnectedTable}`);
});

runTest('Insights Analyzer: generates correct centrality and hints', () => {
  const insights = generateInsights(sqlGraph);
  
  if (insights.summary.tableCount !== 3) throw new Error('Summary table count mismatch');
  if (insights.summary.relationshipCount !== 3) throw new Error('Summary relationship count mismatch');
  
  const usersCentrality = insights.centrality.find(c => c.tableName === 'users');
  if (!usersCentrality) throw new Error('Users table missing in centrality');
  
  // posts -> users, comments -> users (2 incoming edges for users)
  if (usersCentrality.incomingEdges !== 2) throw new Error(`Users should have 2 incoming edges, got ${usersCentrality.incomingEdges}`);
  if (usersCentrality.totalEdges !== 2) throw new Error(`Users should have 2 total edges, got ${usersCentrality.totalEdges}`);

  // Missing index optimization hints check
  // user_id in posts is FK without index
  const missingIndexHints = insights.optimizationHints.filter(h => h.type === 'missing-index');
  if (missingIndexHints.length === 0) throw new Error('Expected missing-index hints for unindexed FKs');
});

console.log('\nAll tests passed successfully!');
