"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";

import { SchemaGraph, InsightsReport } from "../lib/types";
import { fetchInsights, shareSchema } from "../lib/api";
import TableNode from "../components/visualize/TableNode";
import NeonEdge from "../components/visualize/NeonEdge";
import InsightsPanel from "../components/visualize/InsightsPanel";
import AIAssistant from "../components/visualize/AIAssistant";
import CanvasControls from "../components/visualize/CanvasControls";
import TopHeader from "../components/visualize/TopHeader";
import GalaxyView from "../components/visualize/GalaxyView";
import QueryPanel from "../components/visualize/QueryPanel";
import { ParsedQuery, QueryStep, extractOnColumns } from "../lib/queryParser";
import { exportDiagram } from "../lib/export";

const RANKSEP = 80;
const NODESEP = 60; // Slightly increased for breathing room

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: "LR", ranksep: RANKSEP, nodesep: NODESEP });

  nodes.forEach((node) => {
    // Estimating node dimensions. TableNode is w-240 and h-varies
    dagreGraph.setNode(node.id, { width: 240, height: 250 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 240 / 2,
        y: nodeWithPosition.y - 250 / 2,
      },
    };
  });
};

const nodeTypes = { tableNode: TableNode };
const edgeTypes = { neonEdge: NeonEdge };

interface VisualizeCanvasProps {
  graphData: SchemaGraph;
  rawGraphJson?: string;
  insights?: InsightsReport | null;
  viewMode?: 'er' | 'galaxy';
  onModeChange?: (mode: 'er' | 'galaxy') => void;
  onShare?: () => Promise<void>;
  readOnly?: boolean;
}

