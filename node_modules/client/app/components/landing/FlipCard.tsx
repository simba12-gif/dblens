"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import React from "react";

export interface StepData {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  tags: string[];
}

interface FlipCardProps {
  step: StepData;
  index: number;
  total: number;
}

export default function FlipCard({ step, index, total }: FlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className="relative w-full max-w-[300px] md:w-[260px] h-[360px] cursor-pointer mx-auto group"
      style={{ perspective: "1000px" }}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <motion.div
        className="w-full h-full relative"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* BACK FACE (Default) */}
        <div
          className="absolute inset-0 w-full h-full rounded-xl overflow-hidden border-2 border-transparent transition-all duration-300 group-hover:scale-[1.03] group-hover:border-stellar-strawberry/50"
          style={{
            backfaceVisibility: "hidden",
            backgroundColor: "#142030", // Hei Se Black
            boxShadow: "0 4px 20px rgba(13, 24, 34, 0.8)", // Outer shadow
          }}
        >
          {/* Subtle Grid Pattern */}
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "linear-gradient(#85A3B2 1px, transparent 1px), linear-gradient(90deg, #85A3B2 1px, transparent 1px)",
              backgroundSize: "8px 8px",
            }}
          />

          {/* Corner Brackets */}
          <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-stellar-strawberry" />
          <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-stellar-strawberry" />
          <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-stellar-strawberry" />
          <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-stellar-strawberry" />

          {/* Center Logo Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-pico-eggplant opacity-40 font-pixel text-4xl uppercase tracking-widest">
              DBLENS
            </div>
          </div>

          {/* Bottom Label */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-2">
            <span className="font-pixel text-[10px] text-grayzone transition-colors duration-300 group-hover:text-siesta-tan">
              CLICK TO REVEAL
            </span>
            <span className="w-1.5 h-3 bg-grayzone group-hover:bg-siesta-tan animate-[pulse_1s_ease-in-out_infinite]" />
          </div>
        </div>

        {/* FRONT FACE (Revealed) */}
        <div
          className="absolute inset-0 w-full h-full rounded-xl overflow-hidden border-2 border-stellar-strawberry flex flex-col"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: "linear-gradient(to bottom, #1E3442, #142030)",
            boxShadow: "0 8px 30px rgba(13, 24, 34, 0.9)",
          }}
        >
          {/* Top Bar */}
          <div className="h-10 w-full bg-pico-eggplant flex items-center justify-between px-3 border-b border-stellar-strawberry/20 shrink-0">
            <div className="font-pixel text-[10px] text-siesta-tan tracking-wider">
              STEP {step.number}
            </div>
            {/* Progress Pips */}
            <div className="flex gap-1.5">
              {Array.from({ length: total }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-sm ${
                    i <= index
                      ? "bg-stellar-strawberry shadow-[0_0_8px_rgba(255,92,141,0.6)]"
                      : "border border-grayzone/50 bg-transparent"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Front Corner Brackets */}
          <div className="absolute top-12 left-2 w-2 h-2 border-t border-l border-stellar-strawberry" />
          <div className="absolute top-12 right-2 w-2 h-2 border-t border-r border-stellar-strawberry" />
          
          {/* Main Body */}
          <div className="flex-1 relative p-4 flex flex-col items-center justify-center pt-2">
            {/* Center Icon & Glow */}
            <div className="relative mb-4 flex items-center justify-center">
              <div className="absolute w-[100px] h-[100px] bg-stellar-strawberry/10 rounded-full blur-xl" />
              <div className="relative w-12 h-12 text-stellar-strawberry drop-shadow-[0_0_12px_rgba(255,92,141,0.4)]">
                {step.icon}
              </div>
            </div>

            {/* Title */}
            <h3 className="font-pixel text-[16px] text-siesta-tan uppercase tracking-[4px] mb-3">
              {step.title}
            </h3>

            {/* Divider */}
            <div className="w-4/5 h-px bg-grayzone/30 mb-3" />

            {/* Description */}
            <p className="text-grayzone text-[12px] text-center leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Bottom Metadata Row */}
          <div className="h-12 w-full px-3 flex items-center justify-between shrink-0">
            <div className="flex gap-1 flex-wrap">
              {step.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-hei-se border border-grayzone/30 text-grayzone text-[9px] rounded-sm font-sans tracking-wide uppercase"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="font-pixel text-[9px] text-grayzone/60 ml-1">
              {step.number}/{total < 10 ? `0${total}` : total}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
