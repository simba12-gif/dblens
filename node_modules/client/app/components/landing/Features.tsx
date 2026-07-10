"use client";

import { useState, useRef } from "react";
import { motion, useScroll, MotionValue, useMotionValueEvent } from "framer-motion";

const features = [
  {
    title: "Interactive ER Diagrams",
    description: "Drag, zoom, and click through your schema as an interactive visual map. Highlight relationships with a single click.",
  },
  {
    title: "Smart Schema Parsing",
    description: "Drop in a .sql file or paste DDL directly. Our parser extracts tables, columns, keys, and relationships instantly.",
  },
  {
    title: "Database Insights",
    description: "Auto-generated analytics: centrality scores, orphan tables, type distributions, and optimization hints at a glance.",
  },
  {
    title: "Drag & Explore",
    description: "Reposition tables freely on the canvas. Your layout persists across sessions — pick up right where you left off.",
  },
];

// Curve settings for a 160x2400 viewBox SVG
function getCurveX(t: number) {
  // Quadratic bezier X(t) = (1-t)^2 * X0 + 2(1-t)t * X1 + t^2 * X2
  const x0 = 40, x1 = 260, x2 = 40;
  return Math.pow(1 - t, 2) * x0 + 2 * (1 - t) * t * x1 + Math.pow(t, 2) * x2;
}

// Fixed thresholds (t values) for the 4 nodes along the curve
const thresholds = [0.15, 0.38, 0.62, 0.85];

