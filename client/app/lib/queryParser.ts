export interface QueryStep {
  type: 'FROM' | 'JOIN';
  table: string;           // table name as written in the query
  alias?: string;          // alias if present (e.g. FROM users u → alias: 'u')
  joinType?: string;       // 'INNER', 'LEFT', 'RIGHT', 'FULL', etc.
  onClause?: string;       // the ON condition as raw string
  description: string;     // human-readable explanation of this step
}

export interface ParsedQuery {
  steps: QueryStep[];
  tables: string[];        // unique table names in order of appearance
  raw: string;
}

export function parseSelectQuery(sql: string): ParsedQuery {
  const steps: QueryStep[] = [];
  const tables: string[] = [];

  const normalized = sql.replace(/\s+/g, ' ').trim();

  // Extract FROM clause table
  const fromMatch = normalized.match(
    /FROM\s+([`"']?\w+[`"']?)\s*(?:AS\s+)?([`"']?\w+[`"']?)?/i
  );
  if (fromMatch) {
    const tableName = fromMatch[1].replace(/[`"']/g, '');
    const alias = fromMatch[2] && fromMatch[2].toUpperCase() !== 'WHERE' &&
                  fromMatch[2].toUpperCase() !== 'JOIN' &&
                  fromMatch[2].toUpperCase() !== 'INNER' &&
                  fromMatch[2].toUpperCase() !== 'LEFT' &&
                  fromMatch[2].toUpperCase() !== 'ON'
      ? fromMatch[2].replace(/[`"']/g, '') : undefined;

    steps.push({
      type: 'FROM',
      table: tableName,
      alias,
      description: `Start with the \`${tableName}\` table${alias ? ` (aliased as \`${alias}\`)` : ''} — this is your base dataset.`,
    });
    tables.push(tableName);
  }

  // Extract all JOIN clauses
  const joinRegex =
    /(?:^|\s)(LEFT\s+OUTER|RIGHT\s+OUTER|FULL\s+OUTER|INNER|LEFT|RIGHT|FULL|CROSS)?\s*JOIN\s+([`"']?\w+[`"']?)\s*(?:(?:AS\s+)?([`"']?\w+[`"']?)\s+)?ON\s+([\s\S]+?)(?=\s+(?:INNER|LEFT|RIGHT|FULL|CROSS|JOIN|WHERE|GROUP|ORDER|LIMIT|HAVING)|$)/gi;

  let joinMatch: RegExpExecArray | null;
  while ((joinMatch = joinRegex.exec(normalized)) !== null) {
    const joinType = (joinMatch[1] || 'INNER').trim().toUpperCase();
    const tableName = joinMatch[2].replace(/[`"']/g, '');
    const alias = joinMatch[3] && !['ON', 'WHERE', 'GROUP', 'ORDER', 'LIMIT', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS', 'SET'].includes(joinMatch[3].toUpperCase())
      ? joinMatch[3].replace(/[`"']/g, '') : undefined;
    const onClause = joinMatch[4]?.trim();

    const joinTypeLabel = joinType === 'INNER' ? 'INNER JOIN'
      : joinType.includes('LEFT') ? 'LEFT JOIN'
      : joinType.includes('RIGHT') ? 'RIGHT JOIN'
      : joinType.includes('FULL') ? 'FULL OUTER JOIN'
      : joinType === 'CROSS' ? 'CROSS JOIN'
      : 'JOIN';

    const joinDesc = joinType.includes('LEFT')
      ? `Include all rows from the previous result and matching rows from \`${tableName}\`. Non-matches return NULL.`
      : joinType.includes('RIGHT')
      ? `Include all rows from \`${tableName}\` and matching rows from previous tables. Non-matches return NULL.`
      : `Match rows between the previous result and \`${tableName}\`. Only matching rows are kept.`;

    steps.push({
      type: 'JOIN',
      table: tableName,
      alias,
      joinType: joinTypeLabel,
      onClause,
      description: `${joinTypeLabel}: ${joinDesc}${onClause ? ` Condition: \`${onClause.trim()}\`` : ''}`,
    });

    if (!tables.includes(tableName)) tables.push(tableName);
  }

  return { steps, tables, raw: sql };
}

export function extractOnColumns(onClause: string): { leftTable?: string; leftCol: string; rightTable?: string; rightCol: string } | null {
  // Match: table.column = table.column OR just column = column
  const match = onClause.match(
    /([`"']?\w+[`"']?)\.([`"']?\w+[`"']?)\s*=\s*([`"']?\w+[`"']?)\.([`"']?\w+[`"']?)/i
  );
  if (match) {
    return {
      leftTable: match[1].replace(/[`"']/g, ''),
      leftCol: match[2].replace(/[`"']/g, ''),
      rightTable: match[3].replace(/[`"']/g, ''),
      rightCol: match[4].replace(/[`"']/g, ''),
    };
  }
  // Fallback: just column = column (no table prefix)
  const simpleMatch = onClause.match(/([`"']?\w+[`"']?)\s*=\s*([`"']?\w+[`"']?)/i);
  if (simpleMatch) {
    return {
      leftCol: simpleMatch[1].replace(/[`"']/g, ''),
      rightCol: simpleMatch[2].replace(/[`"']/g, ''),
    };
  }
  return null;
}
