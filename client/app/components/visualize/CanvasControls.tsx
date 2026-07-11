"use client";

import { useState } from "react";
import PixelButton from "../ui/PixelButton";

interface CanvasControlsProps {
  onFitView: () => void;
  onResetLayout: () => void;
  graphJson: string;
}

export default function CanvasControls({ onFitView, onResetLayout, graphJson }: CanvasControlsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(graphJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 glass-strong px-4 py-2 rounded-xl flex items-center gap-3 border border-grayzone/20 shadow-xl">
      <PixelButton variant="secondary" size="sm" onClick={onFitView}>
        FIT VIEW
      </PixelButton>
      <div className="w-px h-6 bg-grayzone/20"></div>
      <PixelButton variant="secondary" size="sm" onClick={onResetLayout}>
        RESET LAYOUT
      </PixelButton>
      <div className="w-px h-6 bg-grayzone/20"></div>
      <PixelButton variant="secondary" size="sm" onClick={handleCopy}>
        {copied ? "COPIED!" : "COPY JSON"}
      </PixelButton>
    </div>
  );
}
