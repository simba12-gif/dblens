"use client";

import { motion } from "framer-motion";
import PixelButton from "../ui/PixelButton";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Decorative Background Layer (v4): Waves & Outline Icons */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden bg-gradient-to-br from-hei-se to-blue-whale">
        
        {/* --- 1. Flowing Waves at Bottom Edge --- */}
        {/* We use maskImage to ensure the top of the waves fade out softly so they don't impact headline contrast */}
        <div className="absolute bottom-0 left-0 w-full h-[50%] opacity-80" style={{ maskImage: "linear-gradient(to bottom, transparent, black 30%)", WebkitMaskImage: "linear-gradient(to bottom, transparent, black 30%)" }}>
          {/* Back band: Pico Eggplant (darker, lower, wider) */}
          <svg
            className="absolute bottom-0 left-0 w-full h-[80%] text-pico-eggplant opacity-40"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
          >
            <path
              fill="currentColor"
              d="M0,224L80,197.3C160,171,320,117,480,117.3C640,117,800,171,960,192C1120,213,1280,203,1360,197.3L1440,192L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"
            />
          </svg>
          
          {/* Front band: Stellar Strawberry (brighter, slightly overlapping) */}
          <svg
            className="absolute bottom-0 left-0 w-full h-[60%] text-stellar-strawberry opacity-30"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
          >
            <path
              fill="currentColor"
              d="M0,160L80,176C160,192,320,224,480,213.3C640,203,800,149,960,144C1120,139,1280,181,1360,202.7L1440,224L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"
            />
          </svg>
        </div>

        {/* --- 2. Scattered Retro Outline Icons --- */}
        
        {/* Star Outline (Top Left) */}
        <motion.div
          className="absolute top-[15%] left-[10%] text-siesta-tan opacity-20"
          animate={{ y: [0, -10, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </motion.div>

        {/* Zigzag Outline (Middle Left Margin) */}
        <motion.div
          className="absolute top-[45%] left-[6%] text-grayzone opacity-25"
          animate={{ y: [0, 15, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="3 12 9 4 15 20 21 12" />
          </svg>
        </motion.div>

        {/* Tetromino Outline - T Shape (Top Right Margin) */}
        <motion.div
          className="absolute top-[20%] right-[12%] text-siesta-tan opacity-25"
          animate={{ y: [0, 12, 0], rotate: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 4h16v6h-5v10H9V10H4V4z" />
          </svg>
        </motion.div>

        {/* Circle Outline (Middle Right Margin) */}
        <motion.div
          className="absolute top-[50%] right-[8%] text-grayzone opacity-20"
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
          </svg>
        </motion.div>

      </div>

      {/* Floating schema preview decorations */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Floating table card — left */}
        <motion.div
          className="absolute top-1/4 left-[8%] glass-card rounded-xl p-4 w-48 hidden lg:block"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 0.6, x: 0 }}
          transition={{ duration: 1.2, delay: 1 }}
          style={{ animation: "float 6s ease-in-out infinite" }}
        >
          <div className="text-xs font-pixel text-stellar-strawberry mb-2">
            USERS
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-yellow-400">🔑</span>
              <span className="text-siesta-tan/80">id</span>
              <span className="text-grayzone/60 ml-auto">int</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-4" />
              <span className="text-siesta-tan/80">email</span>
              <span className="text-grayzone/60 ml-auto">varchar</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-4" />
              <span className="text-siesta-tan/80">name</span>
              <span className="text-grayzone/60 ml-auto">varchar</span>
            </div>
          </div>
        </motion.div>

        {/* Floating table card — right */}
        <motion.div
          className="absolute top-1/3 right-[8%] glass-card rounded-xl p-4 w-48 hidden lg:block"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 0.6, x: 0 }}
          transition={{ duration: 1.2, delay: 1.5 }}
          style={{
            animation: "float 6s ease-in-out infinite",
            animationDelay: "3s",
          }}
        >
          <div className="text-xs font-pixel text-pico-eggplant mb-2">
            ORDERS
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-yellow-400">🔑</span>
              <span className="text-siesta-tan/80">id</span>
              <span className="text-grayzone/60 ml-auto">int</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-blue-400">🔗</span>
              <span className="text-siesta-tan/80">user_id</span>
              <span className="text-grayzone/60 ml-auto">int</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-4" />
              <span className="text-siesta-tan/80">total</span>
              <span className="text-grayzone/60 ml-auto">decimal</span>
            </div>
          </div>
        </motion.div>

        {/* Animated connection line between cards */}
        <svg
          className="absolute inset-0 w-full h-full hidden lg:block"
          style={{ zIndex: 1 }}
        >
          <motion.line
            x1="22%"
            y1="38%"
            x2="78%"
            y2="42%"
            stroke="#FF5C8D"
            strokeWidth="1.5"
            strokeDasharray="8 4"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.4 }}
            transition={{ duration: 2, delay: 2 }}
          />
        </svg>
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-24">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-stellar-strawberry animate-[pulse-ring_2s_ease-in-out_infinite]" />
          <span className="text-xs text-grayzone">
            Open Source Database Visualization
          </span>
        </motion.div>

        {/* Headline — pixel font */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="font-pixel text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-tight mb-6"
        >
          <span className="text-siesta-tan">SEE YOUR</span>
          <br />
          <span className="text-stellar-strawberry neon-text">DATABASE</span>
          <br />
          <span className="text-siesta-tan">THINK</span>
          <span className="text-stellar-strawberry">.</span>
        </motion.h1>

        {/* Subtitle — body font */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-lg md:text-xl text-grayzone max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Upload a SQL schema and instantly explore an interactive ER diagram.
          Drag, zoom, and discover how your tables connect — in under 60
          seconds.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <PixelButton
            href="/upload"
            variant="primary"
            size="lg"
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            }
          >
            Upload Schema
          </PixelButton>
          <PixelButton href="#features" variant="secondary" size="lg">
            See How It Works
          </PixelButton>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="mt-16 flex items-center justify-center gap-8 md:gap-16"
        >
          {[
            { label: "Parse Time", value: "<1s" },
            { label: "Tables Supported", value: "200+" },
            { label: "SQL Dialects", value: "MySQL & PG" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-pixel text-lg md:text-xl text-stellar-strawberry">
                {stat.value}
              </div>
              <div className="text-xs text-grayzone mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Bottom fade gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-hei-se to-transparent pointer-events-none" />
    </section>
  );
}