function NodeAndText({ 
  feature, 
  progress, 
  threshold, 
  nextThreshold, 
  t 
}: { 
  feature: any; 
  progress: MotionValue<number>; 
  threshold: number; 
  nextThreshold: number;
  t: number;
}) {
  const [state, setState] = useState<"hidden" | "active" | "past">("hidden");

  useMotionValueEvent(progress, "change", (latest) => {
    if (latest < threshold) {
      if (state !== "hidden") setState("hidden");
    } else if (latest >= threshold && latest < nextThreshold) {
      if (state !== "active") setState("active");
    } else {
      if (state !== "past") setState("past");
    }
  });

  const isLit = state === "active" || state === "past";
  const xPos = (getCurveX(t) / 160) * 100; // Percentage of the 160px viewBox

  return (
    <div 
      className="absolute flex items-center"
      style={{ top: `${t * 100}%`, left: `${xPos}%`, transform: 'translateY(-50%)' }}
    >
      {/* Node Dot (Centered strictly on the curve path) */}
      <div 
        className="absolute w-4 h-4 -translate-x-1/2 flex items-center justify-center"
      >
        {/* Unlit State */}
        <motion.div
          className="absolute w-full h-full rounded-full bg-grayzone/30"
          initial={false}
          animate={{ opacity: isLit ? 0 : 1 }}
        />
        {/* Lit State */}
        <motion.div
          className="absolute w-full h-full rounded-full bg-stellar-strawberry flex items-center justify-center"
          initial={false}
          animate={{ 
            opacity: isLit ? 1 : 0, 
            boxShadow: isLit ? "0 0 12px rgba(255, 92, 141, 0.8)" : "none" 
          }}
        >
          <div className="w-[4px] h-[4px] bg-white rounded-full" />
        </motion.div>
        {/* Pulse Ring */}
        <motion.div
          className="absolute w-full h-full rounded-full border border-stellar-strawberry"
          initial={false}
          animate={isLit ? { scale: [1, 1.5, 1], opacity: [0.8, 0, 0.8] } : { scale: 1, opacity: 0 }}
          transition={isLit ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : { duration: 0 }}
        />
      </div>

      {/* Feature Text (Follows the curve perfectly, centered vertically with the node) */}
      <motion.div
        className="ml-8 md:ml-16 w-[240px] sm:w-[300px] md:w-[320px]"
        initial={false}
        animate={{
          opacity: state === "active" ? 1 : 0,
          y: state === "hidden" ? 30 : state === "past" ? -30 : 0,
          scale: state === "active" ? 1 : 0.95,
          filter: state === "active" ? "blur(0px)" : "blur(8px)",
          pointerEvents: state === "active" ? "auto" : "none"
        }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <h3 className="text-lg md:text-2xl font-pixel text-stellar-strawberry mb-2 md:mb-3 leading-tight drop-shadow-[0_0_8px_rgba(255,92,141,0.5)]">
          {feature.title}
        </h3>
        <p className="text-grayzone text-sm md:text-base leading-relaxed">
          {feature.description}
        </p>
      </motion.div>
    </div>
  );
}

export default function Features() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  });

  return (
    <section id="features" className="relative bg-transparent">
      {/* Section header (Sticky at top of section) */}
      <div className="pt-32 pb-8 px-6 relative z-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-pixel text-xl md:text-2xl text-siesta-tan mb-4">
            BUILT FOR DEVELOPERS
          </h2>
          <p className="text-grayzone text-lg max-w-xl mx-auto">
            Everything you need to understand complex database schemas — without
            reading raw SQL.
          </p>
        </motion.div>
      </div>

      {/* The Scroll Journey Container */}
      <div ref={containerRef} className="relative h-[250vh] max-w-7xl mx-auto overflow-hidden">
        
        {/* The Curved SVG Path Container & Moon Background */}
        <div className="absolute top-0 bottom-0 left-0 md:left-[5%] w-[80px] sm:w-[200px] md:w-[280px] pointer-events-none z-10">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 160 2400" preserveAspectRatio="none">
            <defs>
              <linearGradient id="moon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#732553" />
                <stop offset="100%" stopColor="#0a1219" />
              </linearGradient>
              <pattern id="moon-dots" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="2" fill="#ffffff" opacity="0.1" />
              </pattern>
            </defs>

            {/* Moon Base Area */}
            <path
              d="M -4000 0 L 40 0 Q 260 1200 40 2400 L -4000 2400 Z"
              fill="url(#moon-grad)"
            />
            
            {/* Moon Dots Pattern Overlay */}
            <path
              d="M -4000 0 L 40 0 Q 260 1200 40 2400 L -4000 2400 Z"
              fill="url(#moon-dots)"
              style={{ mixBlendMode: 'overlay' }}
            />

            {/* Base Unlit Path */}
            <path
              d="M 40 0 Q 260 1200 40 2400"
              fill="none"
              stroke="#85A3B2"
              strokeOpacity="0.2"
              strokeWidth="4"
              strokeDasharray="8 8"
            />
            {/* Animated Lit Path */}
            <motion.path
              d="M 40 0 Q 260 1200 40 2400"
              fill="none"
              stroke="#FF5C8D"
              strokeWidth="4"
              style={{
                pathLength: scrollYProgress,
                filter: "drop-shadow(0 0 8px #FF5C8D)",
              }}
            />
          </svg>

          {/* Nodes & Text mapped directly to the curve */}
          {features.map((feature, index) => {
            const t = thresholds[index];
            // Next threshold (if last, cap at 1.1 so it stays active until you finish scrolling)
            const nextThreshold = index < features.length - 1 ? thresholds[index + 1] : 1.1;

            return (
              <NodeAndText
                key={feature.title}
                feature={feature}
                progress={scrollYProgress}
                threshold={t}
                nextThreshold={nextThreshold}
                t={t}
              />
            );
          })}
        </div>

        {/* --- Subtle Floating Background Accents (From Hero) --- */}
        <motion.div className="hidden md:block absolute top-[15%] right-[15%] text-stellar-strawberry opacity-20 pointer-events-none" animate={{ y: [0, 15, 0], rotate: [0, 10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
             <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </motion.div>
        
        <motion.div className="hidden md:block absolute top-[35%] right-[8%] text-cyan-400 opacity-20 pointer-events-none" animate={{ y: [0, -20, 0] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
             <circle cx="12" cy="12" r="10" strokeDasharray="4 4" />
          </svg>
        </motion.div>
        
        <motion.div className="hidden md:block absolute top-[60%] right-[20%] text-yellow-400 opacity-15 pointer-events-none" animate={{ y: [0, 15, 0], rotate: [0, -10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
             <path d="M4 4h16v6h-5v10H9V10H4V4z" />
          </svg>
        </motion.div>
        
        <motion.div className="hidden md:block absolute top-[85%] right-[12%] text-siesta-tan opacity-20 pointer-events-none" animate={{ y: [0, -15, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
             <polyline points="3 12 9 4 15 20 21 12" />
          </svg>
        </motion.div>

        {/* Pixel Crosses */}
        <motion.div className="hidden md:block absolute top-[25%] right-[25%] text-stellar-strawberry opacity-30 pointer-events-none" animate={{ y: [0, -8, 0], rotate: [0, 90, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
          <div className="relative w-6 h-6">
            <div className="absolute top-1/2 left-0 w-full h-1.5 bg-current -translate-y-1/2"></div>
            <div className="absolute left-1/2 top-0 w-1.5 h-full bg-current -translate-x-1/2"></div>
          </div>
        </motion.div>

        <motion.div className="hidden md:block absolute top-[50%] right-[30%] text-cyan-400 opacity-20 pointer-events-none" animate={{ y: [0, 12, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}>
          <div className="relative w-5 h-5">
            <div className="absolute top-1/2 left-0 w-full h-1.5 bg-current -translate-y-1/2"></div>
            <div className="absolute left-1/2 top-0 w-1.5 h-full bg-current -translate-x-1/2"></div>
          </div>
        </motion.div>


      </div>
      
      {/* Bottom fade gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-hei-se to-transparent pointer-events-none z-20" />
    </section>
  );
}
