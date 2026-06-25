"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative border-t border-grayzone/10">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo + tagline */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-lg bg-stellar-strawberry/20 border border-stellar-strawberry/40 flex items-center justify-center group-hover:shadow-[0_0_15px_rgba(255,92,141,0.3)] transition-all duration-300">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-stellar-strawberry"
                >
                  <circle
                    cx="12"
                    cy="8"
                    r="5"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <ellipse
                    cx="12"
                    cy="12"
                    rx="9"
                    ry="4"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <ellipse
                    cx="12"
                    cy="17"
                    rx="9"
                    ry="4"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <span className="font-pixel text-xs text-siesta-tan">DBLENS</span>
            </Link>
            <p className="text-grayzone text-sm">See your database think.</p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-8">
            <a
              href="https://github.com/simba12-gif/dblens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-grayzone hover:text-siesta-tan transition-colors duration-200 text-sm inline-flex items-center gap-2"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </a>
            <Link
              href="/upload"
              className="text-grayzone hover:text-stellar-strawberry transition-colors duration-200 text-sm"
            >
              Get Started →
            </Link>
          </div>
        </div>

        {/* Bottom bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-8 pt-6 border-t border-grayzone/10 text-center"
        >
          <p className="text-grayzone/60 text-xs">
            © {new Date().getFullYear()} DBLens. Open source under MIT License.
          </p>
        </motion.div>
      </div>
    </footer>
  );
}
