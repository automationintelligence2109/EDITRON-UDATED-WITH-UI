"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { cn } from "@/lib/utils";

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  initial: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    quote: "Cut my captioning time from 40 minutes to 4. The active-word templates are addictive.",
    name: "Pranathi Reddy",
    role: "YouTube editor · 480k subs",
    initial: "P",
  },
  {
    quote: "Finally a tool that gets Hinglish right. Roman script with the right rhythm — game changer.",
    name: "Aniket Singh",
    role: "Reels editor · 1.2M followers",
    initial: "A",
  },
  {
    quote: "Auto Trim saved a 22-minute podcast cut. The client didn't even notice the silences were gone.",
    name: "Harshith Iyer",
    role: "Podcast producer",
    initial: "H",
  },
  {
    quote: "I run an agency. Studio plan + team seats = my editors stopped fighting over whose turn it was.",
    name: "Rishi Malhotra",
    role: "Founder · ReelCraft Studio",
    initial: "R",
  },
  {
    quote: "Word-timed captions are the future. CapGen nailed it — every word snaps to its millisecond.",
    name: "Karnan V",
    role: "Wedding filmmaker",
    initial: "K",
  },
  {
    quote: "Telugish captions in Roman script — my audience finally stopped asking for subtitles.",
    name: "Alok Raj",
    role: "Tollywood vlogger",
    initial: "A",
  },
  {
    quote: "Drop, pick language, generate, export SRT. That's it. My whole pipeline got 6x faster.",
    name: "Sai Teja",
    role: "Shorts editor",
    initial: "S",
  },
  {
    quote: "The outline template + Anton font = my reel went from 80k to 1.1M views. Templates matter.",
    name: "Dheeraj Mehta",
    role: "Content creator",
    initial: "D",
  },
  {
    quote: "I tried every caption tool. CapGen is the only one that handles 14 Indian languages without breaking.",
    name: "Chandana Nair",
    role: "YouTube producer",
    initial: "C",
  },
  {
    quote: "Client wanted captions in 3 languages for the same video. Done in 12 minutes. Billed 4 hours.",
    name: "Bhavana Joshi",
    role: "Freelance editor",
    initial: "B",
  },
  {
    quote: "Auto Trim alone is worth the Creator plan. Cuts bluff, keeps the gold — exactly what it says.",
    name: "Karthikeya Rao",
    role: "Twitch streamer",
    initial: "K",
  },
];

function Avatar({ initial }: { initial: string }) {
  return (
    <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[#FF6B1A] text-sm font-bold text-white shadow-sm">
      {initial}
    </div>
  );
}

export function Testimonials() {
  return (
    <section className="bg-[#0a0a0a] py-16 sm:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#3d2410] bg-[#2a1a0d] px-3 py-1 text-xs font-semibold text-[#FF6B1A]">
            <Quote className="size-3.5" />
            Editor reviews
          </div>
          <h2 className="text-balance text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Editors stopped fighting their <span className="capgen-gradient-text">caption workflow</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-[#a0a0a0]">
            From wedding films to Tollywood vlogs, CapGen runs in the background of their day.
          </p>
        </div>

        {/* Masonry-ish grid */}
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
          {TESTIMONIALS.map((t, i) => (
            <motion.figure
              key={t.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.4, delay: (i % 3) * 0.05 }}
              className={cn(
                "break-inside-avoid rounded-2xl border border-[#2a2a2a] bg-[#141414] p-5 shadow-sm transition-all hover:border-[#FF6B1A]/30 hover:shadow-md"
              )}
            >
              <Quote className="mb-3 size-5 text-[#FF6B1A]/40" />
              <blockquote className="text-sm leading-relaxed text-white">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <Avatar initial={t.initial} />
                <div>
                  <div className="text-sm font-bold text-white">{t.name}</div>
                  <div className="text-xs text-[#888888]">{t.role}</div>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
