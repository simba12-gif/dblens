import { SchemaGraph, InsightsReport } from '../types/schema';

export function generateInsights(graph: SchemaGraph): InsightsReport {
  const { tables, edges } = graph;

  const tableCount = tables.length;
  let columnCount = 0;
  
  // Track incoming/outgoing edges per table
  const incomingMap = new Map<string, number>();
  const outgoingMap = new Map<string, number>();
  
  for (const table of tables) {
    columnCount += table.columns.length;
    incomingMap.set(table.name, 0);
    outgoingMap.set(table.name, 0);
  }

  for (const edge of edges) {
    if (outgoingMap.has(edge.source)) {
      outgoingMap.set(edge.source, outgoingMap.get(edge.source)! + 1);
    }
    if (incomingMap.has(edge.target)) {
      incomingMap.set(edge.target, incomingMap.get(edge.target)! + 1);
    }
  }

  const centrality = tables.map(table => {
    const incomingEdges = incomingMap.get(table.name) || 0;
    const outgoingEdges = outgoingMap.get(table.name) || 0;
    const totalEdges = incomingEdges + outgoingEdges;
    return {
      tableId: table.id,
      tableName: table.name,
      incomingEdges,
      outgoingEdges,
      totalEdges,
    };
  }).sort((a, b) => b.totalEdges - a.totalEdges);

  const orphans = centrality
    .filter(c => c.totalEdges === 0)
    .map(c => ({ tableId: c.tableId, tableName: c.tableName }));

  // Type Distribution
  const typeCounts = new Map<string, number>();
  for (const table of tables) {
    for (const column of table.columns) {
      // Normalize type loosely (e.g. VARCHAR(255) -> VARCHAR)
      const baseType = column.type.split('(')[0].trim().toUpperCase();
      typeCounts.set(baseType, (typeCounts.get(baseType) || 0) + 1);
    }
  }
  
  const typeDistribution = Array.from(typeCounts.entries())
    .map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / (columnCount || 1)) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count);

  // Optimization Hints
  const optimizationHints: InsightsReport['optimizationHints'] = [];
  
  for (const table of tables) {
    if (table.columns.length > 20) {
      optimizationHints.push({
        type: 'wide-table',
        tableId: table.id,
        tableName: table.name,
        message: `Table ${table.name} has ${table.columns.length} columns. Consider normalizing it into smaller tables.`,
      });
    }

    const hasPrimaryKey = table.columns.some(c => c.isPrimaryKey);
    if (!hasPrimaryKey) {
      optimizationHints.push({
        type: 'no-primary-key',
        tableId: table.id,
        tableName: table.name,
        message: `Table ${table.name} has no primary key defined.`,
      });
    }

    for (const column of table.columns) {
      if (column.isForeignKey) {
        if (column.nullable) {
          optimizationHints.push({
            type: 'nullable-fk',
            tableId: table.id,
            tableName: table.name,
            message: `Foreign key column ${column.name} in ${table.name} is nullable.`,
          });
        }
        
        // Check if there is an index that covers this FK (i.e. starts with this column)
        const isIndexed = table.indexes.some(idx => idx.columns.length > 0 && idx.columns[0] === column.name);
        
        if (column.isForeignKey && !column.isPrimaryKey && !isIndexed) {
          optimizationHints.push({
            type: 'missing-index',
            tableId: table.id,
            tableName: table.name,
            message: `Foreign key column ${column.name} in ${table.name} is missing an index.`,
          });
        }
      }
    }
  }

  return {
    summary: {
      tableCount,
      columnCount,
      relationshipCount: edges.length,
      orphanTableCount: orphans.length,
    },
    centrality,
    orphans,
    typeDistribution,
    optimizationHints,
  };
}
