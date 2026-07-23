"use client";

import { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { TableNode as TableNodeType } from "../../../lib/types";

interface TableNodeProps {
  data: {
    table: TableNodeType;
    isActive?: boolean;
    isVisited?: boolean;
    highlightedColumns?: string[];
  };
}

const TableNode = memo(({ data }: TableNodeProps) => {
  const { table, isActive, isVisited, highlightedColumns = [] } = data;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`glass-card w-[240px] rounded-xl shadow-2xl relative transition-all duration-500 origin-center ${
        isActive
          ? 'ring-2 ring-stellar-strawberry shadow-[0_0_24px_rgba(255,92,141,0.5)] scale-105 overflow-visible'
          : isVisited
          ? 'ring-1 ring-stellar-strawberry/40 overflow-hidden'
          : 'neon-border overflow-hidden'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Target Handle (Left) */}
      <Handle
        type="target"
        position={Position.Left}
        className={`w-2 h-2 bg-stellar-strawberry border-2 border-pico-eggplant transition-opacity duration-200 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Header Strip */}
      <div className={`py-2 px-3 flex justify-between items-center border-b border-stellar-strawberry/20 transition-colors duration-500 ${
        isActive ? 'bg-stellar-strawberry/60' : isVisited ? 'bg-stellar-strawberry/20' : 'bg-pico-eggplant/40'
      }`}>
        <h3 className={`font-pixel text-[10px] text-stellar-strawberry uppercase truncate pr-2 ${isActive ? 'animate-pulse' : ''}`}>
          {table.name}
        </h3>
        <span className="text-grayzone text-[9px] whitespace-nowrap bg-hei-se/50 px-1.5 py-0.5 rounded">
          {table.columns.length} cols
        </span>
      </div>

      {/* Column List */}
      <div className="flex flex-col max-h-[300px] overflow-y-auto no-scrollbar bg-hei-se/40">
        {table.columns.map((col, i) => {
          const isHighlightedCol = highlightedColumns.includes(col.name.toLowerCase());
          return (
            <div
              key={col.name + i}
              className={`flex items-center justify-between py-1 px-3 border-b border-grayzone/10 last:border-0 transition-all duration-300 ${
                isHighlightedCol
                  ? 'bg-stellar-strawberry/20 border-l-2 border-l-stellar-strawberry'
                  : 'hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-1.5 overflow-hidden">
                {/* Icon */}
                <div className="w-2.5 flex-shrink-0 flex items-center justify-center">
                  {col.isPrimaryKey ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5 text-stellar-strawberry">
                      <path d="M12.65 10A5.99 5.99 0 0 0 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6a5.99 5.99 0 0 0 5.65-4h2.35v4h4v-4h3v-4h-9.35zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
                    </svg>
                  ) : col.isForeignKey ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 text-siesta-tan/70">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                    </svg>
                  ) : (
                    <div className="w-2.5 h-2.5" />
                  )}
                </div>
                
                {/* Name */}
                <span
                  className={`text-xs font-mono truncate ${
                    isHighlightedCol
                      ? 'text-stellar-strawberry font-semibold'
                      : col.nullable ? 'text-grayzone/70' : 'text-siesta-tan'
                  }`}
                >
                  {col.name}
                </span>
              </div>

              {/* Type Badge */}
              <span className="text-grayzone text-[9px] font-mono bg-hei-se/60 px-1 rounded flex-shrink-0 ml-2">
                {col.type.split('(')[0]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Source Handle (Right) */}
      <Handle
        type="source"
        position={Position.Right}
        className={`w-2 h-2 bg-stellar-strawberry border-2 border-pico-eggplant transition-opacity duration-200 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
});

TableNode.displayName = "TableNode";
export default TableNode;
