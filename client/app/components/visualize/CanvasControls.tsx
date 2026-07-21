"use client";

import PixelButton from "../ui/PixelButton";

interface CanvasControlsProps {
  onFitView: () => void;
  onResetLayout: () => void;
  mode: 'er' | 'galaxy';
  onModeChange: (mode: 'er' | 'galaxy') => void;
}

export default function CanvasControls({ onFitView, onResetLayout, mode, onModeChange }: CanvasControlsProps) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 glass-strong p-1 rounded-xl flex items-center gap-1 border border-grayzone/20 shadow-xl">
      <div className="flex items-center gap-1 bg-hei-se/50 p-1 rounded-lg border border-grayzone/10 mr-2">
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

      <div className="w-px h-6 bg-grayzone/20 mr-2"></div>

      {mode === 'er' && (
        <>
          <PixelButton variant="secondary" size="sm" onClick={onFitView}>
            FIT VIEW
          </PixelButton>
          <PixelButton variant="secondary" size="sm" onClick={onResetLayout}>
            RESET LAYOUT
          </PixelButton>
        </>
      )}
    </div>
  );
}
