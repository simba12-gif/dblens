"use client";

import { motion } from "framer-motion";
import GlassCard from "../ui/GlassCard";

const features = [
  {
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <path d="M10 6.5h4M6.5 10v4M17.5 10v4M10 17.5h4" />
      </svg>
    ),
    title: "Interactive ER Diagrams",
    description:
      "Drag, zoom, and click through your schema as an interactive visual map. Highlight relationships with a single click.",
    accent: "stellar-strawberry",
  },
  {
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M8 13h2M8 17h2M12 13h4M12 17h4" />
      </svg>
    ),
    title: "Smart Schema Parsing",
    description:
      "Drop in a .sql file or paste DDL directly. Our parser extracts tables, columns, keys, and relationships instantly.",
    accent: "pico-eggplant",
  },
  {
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
        <path d="M22 12A10 10 0 0 0 12 2v10z" />
      </svg>
    ),
    title: "Database Insights",
    description:
      "Auto-generated analytics: centrality scores, orphan tables, type distributions, and optimization hints at a glance.",
    accent: "stellar-strawberry",
  },
  {
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 9l4-4 4 4" />
        <path d="M9 5v12a3 3 0 0 0 3 3h7" />
        <path d="M19 15l-4 4-4-4" />
      </svg>
    ),
    title: "Drag & Explore",
    description:
      "Reposition tables freely on the canvas. Your layout persists across sessions — pick up right where you left off.",
    accent: "pico-eggplant",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

export default function Features() {
  return (
    <section id="features" className="relative py-32 px-6">
      {/* Background accent */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-pico-eggplant/8 blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-pixel text-xl md:text-2xl text-siesta-tan mb-4">
            BUILT FOR DEVELOPERS
          </h2>
          <p className="text-grayzone text-lg max-w-xl mx-auto">
            Everything you need to understand complex database schemas — without
            reading raw SQL.
          </p>
        </motion.div>

        {/* Feature cards grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {features.map((feature) => (
            <motion.div key={feature.title} variants={itemVariants}>
              <GlassCard className="h-full">
                <div className="flex items-start gap-4">
                  <div
                    className={`
                    flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center
                    ${
                      feature.accent === "stellar-strawberry"
                        ? "bg-stellar-strawberry/10 text-stellar-strawberry"
                        : "bg-pico-eggplant/20 text-pico-eggplant"
                    }
                  `}
                  >
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-siesta-tan mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-grayzone text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
