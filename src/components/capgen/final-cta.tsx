"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-[#0a0a0a] py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 capgen-radial-orange" />
      <div className="pointer-events-none absolute -bottom-32 left-1/2 h-64 w-[40rem] -translate-x-1/2 rounded-full bg-[#FF6B1A]/15 blur-3xl" />

      <div className="relative mx-auto w-full max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#3d2410] bg-[#2a1a0d] px-3 py-1 text-xs font-semibold text-[#FF6B1A]">
            <Sparkles className="size-3.5" />
            Free to start · no card needed
          </div>

          <h2 className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Caption the video you{" "}
            <span className="capgen-gradient-text">shot just now.</span>
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-lg text-[#a0a0a0]">
            Drop it in, pick a language, generate and export. The studio is live above — no signup wall.
          </p>

          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
            <Button
              onClick={() => {
                const el = document.getElementById("studio");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              size="lg"
              className="h-12 bg-[#FF6B1A] px-8 text-base font-semibold text-white shadow-[0_15px_40px_-15px_rgba(255,107,26,0.7)] hover:bg-[#E55A0E]"
            >
              Start free
              <ArrowRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                const el = document.getElementById("pricing");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="h-12 border-[#2a2a2a] bg-[#141414] px-8 text-base font-semibold text-white hover:bg-[#1a1a1a] hover:text-[#FF6B1A]"
            >
              See pricing
            </Button>
          </div>

          <p className="mt-6 text-xs text-[#9a9a9a]">
            Trusted by editors across India, Southeast Asia and the diaspora.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
