'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ReactFlowProvider } from '@xyflow/react';
import { fetchSharedSchema } from '../../lib/api';
import { SchemaGraph } from '../../lib/types';
import { VisualizeCanvas } from '../../visualize/page';

export default function SharedPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [graphData, setGraphData] = useState<SchemaGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ createdAt: string; expiresAt: string; viewCount: number } | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchSharedSchema(id as string)
      .then(res => {
        if (res.success && res.data) {
          setGraphData(res.data.graph);
          setMeta({
            createdAt: res.data.createdAt,
            expiresAt: res.data.expiresAt,
            viewCount: res.data.viewCount,
          });
        } else {
          setError(res.error?.message || 'Share link not found.');
        }
      })
      .catch(() => setError('Failed to load shared schema.'));
  }, [id]);

  // Loading state
  if (!graphData && !error) {
    return (
      <main className="w-screen h-screen bg-hei-se flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="font-pixel text-stellar-strawberry text-sm animate-neon-flicker">
            LOADING SCHEMA...
          </p>
          <p className="text-grayzone text-xs">Fetching shared diagram</p>
        </div>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className="w-screen h-screen bg-hei-se flex items-center justify-center">
        <div className="glass-card rounded-2xl p-8 max-w-sm text-center flex flex-col gap-4">
          <span className="text-stellar-strawberry text-3xl">⚠</span>
          <p className="font-pixel text-[10px] text-siesta-tan">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="font-pixel text-[9px] text-grayzone hover:text-stellar-strawberry transition-colors"
          >
            ← BACK TO HOME
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="w-screen h-screen bg-hei-se flex flex-col overflow-hidden">
      {/* Read-only banner */}
      <div className="flex-shrink-0 h-8 glass-strong border-b border-grayzone/20 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <span className="font-pixel text-[8px] text-stellar-strawberry">DBLENS</span>
          <span className="text-grayzone/40 text-[10px]">·</span>
          <span className="font-pixel text-[8px] text-grayzone">SHARED DIAGRAM</span>
          <span className="bg-pico-eggplant/40 text-grayzone text-[8px] font-pixel px-2 py-0.5 rounded">
            READ ONLY
          </span>
        </div>
        <div className="flex items-center gap-4">
          {meta && (
            <span className="text-grayzone text-[9px]">
              {meta.viewCount} views · expires {new Date(meta.expiresAt).toLocaleDateString()}
            </span>
          )}
          <button
            onClick={() => router.push('/upload')}
            className="font-pixel text-[8px] text-stellar-strawberry hover:brightness-110 transition-all"
          >
            TRY WITH YOUR SCHEMA →
          </button>
        </div>
      </div>

      <div className="flex-grow relative">
        <ReactFlowProvider>
          <VisualizeCanvas graphData={graphData} readOnly />
        </ReactFlowProvider>
      </div>
    </main>
  );
}
