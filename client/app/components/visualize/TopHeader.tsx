"use client";

import { useState, useRef, useEffect } from "react";
import PixelButton from "../ui/PixelButton";

interface TopHeaderProps {
  graphJson: string;
  onNewSchema: () => void;
  onExport: (format: 'png' | 'svg') => Promise<void>;
  onShare: () => Promise<void>;
}

export default function TopHeader({ 
  graphJson, 
  onNewSchema, 
  onExport, 
  onShare 
}: TopHeaderProps) {
  const [copied, setCopied] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState<'png' | 'svg' | null>(null);
  const [shareState, setShareState] = useState<'idle' | 'loading' | 'copied'>('idle');

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

  const handleShare = async () => {
    setShareState('loading');
    try {
      await onShare();
      setShareState('copied');
      setTimeout(() => setShareState('idle'), 3000);
    } catch {
      setShareState('idle');
    }
  };

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
    <header className="absolute top-0 w-full z-50 px-6 py-4 flex items-center justify-between pointer-events-none">
      
      {/* Left: Branding */}
      <div className="flex items-center gap-4 pointer-events-auto">
        <h1 className="font-pixel text-stellar-strawberry text-2xl tracking-widest drop-shadow-[0_0_10px_rgba(255,42,109,0.5)]">
          DBLENS
        </h1>
      </div>

      {/* Right: Global Actions */}
      <div className="flex items-center gap-3 glass-strong px-4 py-2 rounded-xl shadow-xl border border-grayzone/20 pointer-events-auto">
        
        {/* Export button + popup */}
        <div className="relative" ref={exportMenuRef}>
          {showExportMenu && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 glass-strong border border-grayzone/20 rounded-lg overflow-hidden shadow-xl z-20 flex flex-col min-w-[100px]">
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

        <PixelButton
          variant="secondary"
          size="sm"
          onClick={handleShare}
          disabled={shareState === 'loading'}
        >
          {shareState === 'loading' ? 'SHARING...' : shareState === 'copied' ? '🔗 COPIED!' : 'SHARE'}
        </PixelButton>

        <div className="w-px h-6 bg-grayzone/20"></div>

        <PixelButton variant="secondary" size="sm" onClick={handleCopy}>
          {copied ? "COPIED!" : "COPY JSON"}
        </PixelButton>

        <div className="w-px h-6 bg-grayzone/20"></div>

        <PixelButton variant="primary" size="sm" onClick={onNewSchema}>
          NEW SCHEMA
        </PixelButton>
      </div>
      
    </header>
  );
}
