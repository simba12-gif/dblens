export interface Column {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  defaultValue?: string;
  references?: {
    table: string;
    column: string;
  };
}

export interface Index {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface TableNode {
  id: string;
  name: string;
  columns: Column[];
  indexes: Index[];
}

export interface RelationshipEdge {
  id: string;
  source: string;
  target: string;
  sourceColumn: string;
  targetColumn: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

export interface SchemaGraph {
  tables: TableNode[];
  edges: RelationshipEdge[];
  metadata: {
    tableCount: number;
    columnCount: number;
    relationshipCount: number;
    parseTimeMs: number;
    orphanTableCount: number;
    mostConnectedTable: string | null;
  };
}

export interface ParseError {
  message: string;
  line?: number;
  suggestion?: string;
}

export interface InsightsReport {
  summary: {
    tableCount: number;
    columnCount: number;
    relationshipCount: number;
    orphanTableCount: number;
  };
  centrality: {
    tableId: string;
    tableName: string;
    incomingEdges: number;
    outgoingEdges: number;
    totalEdges: number;
  }[];
  orphans: {
    tableId: string;
    tableName: string;
  }[];
  typeDistribution: {
    type: string;
    count: number;
    percentage: number;
  }[];
  optimizationHints: {
    type: 'missing-index' | 'nullable-fk' | 'wide-table' | 'no-primary-key';
    tableId: string;
    tableName: string;
    message: string;
  }[];
}
