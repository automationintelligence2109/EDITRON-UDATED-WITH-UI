"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Plan = {
  name: string;
  price: string;
  period: string;
  blurb: string;
  features: string[];
  cta: string;
  highlight?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Free",
    price: "₹0",
    period: "/mo",
    blurb: "Try CapGen on a real clip — no card.",
    features: [
      "30 minutes / month",
      "82 languages",
      ".SRT & .TXT export",
      "Basic templates",
      "1 project",
    ],
    cta: "Start free",
  },
  {
    name: "Creator",
    price: "₹399",
    period: "/mo",
    blurb: "For the editor who ships daily.",
    features: [
      "300 minutes / month",
      "All templates + fonts",
      "Auto Trim silences",
      "Video + .VTT export",
      "Active-word highlight",
      "5 projects",
    ],
    cta: "Start free",
    highlight: true,
  },
  {
    name: "Studio",
    price: "₹969",
    period: "/mo",
    blurb: "For teams who batch every week.",
    features: [
      "1,500 minutes / month",
      "Priority ASR queue",
      "3 team seats",
      "Brand kit & presets",
      "Premiere / AE plugin",
      "Unlimited projects",
    ],
    cta: "Start free",
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 bg-[#0d0d0d] py-16 sm:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#3d2410] bg-[#141414] px-3 py-1 text-xs font-semibold text-[#FF6B1A]">
            <Star className="size-3.5" />
            Pricing
          </div>
          <h2 className="text-balance text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Start free. <span className="capgen-gradient-text">Upgrade when you ship.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-[#a0a0a0]">
            No card needed to start. Cancel anytime. Indian pricing, billed in ₹.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className={cn(
                "relative flex flex-col rounded-3xl border bg-[#141414] p-6 shadow-sm transition-all hover:-translate-y-0.5",
                plan.highlight
                  ? "border-[#FF6B1A] shadow-[0_30px_70px_-30px_rgba(255,107,26,0.4)] lg:-translate-y-2"
                  : "border-[#2a2a2a] hover:border-[#FF6B1A]/30 hover:shadow-md"
              )}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#FF6B1A] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-md">
                  Most popular
                </div>
              )}

              <div className="mb-2">
                <h3 className="text-lg font-extrabold text-white">{plan.name}</h3>
                <p className="mt-0.5 text-xs text-[#888888]">{plan.blurb}</p>
              </div>

              <div className="mb-5 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                <span className="text-sm text-[#888888]">{plan.period}</span>
              </div>

              <ul className="mb-6 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[#a0a0a0]">
                    <span
                      className={cn(
                        "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full",
                        plan.highlight ? "bg-[#FF6B1A] text-white" : "bg-[#2a1a0d] text-[#FF6B1A]"
                      )}
                    >
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => {
                  const el = document.getElementById("studio");
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={cn(
                  "w-full",
                  plan.highlight
                    ? "bg-[#FF6B1A] text-white shadow-[0_10px_30px_-10px_rgba(255,107,26,0.6)] hover:bg-[#E55A0E]"
                    : "border border-[#FF6B1A] bg-[#141414] text-[#FF6B1A] hover:bg-[#2a1a0d]"
                )}
                variant={plan.highlight ? "default" : "outline"}
              >
                {plan.cta}
              </Button>
            </motion.div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-[#9a9a9a]">
          All plans include 82 languages, .SRT export and the live studio. Taxes apply as per GST.
        </p>
      </div>
    </section>
  );
}
