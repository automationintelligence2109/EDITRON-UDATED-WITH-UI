"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Sparkles, ArrowRight } from "lucide-react";
import { INDIAN_LANGUAGES, INTERNATIONAL_LANGUAGES } from "@/lib/languages";
import { LiquidMetalText } from "./liquid-metal-text";

const HERO_INDIAN = INDIAN_LANGUAGES.slice(0, 12);
const HERO_INTL = INTERNATIONAL_LANGUAGES.slice(0, 12);

export function Hero({ onOpenStudio }: { onOpenStudio?: () => void }) {
  const [tab, setTab] = useState<"indian" | "international">("indian");
  const [activeWord, setActiveWord] = useState(2);
  const [timer, setTimer] = useState("0:00");

  const chips = tab === "indian" ? HERO_INDIAN : HERO_INTL;

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveWord((w) => (w + 1) % 4);
    }, 900);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const start = Date.now();
    const duration = 8000; // 8 second loop
    const targetTime = 120; // 2:00 in seconds

    const tick = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = (elapsed % duration) / duration;
      const currentSeconds = Math.floor(progress * targetTime);

      const mins = Math.floor(currentSeconds / 60);
      const secs = currentSeconds % 60;
      setTimer(`${mins}:${secs.toString().padStart(2, "0")}`);
    }, 100);

    return () => clearInterval(tick);
  }, []);

  const handleCta = () => {
    const el = document.getElementById("studio");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    else onOpenStudio?.();
  };

  return (
    <section
      id="top"
      className="relative overflow-hidden bg-background"
    >
      {/* Decorative backgrounds */}
      <div className="pointer-events-none absolute inset-0 capgen-radial-highlight" />
      <div className="pointer-events-none absolute inset-0 capgen-grid-bg opacity-40" />
      <div className="pointer-events-none absolute -top-24 right-[-10%] h-72 w-72 rounded-full bg-white/5 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-20%] left-[-10%] h-72 w-72 rounded-full bg-white/5 blur-3xl" />

      <div className="relative mx-auto w-full max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:px-8 lg:pb-24 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left: copy */}
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold text-foreground"
            >
              <Sparkles className="size-3.5" />
              82 languages · word-timed captions
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="text-center lg:text-left"
            >
              <LiquidMetalText
                text="EDITRON"
                fontSize={window.innerWidth < 640 ? 48 : window.innerWidth < 1024 ? 64 : 96}
                fontWeight={800}
                color="#ffffff"
              />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-balance text-3xl font-bold leading-tight text-white/90 sm:text-4xl lg:text-5xl mt-2"
            >
              The 2-minute edit.
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground lg:mx-0"
            >
              Upload raw footage. Editron cuts silences and filler words, then adds captions, B-roll and transitions.
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-3 text-sm text-muted-foreground/60"
            >
              Free to start · no card needed
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-start"
            >
              <Button
                onClick={handleCta}
                size="lg"
                className="h-12 px-7 text-base font-semibold bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
              >
                Edit a video, free
                <ArrowRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 border-border bg-card px-7 text-base font-semibold text-white hover:bg-accent hover:text-foreground"
                onClick={() => setTab(tab === "indian" ? "international" : "indian")}
              >
                See it in your language
              </Button>
            </motion.div>

            {/* Language chip switcher */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.32 }}
              id="languages"
              className="mt-9 scroll-mt-24"
            >
              <Tabs value={tab} onValueChange={(v) => setTab(v as "indian" | "international")}>
                <TabsList className="bg-secondary">
                  <TabsTrigger value="indian" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    Indian · 14
                  </TabsTrigger>
                  <TabsTrigger value="international" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    International · 68
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="mt-3 flex flex-wrap justify-center gap-2 lg:justify-start">
                {chips.map((l) => (
                  <span
                    key={l.code}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:border-foreground hover:text-foreground"
                  >
                    {l.name}
                    {l.roman && (
                      <span className="ml-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-foreground">
                        roman
                      </span>
                    )}
                  </span>
                ))}
                <span className="rounded-full border border-dashed border-foreground/40 bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground">
                  + {tab === "indian" ? INDIAN_LANGUAGES.length - HERO_INDIAN.length : INTERNATIONAL_LANGUAGES.length - HERO_INTL.length} more
                </span>
              </div>
            </motion.div>
          </div>

          {/* Right: hero visual — mock captioned video frame */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative"
          >
            <div className="relative mx-auto aspect-[9/12] w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-secondary via-accent to-secondary shadow-2xl sm:aspect-[4/5]">
              {/* faux video poster */}
              <div className="absolute inset-0 opacity-30" style={{
                backgroundImage:
                  "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.2) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1) 0%, transparent 50%)",
              }} />
              {/* play button */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="grid size-16 place-items-center rounded-full bg-card shadow-xl ring-1 ring-white/10">
                  <Play className="size-7 fill-primary text-primary" />
                </div>
              </div>

              {/* Caption overlay — word-by-word active highlight */}
              <div className="absolute inset-x-4 bottom-12 flex flex-wrap justify-center gap-x-2 gap-y-1 text-center">
                {["KEEP", "THE", "GOLD", "BABY"].map((word, i) => (
                  <span
                    key={i}
                    className={cn(
                      "rounded-md px-2 py-1 font-extrabold uppercase transition-all duration-200",
                      i === activeWord
                        ? "scale-110 bg-primary text-primary-foreground shadow-lg capgen-active-word"
                        : "bg-black/60 text-white"
                    )}
                    style={{ fontFamily: "var(--font-archivo-black), sans-serif", fontSize: "1.6rem", lineHeight: 1 }}
                  >
                    {word}
                  </span>
                ))}
              </div>

              {/* Time chip */}
              <div className="absolute right-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur">
                00:12 / 04:42
              </div>

              {/* CapGen badge */}
              <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-md bg-card/95 px-2 py-1 text-[10px] font-bold tracking-wide text-white ring-1 ring-white/10">
                <span className="size-2 rounded-full bg-primary" />
                CapGen · Live
              </div>
            </div>

            {/* floating accent chips */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="absolute -left-3 top-12 hidden rounded-xl border border-border bg-card p-3 shadow-lg sm:block"
            >
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground" style={{ fontFamily: "Consolas, monospace" }}>Edit time</div>
              <div className="mt-0.5 text-sm font-bold text-white" style={{ fontFamily: "Consolas, monospace" }}>
                {timer}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.75 }}
              className="absolute -right-3 bottom-20 hidden rounded-xl border border-border bg-card p-3 shadow-lg sm:block"
            >
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">.SRT export</div>
              <div className="mt-0.5 text-sm font-bold text-white">
                ready in <span className="text-primary">2 clicks</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
