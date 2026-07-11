"use client";

import { BaseEdge, EdgeLabelRenderer, EdgeProps, getSmoothStepPath } from "@xyflow/react";

export default function NeonEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  animated,
  selected,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const relType = data?.type as string | undefined;
  const label = relType === "one-to-one" ? "1:1" : "1:N";

  const isHighlighted = selected;

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: "#FF5C8D", // Stellar Strawberry
          strokeWidth: isHighlighted ? 3 : 2,
          filter: isHighlighted
            ? "drop-shadow(0 0 8px rgba(255, 92, 141, 0.8))"
            : "drop-shadow(0 0 4px rgba(255, 92, 141, 0.6))",
          strokeDasharray: animated ? "5, 5" : "none",
          animation: animated ? "dash 1s linear infinite" : "none",
          opacity: style.opacity,
          transition: "stroke-width 0.2s, filter 0.2s, opacity 0.2s",
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        >
          <div className="glass px-1.5 py-0.5 rounded border border-grayzone/20 font-pixel text-[8px] text-grayzone bg-hei-se/80 shadow-md">
            {label}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
