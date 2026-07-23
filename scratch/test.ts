import { extractOnColumns } from '../client/app/lib/queryParser';

function simulate() {
  const stepIndex = 1;
  const step = { table: 'orders', onClause: 'orders.user_id = users.id' };
  const parsed = { steps: [{ table: 'users' }, { table: 'orders' }] };
  
  const activeTableName = step.table.toLowerCase();
  const visitedTableNames = new Set(
    parsed.steps.slice(0, stepIndex + 1).map(s => s.table.toLowerCase())
  );
  
  const activeColumns: { tableName: string; columnName: string }[] = [];
  if (step.onClause) {
    const parsedColumns = extractOnColumns(step.onClause);
    if (parsedColumns) {
      if (parsedColumns.leftTable) {
        activeColumns.push({ tableName: parsedColumns.leftTable.toLowerCase(), columnName: parsedColumns.leftCol.toLowerCase() });
      } else {
        activeColumns.push({ tableName: step.table.toLowerCase(), columnName: parsedColumns.leftCol.toLowerCase() });
      }
      if (parsedColumns.rightTable) {
        activeColumns.push({ tableName: parsedColumns.rightTable.toLowerCase(), columnName: parsedColumns.rightCol.toLowerCase() });
      } else {
        const prevTable = parsed.steps[stepIndex - 1]?.table?.toLowerCase();
        if (prevTable) activeColumns.push({ tableName: prevTable, columnName: parsedColumns.rightCol.toLowerCase() });
      }
    }
  }
  
  console.log('[QueryViz] Step:', stepIndex, step.table);
  console.log('[QueryViz] onClause:', step.onClause);
  console.log('[QueryViz] activeColumns:', activeColumns);
  console.log('[QueryViz] queryHighlight set:', { activeTableName, visitedTableNames: [...visitedTableNames], activeColumns });
  
  const tables = ['users', 'orders', 'order_items'];
  for (const tableName of tables) {
    const highlightedColumns = activeColumns
      .filter(c => c.tableName === tableName)
      .map(c => c.columnName);
    console.log('[TableNode]', tableName, 'highlightedColumns:', highlightedColumns);
  }
}

simulate();
