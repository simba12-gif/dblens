"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { InsightsReport } from "../../../lib/types";
import GlassCard from "../ui/GlassCard";
import PixelButton from "../ui/PixelButton";

interface InsightsPanelProps {
  insights: InsightsReport | null;
}

export default function InsightsPanel({ insights }: InsightsPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (type: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  };

  if (!insights) {
    return (
      <div className={`fixed right-0 top-1/2 -translate-y-1/2 flex items-center z-10 transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-[280px]'}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="glass-strong border border-grayzone/20 rounded-l-lg px-1.5 py-4 flex flex-col items-center gap-2 hover:border-stellar-strawberry/40 transition-colors cursor-pointer"
        >
          <span className={`text-grayzone text-[10px] transition-transform duration-200 ${isOpen ? 'rotate-0' : 'rotate-180'}`}>▶</span>
          <span className="font-pixel text-[7px] text-grayzone writing-mode-vertical" style={{writingMode: 'vertical-rl', textOrientation: 'mixed', letterSpacing: '0.1em'}}>INSIGHTS</span>
        </button>
        <div className="w-[280px] h-[calc(100vh-8rem)] glass-strong rounded-l-xl p-4 flex flex-col overflow-hidden border border-grayzone/20 gap-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-pixel text-xs text-stellar-strawberry">INSIGHTS</h2>
          </div>
        <div className="animate-pulse flex flex-col gap-4">
          <div className="h-20 bg-grayzone/10 rounded-lg"></div>
          <div className="h-16 bg-grayzone/10 rounded-lg"></div>
          <div className="h-24 bg-grayzone/10 rounded-lg"></div>
          <div className="h-12 bg-grayzone/10 rounded-lg"></div>
        </div>
        </div>
      </div>
    );
  }

  const { summary, centrality, orphans, typeDistribution, optimizationHints } = insights;
  const topCentrality = centrality.slice(0, 3);
  const maxEdges = topCentrality.length > 0 ? topCentrality[0].totalEdges : 1;

  // Color mapping for hints
  const getHintColor = (type: string) => {
    switch (type) {
      case "missing-index": return "text-amber-400 border-amber-400/30 bg-amber-400/5";
      case "nullable-fk": return "text-orange-400 border-orange-400/30 bg-orange-400/5";
      case "wide-table": return "text-blue-400 border-blue-400/30 bg-blue-400/5";
      case "no-primary-key": return "text-red-400 border-red-400/30 bg-red-400/5";
      default: return "text-grayzone border-grayzone/30 bg-grayzone/5";
    }
  };

  const getTypeColor = (index: number) => {
    const colors = ["bg-stellar-strawberry", "bg-siesta-tan", "bg-blue-400", "bg-emerald-400", "bg-purple-400"];
    return colors[index % colors.length];
  };

  const grouped = optimizationHints.reduce((acc, hint) => {
    if (!acc[hint.type]) acc[hint.type] = [];
    acc[hint.type].push(hint);
    return acc;
  }, {} as Record<string, InsightsReport['optimizationHints']>);

  const groupOrder = ['no-primary-key', 'missing-index', 'nullable-fk', 'wide-table'];
  const activeGroups = groupOrder.filter(type => grouped[type]?.length > 0);

  const getGroupStyles = (type: string) => {
    switch (type) {
      case "missing-index": return { text: "text-amber-400", bg: "bg-amber-400/5", border: "border-amber-400/60" };
      case "nullable-fk": return { text: "text-orange-400", bg: "bg-orange-400/5", border: "border-orange-400/60" };
      case "wide-table": return { text: "text-blue-400", bg: "bg-blue-400/5", border: "border-blue-400/60" };
      case "no-primary-key": return { text: "text-red-400", bg: "bg-red-400/5", border: "border-red-400/60" };
      default: return { text: "text-grayzone", bg: "bg-grayzone/5", border: "border-grayzone/60" };
    }
  };

  return (
    <div className={`fixed right-0 top-1/2 -translate-y-1/2 flex items-center z-10 transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-[280px]'}`}>
      {/* Always-visible pull tab */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="glass-strong border border-grayzone/20 rounded-l-lg px-1.5 py-4 flex flex-col items-center gap-2 hover:border-stellar-strawberry/40 transition-colors cursor-pointer"
      >
        <span className={`text-grayzone text-[10px] transition-transform duration-200 ${isOpen ? 'rotate-0' : 'rotate-180'}`}>▶</span>
        <span className="font-pixel text-[7px] text-grayzone writing-mode-vertical" style={{writingMode: 'vertical-rl', textOrientation: 'mixed', letterSpacing: '0.1em'}}>INSIGHTS</span>
      </button>

      {/* Panel body */}
      <div className="w-[280px] h-[calc(100vh-8rem)] glass-strong rounded-l-xl p-4 flex flex-col overflow-hidden border border-grayzone/20">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="font-pixel text-xs text-stellar-strawberry">INSIGHTS</h2>
        </div>

        <div className="overflow-y-auto pr-1 no-scrollbar flex flex-col gap-6 flex-grow">
        
        {/* Schema Summary */}
        <div className="grid grid-cols-2 gap-2">
          <GlassCard className="p-3 text-center">
            <div className="font-pixel text-stellar-strawberry text-base">{summary.tableCount}</div>
            <div className="text-grayzone text-[9px] uppercase tracking-wide mt-1">Tables</div>
          </GlassCard>
          <GlassCard className="p-3 text-center">
            <div className="font-pixel text-stellar-strawberry text-base">{summary.columnCount}</div>
            <div className="text-grayzone text-[9px] uppercase tracking-wide mt-1">Columns</div>
          </GlassCard>
          <GlassCard className="p-3 text-center">
            <div className="font-pixel text-stellar-strawberry text-base">{summary.relationshipCount}</div>
            <div className="text-grayzone text-[9px] uppercase tracking-wide mt-1">Relations</div>
          </GlassCard>
          <GlassCard className="p-3 text-center">
            <div className="font-pixel text-stellar-strawberry text-base">{summary.orphanTableCount}</div>
            <div className="text-grayzone text-[9px] uppercase tracking-wide mt-1">Orphans</div>
          </GlassCard>
        </div>

        {/* Most Connected */}
        <div>
          <h3 className="font-pixel text-[10px] text-grayzone mb-3 uppercase">Most Connected</h3>
          <div className="flex flex-col gap-3">
            {topCentrality.map(c => (
              <div key={c.tableId} className="flex flex-col gap-1">
                <div className="flex justify-between items-end">
                  <span className="text-siesta-tan text-xs truncate">{c.tableName}</span>
                  <span className="text-grayzone text-[10px] whitespace-nowrap ml-2">→ {c.totalEdges} connections</span>
                </div>
                <div className="h-1 bg-hei-se rounded overflow-hidden">
                  <div
                    className="h-full bg-stellar-strawberry"
                    style={{ width: `${(c.totalEdges / maxEdges) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {topCentrality.length === 0 && <span className="text-grayzone text-[10px]">No connections found.</span>}
          </div>
        </div>

        {/* Orphan Tables */}
        <div>
          <h3 className="font-pixel text-[10px] text-grayzone mb-3 uppercase">Orphan Tables</h3>
          {orphans.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {orphans.map(o => (
                <div key={o.tableId} className="flex items-center gap-1.5 glass px-2 py-1 border border-pico-eggplant/50 rounded text-xs text-siesta-tan">
                  <span className="text-stellar-strawberry text-[10px]">⚡</span>
                  {o.tableName}
                </div>
              ))}
            </div>
          ) : (
            <span className="text-grayzone text-[10px]">✓ No orphan tables</span>
          )}
        </div>

        {/* Type Distribution */}
        <div>
          <h3 className="font-pixel text-[10px] text-grayzone mb-3 uppercase">Type Distribution</h3>
          {typeDistribution.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="flex h-2 w-full rounded overflow-hidden bg-hei-se">
                {typeDistribution.slice(0, 5).map((t, i) => (
                  <div key={t.type} className={`h-full ${getTypeColor(i)}`} style={{ width: `${t.percentage}%` }}></div>
                ))}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                {typeDistribution.slice(0, 5).map((t, i) => (
                  <div key={t.type} className="flex items-center gap-1.5 text-[9px] font-mono text-grayzone">
                    <span className={`w-1.5 h-1.5 rounded-full ${getTypeColor(i)}`}></span>
                    {t.type} ({t.percentage}%)
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <span className="text-grayzone text-[10px]">No types found.</span>
          )}
        </div>

        {/* Optimization Hints */}
        <div>
          <h3 className="font-pixel text-[10px] text-grayzone mb-3 uppercase">Optimization Hints</h3>
          <div className="flex flex-col gap-2">
            {optimizationHints.length > 0 ? (
              activeGroups.map(type => {
                const groupHints = grouped[type];
                const isGroupOpen = openGroups.has(type);
                const styles = getGroupStyles(type);
                
                return (
                  <div key={type} className="flex flex-col">
                    {/* Header */}
                    <div 
                      onClick={() => toggleGroup(type)}
                      className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors hover:bg-white/5 border-l-2 ${styles.border} ${styles.bg}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`font-pixel text-[9px] uppercase ${styles.text}`}>
                          {type.replace('-', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-hei-se text-grayzone text-[9px] font-pixel px-1.5 py-0.5 rounded">
                          {groupHints.length}
                        </span>
                        <span className={`text-grayzone text-[10px] transition-transform duration-200 ${isGroupOpen ? 'rotate-90' : 'rotate-0'}`}>
                          ▶
                        </span>
                      </div>
                    </div>
                    
                    {/* Expanded Content */}
                    <AnimatePresence>
                      {isGroupOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          style={{ overflow: "hidden" }}
                        >
                          <div className="flex flex-col mt-2 pl-3">
                            {groupHints.map((hint, i) => (
                              <div key={i} className="py-2 border-t border-grayzone/10 first:border-0">
                                <div className="flex justify-end mb-1">
                                  <span className="text-siesta-tan text-[10px] font-mono">{hint.tableName}</span>
                                </div>
                                <p className="text-grayzone text-[10px] leading-relaxed">
                                  {hint.message}
                                </p>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            ) : (
              <span className="text-grayzone text-[10px]">✓ No issues detected</span>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
