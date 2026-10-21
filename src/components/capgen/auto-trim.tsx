"use client";

import { motion } from "framer-motion";
import { Scissors, Volume2, Repeat, Pause, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const CUTS = [
  { icon: <Pause className="size-4" />, label: "Silences", desc: "Dead air over 0.4s" },
  { icon: <Sparkles className="size-4" />, label: "Filler words", desc: "um, uh, matlab, like" },
  { icon: <Repeat className="size-4" />, label: "Repeated takes", desc: "Keep the best one" },
  { icon: <Volume2 className="size-4" />, label: "Stutters", desc: "Smooth out the rough" },
];

export function AutoTrim() {
  return (
    <section id="auto-trim" className="scroll-mt-20 bg-[#0d0d0d] py-16 sm:py-24">
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#3d2410] bg-[#141414] px-3 py-1 text-xs font-semibold text-[#FF6B1A]">
            <Scissors className="size-3.5" />
            Auto Trim
          </div>
          <h2 className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
            It cuts the bluff.{" "}
            <span className="capgen-gradient-text">Keeps the best take.</span>
          </h2>
          <p className="mt-4 text-base text-[#a0a0a0]">
            CapGen listens to the speech — not the waveform — and surgically removes
            silences, filler words, false starts and repeated takes. Every cut is shown
            in the timeline. One click restores.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {CUTS.map((c) => (
              <div
                key={c.label}
                className="rounded-xl border border-[#3d2410] bg-[#141414] p-4 shadow-sm"
              >
                <div className="flex items-center gap-2 text-[#FF6B1A]">
                  <span className="grid size-7 place-items-center rounded-md bg-[#2a1a0d]">
                    {c.icon}
                  </span>
                  <span className="text-sm font-bold text-white">{c.label}</span>
                </div>
                <p className="mt-2 text-xs text-[#888888]">{c.desc}</p>
              </div>
            ))}
          </div>

          <p className="mt-5 text-sm italic text-[#888888]">
            Auto Trim works from speech. Talks, vlogs, lectures, podcasts — anything spoken.
          </p>
        </motion.div>

        {/* Visual comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative"
        >
          <div className="overflow-hidden rounded-3xl border border-[#2a2a2a] bg-[#141414] p-5 shadow-[0_30px_80px_-30px_rgba(255,107,26,0.25)]">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-md bg-[#FF6B1A] text-white">
                  <Scissors className="size-4" />
                </span>
                <span className="text-sm font-bold text-white">Auto Trim timeline</span>
              </div>
              <span className="rounded-full bg-[#2a1a0d] px-2 py-0.5 text-[10px] font-bold uppercase text-[#FF6B1A]">
                live
              </span>
            </div>

            {/* Raw take */}
            <div className="mb-4">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-semibold text-[#a0a0a0]">Raw take</span>
                <span className="font-mono text-[#888888]">04:12</span>
              </div>
              <div className="flex h-9 overflow-hidden rounded-md bg-[#1A1A1A]">
                {[
                  { w: "12%", c: "bg-[#FF6B1A]" },
                  { w: "8%", c: "bg-[#3a3a3a]" },
                  { w: "20%", c: "bg-[#FF6B1A]" },
                  { w: "10%", c: "bg-[#3a3a3a]" },
                  { w: "6%", c: "bg-[#FF6B1A]" },
                  { w: "14%", c: "bg-[#3a3a3a]" },
                  { w: "30%", c: "bg-[#FF6B1A]" },
                ].map((b, i) => (
                  <div key={i} className={`${b.c} h-full`} style={{ width: b.w }} />
                ))}
              </div>
              <div className="mt-1 flex gap-2 text-[10px] text-[#9a9a9a]">
                <span>● speech</span>
                <span className="opacity-50">● silence / filler</span>
              </div>
            </div>

            {/* Arrow */}
            <div className="mb-3 flex items-center justify-center gap-2 text-xs font-semibold text-[#FF6B1A]">
              <span>auto trim</span>
              <span className="text-base">↓</span>
            </div>

            {/* After trim */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-semibold text-[#FF6B1A]">After CapGen</span>
                <span className="font-mono font-bold text-[#FF6B1A]">02:47</span>
              </div>
              <div className="flex h-9 overflow-hidden rounded-md bg-gradient-to-r from-[#FF6B1A] to-[#FFB27A]">
                <div className="h-full w-[28%] bg-[#FF6B1A]" />
                <div className="h-full w-[44%] bg-[#FF8A45]" />
                <div className="h-full w-[28%] bg-[#FF6B1A]" />
              </div>
            </div>

            {/* Stats */}
            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[#2a2a2a] pt-4 text-center">
              <div>
                <div className="text-lg font-extrabold text-[#FF6B1A]">1m 25s</div>
                <div className="text-[10px] uppercase tracking-wide text-[#9a9a9a]">trimmed</div>
              </div>
              <div>
                <div className="text-lg font-extrabold text-[#FF6B1A]">28</div>
                <div className="text-[10px] uppercase tracking-wide text-[#9a9a9a]">cuts made</div>
              </div>
              <div>
                <div className="text-lg font-extrabold text-[#FF6B1A]">0</div>
                <div className="text-[10px] uppercase tracking-wide text-[#9a9a9a]">speech lost</div>
              </div>
            </div>

            <Button
              onClick={() => {
                const el = document.getElementById("studio");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="mt-5 w-full bg-[#FF6B1A] text-white hover:bg-[#E55A0E]"
            >
              Try it on your clip
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
