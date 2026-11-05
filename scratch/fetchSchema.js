fetch('http://localhost:3001/api/schema/examples/ecommerce')
  .then(res => res.json())
  .then(data => {
    console.log("Edges[0]:", data.edges[0]);
    const connectionCount = new Map();
    data.tables.forEach(t => connectionCount.set(t.name, 0));
    data.edges.forEach(e => {
      connectionCount.set(e.source, (connectionCount.get(e.source) || 0) + 1);
      connectionCount.set(e.target, (connectionCount.get(e.target) || 0) + 1);
    });
    console.log('[SunSelection] connection counts:', Object.fromEntries(connectionCount));
    const maxConnections = Math.max(...connectionCount.values());
    const candidates = data.tables.filter(t => connectionCount.get(t.name) === maxConnections);
    console.log('[SunSelection] maxConnections:', maxConnections, 'candidates:', candidates.map(c => c.name));
  })
  .catch(err => console.error(err));
