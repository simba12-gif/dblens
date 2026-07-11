const { Parser } = require('node-sql-parser');
const parser = new Parser();
const sql = `CREATE TABLE users ( id SERIAL PRIMARY KEY );`;
console.log(JSON.stringify(parser.astify(sql, { database: 'mysql' }), null, 2));
