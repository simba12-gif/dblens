"use client";

import { useState, useEffect, useRef } from "react";
import PixelButton from "../ui/PixelButton";

interface CanvasControlsProps {
  onFitView: () => void;
  onResetLayout: () => void;
  graphJson: string;
  onNewSchema: () => void;
  onExport: (format: 'png' | 'svg') => Promise<void>;
  mode: 'er' | 'galaxy';
  onModeChange: (mode: 'er' | 'galaxy') => void;
}

export default function CanvasControls({ onFitView, onResetLayout, graphJson, onNewSchema, onExport, mode, onModeChange }: CanvasControlsProps) {
  const [copied, setCopied] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState<'png' | 'svg' | null>(null);

  const handleExport = async (format: 'png' | 'svg') => {
    setShowExportMenu(false);
    setExporting(format);
    try {
      await onExport(format);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(null);
    }
  };

  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      {/* Mode Toggle */}
      <div className="flex items-center gap-1 bg-hei-se/50 p-1 rounded-lg border border-grayzone/10">
        <PixelButton 
          variant={mode === 'er' ? 'primary' : 'secondary'} 
          size="sm" 
          onClick={() => onModeChange('er')}
        >
          ER DIAGRAM
        </PixelButton>
        <PixelButton 
          variant={mode === 'galaxy' ? 'primary' : 'secondary'} 
          size="sm" 
          onClick={() => onModeChange('galaxy')}
        >
          🪐 GALAXY
        </PixelButton>
      </div>
      
      <div className="w-px h-6 bg-grayzone/20"></div>

      {mode === 'er' && (
        <>
          <PixelButton variant="secondary" size="sm" onClick={onFitView}>
            FIT VIEW
          </PixelButton>
          <div className="w-px h-6 bg-grayzone/20"></div>
          <PixelButton variant="secondary" size="sm" onClick={onResetLayout}>
            RESET LAYOUT
          </PixelButton>
          
          <div className="w-px h-6 bg-grayzone/20"></div>

      {/* Export button + popup */}
      <div className="relative" ref={exportMenuRef}>
        {showExportMenu && (
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 glass-strong border border-grayzone/20 rounded-lg overflow-hidden shadow-xl z-20 flex flex-col min-w-[100px]">
            <button
              onClick={() => handleExport('png')}
              className="px-4 py-2 text-left font-pixel text-[9px] text-siesta-tan hover:bg-stellar-strawberry/20 hover:text-stellar-strawberry transition-colors uppercase tracking-wider"
            >
              PNG
            </button>
            <div className="h-px bg-grayzone/20" />
            <button
              onClick={() => handleExport('svg')}
              className="px-4 py-2 text-left font-pixel text-[9px] text-siesta-tan hover:bg-stellar-strawberry/20 hover:text-stellar-strawberry transition-colors uppercase tracking-wider"
            >
              SVG
            </button>
          </div>
        )}
        <PixelButton
          variant="secondary"
          size="sm"
          onClick={() => setShowExportMenu(prev => !prev)}
          disabled={exporting !== null}
        >
          {exporting ? 'SAVING...' : 'EXPORT'}
        </PixelButton>
      </div>

      <div className="w-px h-6 bg-grayzone/20"></div>
      </>
      )}

      <PixelButton variant="secondary" size="sm" onClick={handleCopy}>
        {copied ? "COPIED!" : "COPY JSON"}
      </PixelButton>
      <div className="w-px h-6 bg-grayzone/20"></div>
      <PixelButton variant="primary" size="sm" onClick={onNewSchema}>
        NEW SCHEMA
      </PixelButton>
    </div>
  );
}