export function VisualizeCanvas({ graphData, rawGraphJson = "", insights = null, viewMode = 'er', onModeChange = () => {}, onShare = async () => {}, readOnly = false }: VisualizeCanvasProps) {
  const router = useRouter();
  const { fitView } = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [edgeTooltip, setEdgeTooltip] = useState<{
    x: number;
    y: number;
    sourceCol: string;
    targetCol: string;
    sourceTable: string;
    targetTable: string;
    type: string;
  } | null>(null);

  const [queryHighlight, setQueryHighlight] = useState<{
    activeTableName: string | null;
    visitedTableNames: Set<string>;
    activeEdgeIds: Set<string>;
    activeColumns: { tableName: string; columnName: string }[];
  } | null>(null);

  const handleQueryStep = useCallback((step: QueryStep, stepIndex: number, parsed: ParsedQuery) => {
    const activeTableName = step.table.toLowerCase();

    const visitedTableNames = new Set(
      parsed.steps.slice(0, stepIndex + 1).map(s => s.table.toLowerCase())
    );

    const activeEdgeIds = new Set<string>();
    if (stepIndex > 0) {
      const prevTableName = parsed.steps[stepIndex - 1].table.toLowerCase();
      graphData.edges.forEach(e => {
        const srcName = e.source.toLowerCase();
        const tgtName = e.target.toLowerCase();
        if (
          (srcName === activeTableName && visitedTableNames.has(tgtName)) ||
          (tgtName === activeTableName && visitedTableNames.has(srcName))
        ) {
          activeEdgeIds.add(e.id);
        }
      });
    }

    // Build alias → real table name map from all steps
    const aliasMap = new Map<string, string>();
    parsed.steps.forEach(s => {
      if (s.alias) aliasMap.set(s.alias.toLowerCase(), s.table.toLowerCase());
      // Also map the table name to itself
      aliasMap.set(s.table.toLowerCase(), s.table.toLowerCase());
    });

    // Resolve alias in activeColumns
    const activeColumns: { tableName: string; columnName: string }[] = [];
    if (step.onClause) {
      const parsed2 = extractOnColumns(step.onClause);
      if (parsed2) {
        // Resolve left side
        const leftTableRaw = parsed2.leftTable?.toLowerCase();
        const leftTableResolved = leftTableRaw
          ? (aliasMap.get(leftTableRaw) || leftTableRaw)
          : activeTableName;
        activeColumns.push({ tableName: leftTableResolved, columnName: parsed2.leftCol.toLowerCase() });

        // Resolve right side
        const rightTableRaw = parsed2.rightTable?.toLowerCase();
        const prevTable = stepIndex > 0 ? parsed.steps[stepIndex - 1].table.toLowerCase() : activeTableName;
        const rightTableResolved = rightTableRaw
          ? (aliasMap.get(rightTableRaw) || rightTableRaw)
          : prevTable;
        activeColumns.push({ tableName: rightTableResolved, columnName: parsed2.rightCol.toLowerCase() });
      }
    }

    setQueryHighlight({ activeTableName, visitedTableNames, activeEdgeIds, activeColumns });
  }, [graphData]);

  const handleQueryReset = useCallback(() => {
    setQueryHighlight(null);
  }, []);

  // Initialize
  useEffect(() => {
    try {
      // Build Initial Nodes & Edges
      const initialNodes: Node[] = graphData.tables.map((t) => ({
        id: t.id,
        type: "tableNode",
        position: { x: 0, y: 0 },
        data: { table: t },
      }));

      const initialEdges: Edge[] = graphData.edges.map((e) => ({
        id: e.id,
        source: graphData.tables.find(t => t.name === e.source)?.id || e.source,
        target: graphData.tables.find(t => t.name === e.target)?.id || e.target,
        sourceHandle: null,
        targetHandle: null,
        type: "neonEdge",
        animated: true,
        data: { type: e.type },
      }));

      // Check for saved layout
      const savedLayout = localStorage.getItem("dblens:layout");
      if (savedLayout) {
        const parsedLayout = JSON.parse(savedLayout) as { id: string; position: { x: number; y: number } }[];
        const restoredNodes = initialNodes.map(n => {
          const savedPos = parsedLayout.find(l => l.id === n.id)?.position;
          return { ...n, position: savedPos || n.position };
        });
        setNodes(restoredNodes);
        setEdges(initialEdges);
        setTimeout(() => fitView({ padding: 0.2 }), 100);
      } else {
        const layoutedNodes = getLayoutedElements(initialNodes, initialEdges);
        setNodes(layoutedNodes);
        setEdges(initialEdges);
        if (!readOnly) {
          localStorage.setItem(
            "dblens:layout",
            JSON.stringify(layoutedNodes.map(n => ({ id: n.id, position: n.position })))
          );
        }
        setTimeout(() => fitView({ padding: 0.2 }), 100);
      }
    } catch (e) {
      console.error("Layout error", e);
    }
  }, [graphData, fitView, setNodes, setEdges]);

  // Persist node movements
  useEffect(() => {
    if (nodes.length > 0 && !readOnly) {
      localStorage.setItem(
        "dblens:layout",
        JSON.stringify(nodes.map(n => ({ id: n.id, position: n.position })))
      );
    }
  }, [nodes, readOnly]);

  // Handle Node Click
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(prev => prev === node.id ? null : node.id);
    setEdgeTooltip(null);
  }, []);

  // Handle Canvas Click
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setEdgeTooltip(null);
  }, []);

  // Handle Edge Click
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    setSelectedNodeId(null);
    
    const sourceTable = graphData?.tables.find(t => t.id === edge.source);
    const targetTable = graphData?.tables.find(t => t.id === edge.target);
    const edgeData = graphData?.edges.find(e => e.id === edge.id);

    if (sourceTable && targetTable && edgeData) {
      setEdgeTooltip({
        x: event.clientX,
        y: event.clientY,
        sourceTable: sourceTable.name,
        targetTable: targetTable.name,
        sourceCol: edgeData.sourceColumn,
        targetCol: edgeData.targetColumn,
        type: edgeData.type,
      });
    }
  }, [graphData]);

  // Compute derived node/edge states based on selection
  const displayNodes = useMemo(() => {
    if (queryHighlight) {
      return nodes.map(n => {
        const tableName = graphData.tables.find(t => t.id === n.id)?.name?.toLowerCase() || '';
        const isActive = tableName === queryHighlight.activeTableName;
        const isVisited = queryHighlight.visitedTableNames.has(tableName);
        const highlightedColumns = queryHighlight.activeColumns
          .filter(c => c.tableName === tableName)
          .map(c => c.columnName);
        return {
          ...n,
          style: {
            opacity: isVisited || isActive ? 1 : 0.2,
            transition: 'opacity 0.3s',
          },
          data: { ...n.data, isActive, isVisited, highlightedColumns },
        };
      });
    }

    if (!selectedNodeId) return nodes.map(n => ({ ...n, style: { opacity: 1 }, data: { ...n.data, isActive: false, isVisited: false, highlightedColumns: [] } }));

    // Find all connected nodes
    const connectedNodeIds = new Set<string>();
    connectedNodeIds.add(selectedNodeId);
    
    edges.forEach(e => {
      if (e.source === selectedNodeId) connectedNodeIds.add(e.target);
      if (e.target === selectedNodeId) connectedNodeIds.add(e.source);
    });

    return nodes.map(n => ({
      ...n,
      style: { opacity: connectedNodeIds.has(n.id) ? 1 : 0.3, transition: 'opacity 0.2s' },
      data: { ...n.data, isActive: false, isVisited: false, highlightedColumns: [] }
    }));
  }, [nodes, edges, selectedNodeId, queryHighlight, graphData]);

  const displayEdges = useMemo(() => {
    if (queryHighlight) {
      return edges.map(e => ({
        ...e,
        selected: queryHighlight.activeEdgeIds.has(e.id),
        animated: queryHighlight.activeEdgeIds.has(e.id),
        style: {
          opacity: queryHighlight.activeEdgeIds.has(e.id) ? 1 : 0.1,
          transition: 'opacity 0.3s',
        },
      }));
    }

    if (!selectedNodeId) return edges.map(e => ({ ...e, selected: false, style: { opacity: 1 } }));
    
    return edges.map(e => {
      const isConnected = e.source === selectedNodeId || e.target === selectedNodeId;
      return {
        ...e,
        selected: isConnected,
        style: { opacity: isConnected ? 1 : 0.1, transition: 'opacity 0.2s' }
      };
    });
  }, [edges, selectedNodeId, queryHighlight]);

  // Controls
  const handleResetLayout = () => {
    localStorage.removeItem("dblens:layout");
    const layoutedNodes = getLayoutedElements(nodes, edges);
    setNodes(layoutedNodes);
    setTimeout(() => fitView({ padding: 0.2 }), 100);
  };

  const handleExport = useCallback(async (format: 'png' | 'svg') => {
    // First fit the view so the full diagram is visible
    fitView({ padding: 0.1, duration: 0 });

    // Wait one frame for fitView to apply
    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => setTimeout(resolve, 150)); // let fitView fully settle

    // Target the outer react-flow container, NOT the inner viewport
    const reactFlowEl = reactFlowWrapper.current?.querySelector(
      '.react-flow'
    ) as HTMLElement | null;

    if (!reactFlowEl) {
      console.error('[DBLens] Could not find React Flow container element');
      return;
    }

    await exportDiagram(reactFlowEl, {
      format,
      filename: 'dblens-diagram',
    });
  }, [fitView]);

  if (!graphData) return null;

  return (
    <div ref={reactFlowWrapper} className="w-full h-full relative">
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#85A3B2" gap={40} size={1} style={{ opacity: 0.05 }} />
        <Controls style={{ backgroundColor: 'rgba(20, 32, 48, 0.8)', border: '1px solid rgba(133, 163, 178, 0.2)', fill: '#FF5C8D' }} />
        <MiniMap nodeColor="#732553" maskColor="rgba(20, 32, 48, 0.8)" style={{ backgroundColor: '#142030', border: '1px solid rgba(133, 163, 178, 0.2)' }} />
      </ReactFlow>

      {graphData && graphData.tables.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
          <p className="font-pixel text-[12px] text-grayzone mb-3">NO TABLES FOUND</p>
          <p className="text-grayzone text-xs text-center max-w-xs">
            The connected database has no tables in the public schema yet.
          </p>
        </div>
      )}

      {!readOnly && <AIAssistant graphData={graphData} />}
      {!readOnly && <InsightsPanel insights={insights} />}
      {!readOnly && (
        <QueryPanel
          graphData={graphData}
          onStepChange={handleQueryStep}
          onReset={handleQueryReset}
        />
      )}
      {!readOnly && (
        <>
          <TopHeader 
            graphJson={rawGraphJson} 
            onNewSchema={() => router.push('/upload')}
            onExport={handleExport}
            onShare={onShare}
          />
          <CanvasControls 
            onFitView={() => fitView({ padding: 0.2, duration: 800 })} 
            onResetLayout={handleResetLayout} 
            mode={viewMode}
            onModeChange={onModeChange}
          />
        </>
      )}

      {/* Edge Tooltip */}
      {edgeTooltip && (
        <div
          className="fixed glass-strong px-4 py-3 rounded-lg border border-stellar-strawberry/50 shadow-2xl z-50 pointer-events-none animate-fade-in"
          style={{ left: edgeTooltip.x + 15, top: edgeTooltip.y + 15 }}
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="font-pixel text-[10px] text-siesta-tan uppercase">{edgeTooltip.sourceTable}</span>
              <span className="text-grayzone text-[10px]">({edgeTooltip.sourceCol})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-px h-3 bg-grayzone/30 mx-auto"></div>
              <span className="bg-hei-se px-1.5 py-0.5 rounded font-pixel text-[8px] text-stellar-strawberry uppercase">
                {edgeTooltip.type.replace('-', ' ')}
              </span>
              <div className="w-px h-3 bg-grayzone/30 mx-auto"></div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-pixel text-[10px] text-siesta-tan uppercase">{edgeTooltip.targetTable}</span>
              <span className="text-grayzone text-[10px]">({edgeTooltip.targetCol})</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VisualizePage() {
  const router = useRouter();
  const [graphData, setGraphData] = useState<SchemaGraph | null>(null);
  const [rawGraphJson, setRawGraphJson] = useState("");
  const [insights, setInsights] = useState<InsightsReport | null>(null);
  const [viewMode, setViewMode] = useState<'er' | 'galaxy'>('er');

  const handleShare = useCallback(async () => {
    if (!graphData) return;
    try {
      const res = await shareSchema(graphData);
      if (res.success && res.data) {
        const fullUrl = `${window.location.origin}${res.data.shareUrl}`;
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(fullUrl);
          } else {
            const textArea = document.createElement("textarea");
            textArea.value = fullUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
          }
        } catch (err) {
          console.error('Failed to copy to clipboard:', err);
          alert(`Share link created! Copy this URL manually: \n\n${fullUrl}`);
        }
      } else {
        console.error('Share failed:', res.error?.message);
        alert('Share failed: ' + res.error?.message);
      }
    } catch (error: any) {
      console.error('Network error during share:', error);
      alert('Network Error: Could not reach the backend server. Make sure the server is running on port 3001. Details: ' + error.message);
    }
  }, [graphData]);

  useEffect(() => {
    const rawSchema = localStorage.getItem("dblens:schema");
    if (!rawSchema) {
      router.push("/upload?reason=no-schema");
      return;
    }

    try {
      setRawGraphJson(rawSchema);
      const graph: SchemaGraph = JSON.parse(rawSchema);
      setGraphData(graph);

      // Fetch insights
      fetchInsights(graph)
        .then((res) => {
          if (res.success && res.data) {
            setInsights(res.data);
          }
        })
        .catch(console.error);
    } catch (e) {
      console.error(e);
      router.push("/upload?reason=invalid-schema");
    }
  }, [router]);

  if (!graphData) return null;

  return (
    <main className="w-screen h-screen bg-hei-se flex flex-col overflow-hidden">
      <div className="flex-grow relative">
        {viewMode === 'er' && (
          <ReactFlowProvider>
            <VisualizeCanvas 
              graphData={graphData} 
              rawGraphJson={rawGraphJson}
              insights={insights}
              viewMode={viewMode}
              onModeChange={setViewMode}
              onShare={handleShare}
            />
          </ReactFlowProvider>
        )}
        
        {viewMode === 'galaxy' && (
          <>
            <GalaxyView graphData={graphData} />
            <CanvasControls 
              onFitView={() => {}} 
              onResetLayout={() => {}} 
              mode={viewMode}
              onModeChange={setViewMode}
            />
          </>
        )}
      </div>
    </main>
  );
}
