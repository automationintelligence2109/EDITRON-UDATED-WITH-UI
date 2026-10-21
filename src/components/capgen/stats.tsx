"use client";

import { motion } from "framer-motion";

const STATS = [
  { value: "82", label: "languages supported", sub: "14 Indian · 68 international" },
  { value: "14", label: "Indian languages", sub: "native script or Roman" },
  { value: "1,942", label: "caption fonts", sub: "add your own" },
  { value: "2", label: "editor plugins", sub: "Premiere Pro & After Effects" },
];

export function Stats() {
  return (
    <section className="bg-[#0a0a0a] py-12 sm:py-16">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-5 text-center shadow-sm transition-all hover:border-[#FF6B1A]/30 hover:shadow-md sm:p-6"
            >
              <div className="text-3xl font-extrabold text-[#FF6B1A] sm:text-4xl">
                {s.value}
              </div>
              <div className="mt-1 text-sm font-semibold text-white">{s.label}</div>
              <div className="mt-1 text-xs text-[#888888]">{s.sub}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
