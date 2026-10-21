"use client";

import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const FAQS = [
  {
    q: "Is CapGen free?",
    a: "Yes. The Free plan gives you 30 minutes of captioning every month, 82 languages, .SRT and .TXT export, and access to the live studio. You don't need a card to start. Upgrade to Creator or Studio only when you ship more.",
  },
  {
    q: "Which languages does it support?",
    a: "82 languages total — 14 Indian (Hindi, Hinglish, Telugu, Telugish, Tamil, Tanglish, Kannada, Kannadish, Malayalam, Manglish, Bengali, Bengalish, Punjabi, Punjabish, Gujarati, Gujaratish, Marathi, Marathish, Odia, Odish, Urdu) and 68 international (English, French, German, Spanish, Portuguese, Japanese, Korean, Chinese, Arabic and many more). Indian languages support native script or Roman transliteration.",
  },
  {
    q: "Does it work with audio-only files?",
    a: "Yes. CapGen accepts mp3, wav, m4a, ogg and aac. When you upload audio, the studio shows a coloured background with captions overlaid in real time. The .SRT and .VTT exports work identically to video.",
  },
  {
    q: "What does Auto Trim actually remove?",
    a: "Auto Trim listens to the speech signal and removes: (1) silences longer than 0.4s, (2) filler words like um, uh, matlab, like, (3) stutters and false starts, (4) repeated takes where the speaker restarts a sentence. Every cut is shown on the timeline and one click restores the original — nothing is destructive.",
  },
  {
    q: "Can I use it inside Premiere Pro or After Effects?",
    a: "CapGen ships a plugin for Premiere Pro and After Effects on the Studio plan. You can generate captions, push the .SRT directly into your timeline, and round-trip edits without leaving the NLE. The plugin is included with team seats.",
  },
  {
    q: "How accurate are the captions?",
    a: "CapGen uses a state-of-the-art ASR engine tuned for Indian and international accents. For clean studio audio in supported languages, accuracy is typically above 95%. The word-timing editor lets you fix any word in two clicks, and every segment is fully editable before export.",
  },
];

export function Faq() {
  return (
    <section id="plugin" className="scroll-mt-20 bg-[#0d0d0d] py-16 sm:py-24">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#3d2410] bg-[#141414] px-3 py-1 text-xs font-semibold text-[#FF6B1A]">
            <HelpCircle className="size-3.5" />
            FAQ
          </div>
          <h2 className="text-balance text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Questions, <span className="capgen-gradient-text">answered</span>
          </h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-[#2a2a2a] bg-[#141414] p-2 shadow-sm"
        >
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((item, i) => (
              <AccordionItem
                key={item.q}
                value={`item-${i}`}
                className="border-b border-[#2a2a2a] last:border-b-0"
              >
                <AccordionTrigger className="px-4 py-4 text-left text-base font-semibold text-white hover:no-underline hover:text-[#FF6B1A]">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 text-sm leading-relaxed text-[#a0a0a0]">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
