"use client";

import React, { useState, useEffect, useRef } from "react";
import { ParsedQuery, QueryStep, parseSelectQuery } from "../../lib/queryParser";
import PixelButton from "../ui/PixelButton";

const SPEED_OPTIONS = [
  { label: 'SLOW', ms: 2000 },
  { label: 'NORMAL', ms: 1200 },
  { label: 'FAST', ms: 500 },
  { label: 'INSTANT', ms: 0 },
] as const;

interface QueryPanelProps {
  graphData: any; 
  onStepChange: (step: QueryStep, stepIndex: number, query: ParsedQuery) => void;
  onReset: () => void;
}

export default function QueryPanel({ graphData, onStepChange, onReset }: QueryPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [parsedQuery, setParsedQuery] = useState<ParsedQuery | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  
  const [speedMs, setSpeedMs] = useState(1200);
  const [playMode, setPlayMode] = useState<'auto' | 'step'>('auto');

  const activeStepRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Auto-scroll when currentStep changes
  useEffect(() => {
    if (activeStepRef.current) {
      activeStepRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentStep]);

  const handleVisualize = () => {
    if (!query.trim()) return;
    try {
      const parsed = parseSelectQuery(query);
      if (parsed.steps.length === 0) {
        setError('No FROM or JOIN clauses found. Make sure your query includes a FROM statement.');
        return;
      }
      
      const schemaTableNames = (graphData.tables || []).map((t: any) => t.name.toLowerCase());
      const unknownTables = parsed.tables.filter((t: string) => !schemaTableNames.includes(t.toLowerCase()));
      
      if (unknownTables.length === parsed.tables.length && parsed.tables.length > 0) {
        setError(`None of these tables exist in your schema: ${unknownTables.join(', ')}`);
        return;
      }
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setParsedQuery(parsed);
      setCurrentStep(-1);
      setError(null);
      
      if (playMode === 'auto') {
        startAutoPlay(parsed, speedMs);
      } else {
        setCurrentStep(0);
        onStepChange(parsed.steps[0], 0, parsed);
      }
    } catch (err) {
      setError('Could not parse query. Check your SQL syntax.');
    }
  };

  const startAutoPlay = (parsed: ParsedQuery, speed: number) => {
    setIsPlaying(true);
    setCurrentStep(-1);
    
    if (speed === 0) {
      // INSTANT mode — fire all steps with 50ms interval for React batching
      const fireStep = (stepIndex: number) => {
        if (stepIndex >= parsed.steps.length) {
          setIsPlaying(false);
          return;
        }
        setCurrentStep(stepIndex);
        onStepChange(parsed.steps[stepIndex], stepIndex, parsed);
        setTimeout(() => fireStep(stepIndex + 1), 50);
      };
      fireStep(0);
      return;
    }

    let step = 0;
    setCurrentStep(0);
    onStepChange(parsed.steps[0], 0, parsed);
    step = 1;

    if (step >= parsed.steps.length) {
      setIsPlaying(false);
      return;
    }

    const interval = setInterval(() => {
      setCurrentStep(step);
      onStepChange(parsed.steps[step], step, parsed);
      step++;
      if (step >= parsed.steps.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsPlaying(false);
      }
    }, speed);
    
    intervalRef.current = interval;
  };

  const handleReset = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setQuery('');
    setParsedQuery(null);
    setCurrentStep(-1);
    setIsPlaying(false);
    setError(null);
    onReset();
  };

  const handleClose = () => {
    handleReset();
    setIsOpen(false);
  };

  const fillExample = () => {
    const exampleQuery = (graphData.edges && graphData.edges.length > 0)
      ? (() => {
          const firstEdge = graphData.edges[0];
          const srcTable = graphData.tables.find((t: any) => t.id === firstEdge.source || t.name === firstEdge.source)?.name || firstEdge.source;
          const tgtTable = graphData.tables.find((t: any) => t.id === firstEdge.target || t.name === firstEdge.target)?.name || firstEdge.target;
          return srcTable && tgtTable
            ? `SELECT *\nFROM ${tgtTable}\nINNER JOIN ${srcTable} ON ${srcTable}.${firstEdge.sourceColumn || 'id'} = ${tgtTable}.${firstEdge.targetColumn || 'id'}`
            : `SELECT * FROM ${graphData.tables[0]?.name || 'your_table'}`;
        })()
      : `SELECT * FROM ${graphData.tables?.[0]?.name || 'your_table'}`;
    
    setQuery(exampleQuery);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setParsedQuery(null);
    setCurrentStep(-1);
    setError(null);
  };

  const handleNextStep = () => {
    if (!parsedQuery || currentStep >= parsedQuery.steps.length - 1) return;
    const next = currentStep + 1;
    setCurrentStep(next);
    onStepChange(parsedQuery.steps[next], next, parsedQuery);
  };

  const handlePrevStep = () => {
    if (!parsedQuery || currentStep <= 0) return;
    const prev = currentStep - 1;
    setCurrentStep(prev);
    onStepChange(parsedQuery.steps[prev], prev, parsedQuery);
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 left-6 z-20">
        <button
          onClick={() => setIsOpen(true)}
          className="glass-strong border border-grayzone/20 rounded-xl px-4 py-2.5 flex items-center gap-2 hover:border-stellar-strawberry/40 transition-colors cursor-pointer"
        >
          <span className="text-stellar-strawberry text-sm">▶</span>
          <span className="font-pixel text-[9px] text-siesta-tan">QUERY VIZ</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 w-[360px] z-20 glass-strong border border-grayzone/20 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-grayzone/20">
        <span className="font-pixel text-[10px] text-stellar-strawberry">QUERY VISUALIZER</span>
        <button onClick={handleClose} className="text-grayzone hover:text-siesta-tan font-pixel text-[9px]">✕</button>
      </div>
      
      <div className="p-3 border-b border-grayzone/20">
        <textarea
          value={query}
          onChange={e => { setQuery(e.target.value); setParsedQuery(null); setCurrentStep(-1); setError(null); }}
          placeholder={"SELECT *\nFROM users\nINNER JOIN posts ON posts.author_id = users.id"}
          rows={5}
          className="w-full glass border border-grayzone/30 rounded-lg p-2.5 font-mono text-[10px] text-siesta-tan placeholder:text-grayzone/40 resize-none focus:outline-none focus:border-stellar-strawberry transition-colors bg-transparent no-scrollbar"
          disabled={isPlaying}
        />
        {error && (
          <p className="text-stellar-strawberry text-[9px] mt-1.5 font-pixel">{error}</p>
        )}
        
        <div className="flex items-center gap-2 mt-2">
          <span className="font-pixel text-[8px] text-grayzone">SPEED:</span>
          <div className="flex gap-1">
            {SPEED_OPTIONS.map(opt => (
              <button
                key={opt.label}
                onClick={() => setSpeedMs(opt.ms)}
                disabled={isPlaying}
                className={`px-2 py-1 font-pixel text-[7px] rounded transition-colors ${
                  speedMs === opt.ms
                    ? 'bg-stellar-strawberry text-hei-se'
                    : 'text-grayzone hover:text-siesta-tan border border-grayzone/20 hover:border-grayzone/40'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-2">
          <span className="font-pixel text-[8px] text-grayzone">MODE:</span>
          <div className="flex bg-hei-se/50 p-0.5 rounded border border-grayzone/20">
            <button
              onClick={() => setPlayMode('auto')}
              disabled={isPlaying}
              className={`px-2 py-1 font-pixel text-[7px] rounded transition-colors ${
                playMode === 'auto' ? 'bg-stellar-strawberry text-hei-se' : 'text-grayzone hover:text-siesta-tan'
              }`}
            >
              AUTO
            </button>
            <button
              onClick={() => setPlayMode('step')}
              disabled={isPlaying}
              className={`px-2 py-1 font-pixel text-[7px] rounded transition-colors ${
                playMode === 'step' ? 'bg-stellar-strawberry text-hei-se' : 'text-grayzone hover:text-siesta-tan'
              }`}
            >
              STEP
            </button>
          </div>
        </div>

        {parsedQuery && playMode === 'step' ? (
          <div className="flex items-center gap-2 mt-2">
            <PixelButton
              variant="secondary"
              size="sm"
              onClick={handlePrevStep}
              disabled={currentStep <= 0}
            >
              ← PREV
            </PixelButton>
            <span className="font-pixel text-[8px] text-grayzone">
              STEP {currentStep + 1} OF {parsedQuery.steps.length}
            </span>
            <PixelButton
              variant="primary"
              size="sm"
              onClick={handleNextStep}
              disabled={currentStep >= parsedQuery.steps.length - 1}
            >
              NEXT →
            </PixelButton>
            <PixelButton variant="secondary" size="sm" onClick={handleReset}>
              RESET
            </PixelButton>
          </div>
        ) : (
          <div className="flex gap-2 mt-2">
            <PixelButton variant="primary" size="sm" onClick={handleVisualize} disabled={!query.trim() || isPlaying}>
              {isPlaying ? 'PLAYING...' : 'VISUALIZE'}
            </PixelButton>
            {parsedQuery && (
              <PixelButton variant="secondary" size="sm" onClick={handleReset}>
                RESET
              </PixelButton>
            )}
            {!isPlaying && (
              <PixelButton variant="secondary" size="sm" onClick={fillExample}>
                EXAMPLE
              </PixelButton>
            )}
          </div>
        )}
      </div>
      
      {parsedQuery && (
        <div className="flex flex-col overflow-y-auto max-h-[240px] no-scrollbar">
          {parsedQuery.steps.map((step, i) => (
            <div
              key={i}
              ref={i === currentStep ? activeStepRef : null}
              className={`p-3 border-b border-grayzone/10 last:border-0 transition-all duration-300 ${
                i === currentStep
                  ? 'bg-stellar-strawberry/10 border-l-2 border-l-stellar-strawberry'
                  : i < currentStep
                  ? 'opacity-60'
                  : 'opacity-30'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`font-pixel text-[8px] px-1.5 py-0.5 rounded ${
                  step.type === 'FROM'
                    ? 'bg-pico-eggplant/40 text-siesta-tan'
                    : step.joinType?.includes('LEFT')
                    ? 'bg-blue-500/20 text-blue-300'
                    : step.joinType?.includes('RIGHT')
                    ? 'bg-orange-500/20 text-orange-300'
                    : 'bg-stellar-strawberry/20 text-stellar-strawberry'
                }`}>
                  {step.type === 'FROM' ? 'FROM' : step.joinType}
                </span>
                <span className="font-mono text-[10px] text-siesta-tan font-semibold">{step.table}</span>
                {i === currentStep && (
                  <span className="ml-auto w-1.5 h-1.5 bg-stellar-strawberry rounded-full animate-pulse" />
                )}
              </div>
              <p className="text-grayzone text-[9px] leading-relaxed">{step.description}</p>
              {step.onClause && (
                <code className="text-stellar-strawberry/80 text-[8px] font-mono mt-1 block">
                  ON {step.onClause.trim()}
                </code>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
