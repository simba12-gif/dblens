"use client";

import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Upload",
    description:
      "Drop a .sql file or paste your DDL directly. We support MySQL, PostgreSQL, and JSON schema formats.",
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Parse",
    description:
      "Our engine extracts every table, column, data type, primary key, and foreign key relationship in under a second.",
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
        <line x1="14" y1="4" x2="10" y2="20" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Explore",
    description:
      "Interact with a beautiful ER diagram. Click tables to highlight relationships. Drag to rearrange. Discover insights.",
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <line x1="11" y1="8" x2="11" y2="14" />
        <line x1="8" y1="11" x2="14" y2="11" />
      </svg>
    ),
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.25 },
  },
};

const stepVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: "easeOut" as const },
  },
};

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-32 px-6">
      {/* Background accent */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-stellar-strawberry/5 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="font-pixel text-xl md:text-2xl text-siesta-tan mb-4">
            HOW IT WORKS
          </h2>
          <p className="text-grayzone text-lg max-w-lg mx-auto">
            From SQL file to interactive diagram in three simple steps.
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="relative"
        >
          {/* Connector line */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-px -translate-y-1/2">
            <motion.div
              className="h-full bg-gradient-to-r from-stellar-strawberry/0 via-stellar-strawberry/40 to-stellar-strawberry/0 neon-line"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, delay: 0.5 }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                variants={stepVariants}
                className="relative flex flex-col items-center text-center"
              >
                {/* Step circle */}
                <div className="relative mb-6">
                  <motion.div
                    className="w-20 h-20 rounded-2xl glass-card flex items-center justify-center text-stellar-strawberry"
                    whileHover={{
                      boxShadow:
                        "0 0 30px rgba(255, 92, 141, 0.3), 0 0 60px rgba(255, 92, 141, 0.1)",
                    }}
                  >
                    {step.icon}
                  </motion.div>
                  {/* Number badge */}
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-lg bg-stellar-strawberry flex items-center justify-center">
                    <span className="font-pixel text-[10px] text-white">
                      {step.number}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <h3 className="font-pixel text-sm text-siesta-tan mb-3">
                  {step.title.toUpperCase()}
                </h3>
                <p className="text-grayzone text-sm leading-relaxed max-w-xs">
                  {step.description}
                </p>

                {/* Mobile connector arrow */}
                {index < steps.length - 1 && (
                  <div className="md:hidden mt-8 text-stellar-strawberry/40">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 5v14M5 12l7 7 7-7" />
                    </svg>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
