"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/landing/Navbar";
import GlassCard from "../components/ui/GlassCard";
import PixelButton from "../components/ui/PixelButton";
import {
  parseSqlContent,
  parseJsonContent,
  uploadSchemaFile,
  connectDatabase,
} from "../lib/api";

type Tab = "file" | "paste" | "connect";
type PasteFormat = "sql" | "json";

export default function UploadPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>("file");
  const [pasteFormat, setPasteFormat] = useState<PasteFormat>("sql");
  const [pasteContent, setPasteContent] = useState("");
  const [connectionString, setConnectionString] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<{
    message: string;
    suggestion?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleParse = async () => {
    setIsParsing(true);
    setError(null);

    try {
      let res;
      if (activeTab === "file") {
        if (!selectedFile) return;
        res = await uploadSchemaFile(selectedFile);
      } else if (activeTab === "paste") {
        if (!pasteContent.trim()) return;
        res =
          pasteFormat === "sql"
            ? await parseSqlContent(pasteContent)
            : await parseJsonContent(pasteContent);
      } else if (activeTab === "connect") {
        if (!connectionString.trim()) return;
        res = await connectDatabase(connectionString);
      }

      if (res.success && res.data) {
        localStorage.setItem("dblens:schema", JSON.stringify(res.data));
        router.push("/visualize");
      } else {
        setError({
          message: res.error?.message || "An unknown error occurred.",
          suggestion: res.error?.suggestion,
        });
      }
    } catch (err: any) {
      setError({
        message: err.message || "Failed to connect to the server.",
      });
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <main className="min-h-screen bg-hei-se bg-grid relative flex flex-col">
      <Navbar hideCta />

      <div className="flex-grow flex items-center justify-center p-6">
        <div className="w-full max-w-[560px] animate-fade-in">
          
          {/* Tabs */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <PixelButton
              variant={activeTab === "file" ? "primary" : "secondary"}
              size="md"
              onClick={() => {
                setActiveTab("file");
                setError(null);
              }}
            >
              UPLOAD FILE
            </PixelButton>
            <PixelButton
              variant={activeTab === "paste" ? "primary" : "secondary"}
              size="md"
              onClick={() => {
                setActiveTab("paste");
                setError(null);
              }}
            >
              PASTE SQL / JSON
            </PixelButton>
            <PixelButton
              variant={activeTab === "connect" ? "primary" : "secondary"}
              size="md"
              onClick={() => {
                setActiveTab("connect");
                setError(null);
              }}
            >
              CONNECT DB
            </PixelButton>
          </div>

          {/* Main Area */}
          <div className="relative">
            
            {/* File Tab */}
            {activeTab === "file" && (
              <GlassCard
                className={`relative h-[220px] flex flex-col items-center justify-center p-6 transition-all duration-300 border-2 border-dashed cursor-pointer ${
                  isDragging
                    ? "border-stellar-strawberry neon-border bg-stellar-strawberry/5"
                    : selectedFile
                    ? "border-stellar-strawberry/50 bg-pico-eggplant/10"
                    : "border-grayzone/50 hover:border-stellar-strawberry hover:bg-pico-eggplant/5"
                }`}
                onClick={() => !isParsing && fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".sql,.ddl,.json"
                  disabled={isParsing}
                />

                {selectedFile ? (
                  <div className="flex flex-col items-center gap-2 animate-slide-up">
                    <span className="text-4xl">✓</span>
                    <p className="font-pixel text-[11px] text-stellar-strawberry">
                      {selectedFile.name}
                    </p>
                    <div className="flex gap-2 text-xs text-grayzone mt-2">
                      <span className="bg-hei-se px-2 py-0.5 rounded font-mono">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </span>
                      <span className="bg-hei-se px-2 py-0.5 rounded font-mono uppercase">
                        {selectedFile.name.split('.').pop()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 pointer-events-none">
                    <div className="w-12 h-12 rounded-full bg-pico-eggplant/30 flex items-center justify-center text-stellar-strawberry animate-float">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                    <p className="font-pixel text-[11px] text-siesta-tan uppercase tracking-wider">
                      Drop your schema here
                    </p>
                    <p className="text-grayzone text-xs">
                      Supports .sql, .ddl, .json — max 5MB
                    </p>
                  </div>
                )}
              </GlassCard>
            )}

            {/* Paste Tab */}
            {activeTab === "paste" && (
              <div className="flex flex-col gap-4 animate-fade-in">
                <textarea
                  className="w-full min-h-[240px] glass p-4 border border-grayzone/30 rounded-xl font-mono text-sm text-siesta-tan resize-y focus:outline-none focus:border-stellar-strawberry focus:ring-1 focus:ring-stellar-strawberry transition-all bg-transparent"
                  placeholder="-- Paste your CREATE TABLE statements here..."
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  disabled={isParsing}
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-grayzone font-pixel uppercase">Format:</span>
                  <div className="flex bg-pico-eggplant/30 p-1 rounded-lg border border-grayzone/20">
                    <button
                      className={`px-3 py-1 text-[10px] font-pixel rounded uppercase transition-colors ${pasteFormat === 'sql' ? 'bg-stellar-strawberry text-hei-se' : 'text-grayzone hover:text-siesta-tan'}`}
                      onClick={() => setPasteFormat('sql')}
                      disabled={isParsing}
                    >
                      SQL
                    </button>
                    <button
                      className={`px-3 py-1 text-[10px] font-pixel rounded uppercase transition-colors ${pasteFormat === 'json' ? 'bg-stellar-strawberry text-hei-se' : 'text-grayzone hover:text-siesta-tan'}`}
                      onClick={() => setPasteFormat('json')}
                      disabled={isParsing}
                    >
                      JSON
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Connect Tab */}
            {activeTab === "connect" && (
              <div className="flex flex-col gap-4 animate-fade-in">
                {/* Connection string input */}
                <div className="flex flex-col gap-2">
                  <label className="font-pixel text-[9px] text-grayzone uppercase">
                    PostgreSQL Connection String
                  </label>
                  <input
                    type="text"
                    className="w-full glass p-4 border border-grayzone/30 rounded-xl font-mono text-sm text-siesta-tan focus:outline-none focus:border-stellar-strawberry focus:ring-1 focus:ring-stellar-strawberry transition-all bg-transparent"
                    placeholder="postgresql://user:password@host:5432/database"
                    value={connectionString}
                    onChange={(e) => setConnectionString(e.target.value)}
                    disabled={isParsing}
                    spellCheck={false}
                    autoComplete="off"
                  />
                </div>

                {/* Format hint */}
                <div className="glass rounded-lg px-4 py-3 border border-grayzone/20">
                  <p className="font-pixel text-[8px] text-grayzone mb-2 uppercase">Format</p>
                  <p className="font-mono text-[10px] text-stellar-strawberry">
                    postgresql://[user]:[password]@[host]:[port]/[database]
                  </p>
                  <p className="text-grayzone text-[10px] mt-2">
                    Only PostgreSQL is supported. Your credentials are never stored.
                  </p>
                </div>

                {/* SSL note */}
                <p className="text-grayzone text-[10px] text-center">
                  🔒 Connection is established server-side. SSL is enabled with self-signed cert support.
                </p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <GlassCard className="mt-6 border-pico-eggplant animate-slide-up" glow>
                <div className="p-4 flex flex-col items-center text-center">
                  <div className="text-stellar-strawberry text-2xl mb-2">⚠</div>
                  <p className="text-siesta-tan text-sm mb-1">{error.message}</p>
                  {error.suggestion && (
                    <p className="text-grayzone text-xs mb-4">{error.suggestion}</p>
                  )}
                  <PixelButton variant="secondary" size="sm" onClick={() => setError(null)}>
                    TRY AGAIN
                  </PixelButton>
                </div>
              </GlassCard>
            )}

            {/* Action Area */}
            <div className="mt-8 flex flex-col items-center">
              {isParsing ? (
                <div className="flex flex-col items-center gap-3">
                  <p className="font-pixel text-stellar-strawberry text-lg animate-neon-flicker">
                    {activeTab === "connect" ? "CONNECTING..." : "PARSING..."}
                  </p>
                  <p className="text-grayzone text-xs">
                    {activeTab === "connect" ? "Introspecting live schema..." : "Extracting tables, columns, and relationships..."}
                  </p>
                </div>
              ) : (
                !error && (
                  <PixelButton
                    variant="primary"
                    size="lg"
                    onClick={handleParse}
                    disabled={
                      (activeTab === "file" && !selectedFile) ||
                      (activeTab === "paste" && !pasteContent.trim()) ||
                      (activeTab === "connect" && !connectionString.trim())
                    }
                  >
                    PARSE SCHEMA →
                  </PixelButton>
                )
              )}
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
