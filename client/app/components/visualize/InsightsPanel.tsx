"use client";

import { useState } from "react";
import { InsightsReport } from "../../../lib/types";
import GlassCard from "../ui/GlassCard";
import PixelButton from "../ui/PixelButton";

interface InsightsPanelProps {
  insights: InsightsReport | null;
}

export default function InsightsPanel({ insights }: InsightsPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (!insights) {
    return (
      <div className="fixed right-4 top-16 bottom-4 w-[280px] glass-strong rounded-xl p-4 flex flex-col gap-4 z-10 transition-transform duration-300">
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

  return (
    <div
      className={`fixed right-4 top-16 bottom-4 w-[280px] glass-strong rounded-xl p-4 flex flex-col z-10 transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "translate-x-[calc(100%-48px)]"
      }`}
    >
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h2 className="font-pixel text-xs text-stellar-strawberry">INSIGHTS</h2>
        <PixelButton variant="secondary" size="sm" onClick={() => setIsOpen(!isOpen)}>
          <span className={`inline-block transition-transform duration-200 ${isOpen ? "rotate-180" : "rotate-0"}`}>
            ▶
          </span>
        </PixelButton>
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
              optimizationHints.map((hint, i) => {
                const colorClass = getHintColor(hint.type);
                return (
                  <GlassCard key={i} className={`p-2.5 border ${colorClass} bg-opacity-10`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-mono text-[9px] uppercase font-bold tracking-wider">{hint.type.replace('-', ' ')}</span>
                      <span className="text-siesta-tan text-[10px] truncate max-w-[100px]">{hint.tableName}</span>
                    </div>
                    <p className="text-grayzone text-[10px] leading-tight">{hint.message}</p>
                  </GlassCard>
                );
              })
            ) : (
              <span className="text-grayzone text-[10px]">✓ No issues detected</span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
