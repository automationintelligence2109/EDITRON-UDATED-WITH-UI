"use client";

import { motion } from "framer-motion";
import { CAPGEN_FONTS, getFontFamily } from "@/lib/languages";
import { Type as TypeIcon } from "lucide-react";

type Template = {
  id: string;
  text: string;
  fontFamily: string;
  fontSize: number;
  textColor: string;
  highlightColor: string;
  bg?: string;
  template: "plain" | "active-word" | "boxed" | "outline";
  uppercase?: boolean;
  bold?: boolean;
  strokeWidth?: number;
  strokeColor?: string;
  caption: string;
};

const TEMPLATES: Template[] = [
  {
    id: "pop",
    text: "KEEP THE GOLD",
    fontFamily: "archivo-black",
    fontSize: 56,
    textColor: "#FFFFFF",
    highlightColor: "#FF6B1A",
    bg: "linear-gradient(135deg, #1A1A1A 0%, #3a3a3a 100%)",
    template: "active-word",
    uppercase: true,
    caption: "Active Word",
  },
  {
    id: "bold-orange",
    text: "bahut khaas hai",
    fontFamily: "montserrat",
    fontSize: 48,
    textColor: "#FFFFFF",
    highlightColor: "#FF6B1A",
    bg: "linear-gradient(135deg, #FF6B1A 0%, #E55A0E 100%)",
    template: "boxed",
    uppercase: true,
    bold: true,
    caption: "Boxed Orange",
  },
  {
    id: "outline",
    text: "quietly confident",
    fontFamily: "anton",
    fontSize: 56,
    textColor: "#FFFFFF",
    highlightColor: "#FF6B1A",
    bg: "linear-gradient(135deg, #1A1A1A 0%, #2a2a2a 100%)",
    template: "outline",
    uppercase: true,
    strokeWidth: 3,
    strokeColor: "#FF6B1A",
    caption: "Outline",
  },
  {
    id: "playful",
    text: "LET'S GO!",
    fontFamily: "luckiest-guy",
    fontSize: 52,
    textColor: "#FFFFFF",
    highlightColor: "#FFE8D6",
    bg: "linear-gradient(135deg, #FF6B1A 0%, #FFB27A 100%)",
    template: "plain",
    uppercase: true,
    caption: "Playful",
  },
  {
    id: "minimal",
    text: "the secret is",
    fontFamily: "inter",
    fontSize: 42,
    textColor: "#FFFFFF",
    highlightColor: "#FF6B1A",
    bg: "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)",
    template: "active-word",
    bold: true,
    caption: "Minimal Dark",
  },
  {
    id: "newsroom",
    text: "BREAKING",
    fontFamily: "bebas-neue",
    fontSize: 60,
    textColor: "#FFFFFF",
    highlightColor: "#FF6B1A",
    bg: "linear-gradient(135deg, #1A1A1A 0%, #1A1A1A 100%)",
    template: "boxed",
    uppercase: true,
    caption: "Newsroom",
  },
];

export function Templates() {
  return (
    <section id="captions" className="scroll-mt-20 bg-[#0a0a0a] py-16 sm:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#3d2410] bg-[#2a1a0d] px-3 py-1 text-xs font-semibold text-[#FF6B1A]">
            <TypeIcon className="size-3.5" />
            Caption templates
          </div>
          <h2 className="text-balance text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Templates that <span className="capgen-gradient-text">pop on every feed</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-[#a0a0a0]">
            Start from a preset and tweak in the studio. Active-word highlight, boxed, outline —
            all driven by word timings.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="group overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#141414] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#FF6B1A]/30 hover:shadow-lg"
            >
              {/* Preview */}
              <div
                className="relative grid aspect-video place-items-center px-4"
                style={{ background: t.bg }}
              >
                <div
                  style={{
                    fontFamily: getFontFamily(t.fontFamily),
                    fontSize: `${t.fontSize * 0.7}px`,
                    color: t.textColor,
                    fontWeight: t.bold ? 800 : 600,
                    textTransform: t.uppercase ? "uppercase" : "none",
                    WebkitTextStroke:
                      t.template === "outline"
                        ? `${(t.strokeWidth || 2) * 0.7}px ${t.strokeColor}`
                        : undefined,
                    letterSpacing: "0.02em",
                    lineHeight: 1.1,
                  }}
                  className={
                    t.template === "boxed"
                      ? "rounded-md px-3 py-1"
                      : ""
                  }
                >
                  <span
                    style={{
                      backgroundColor:
                        t.template === "boxed" ? t.highlightColor : undefined,
                      color: t.template === "boxed" ? "#ffffff" : t.textColor,
                      padding: t.template === "boxed" ? "0.1em 0.35em" : undefined,
                      borderRadius: t.template === "boxed" ? "0.2em" : undefined,
                    }}
                  >
                    {t.text}
                  </span>
                </div>

                {/* active word marker for active-word template */}
                {t.template === "active-word" && (
                  <div className="absolute bottom-2 left-3 text-[10px] font-bold uppercase tracking-wide text-white/70">
                    word 1 of 3 highlighted
                  </div>
                )}
              </div>

              {/* Caption */}
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-sm font-bold text-white">{t.caption}</div>
                  <div className="text-xs text-[#888888]" style={{ fontFamily: getFontFamily(t.fontFamily) }}>
                    {CAPGEN_FONTS.find((f) => f.value === t.fontFamily)?.label}
                  </div>
                </div>
                <span className="rounded-full bg-[#2a1a0d] px-2 py-0.5 text-[10px] font-bold uppercase text-[#FF6B1A]">
                  {t.template}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
