"use client";

import React, { useState } from "react";

import { LiquidMetalButton } from "./liquid-metal-button";
import { LiquidMetalText } from "./liquid-metal-text";
import { ReactionFront } from "./reaction-front";
import { CaptionStudio } from "./caption-studio";
import { AutoTrim } from "./auto-trim";
import { motion, AnimatePresence } from "framer-motion";

export function Welcome() {
  const [hasVideo, setHasVideo] = useState(false);

  const handleUpload = () => {
    // Trigger hidden file input
    const input = document.getElementById("video-upload-input") as HTMLInputElement;
    if (input) input.click();
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create local URL for the video to be used in the studio
      const url = URL.createObjectURL(file);

      // We need a way to pass this file and URL to the studio.
      // Since Welcome and CaptionStudio are siblings in the Welcome component's logic,
      // we should move the state to a common parent or use a window object/context.
      // However, for a quick fix, let's use a global state or a simple trick.
      // Better yet, let's modify Welcome to handle the layout better.

      (window as any).lastUploadedVideo = { file, url };
      setHasVideo(true);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-black overflow-hidden">
      <AnimatePresence mode="wait">
        {!hasVideo ? (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
            transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-12 z-10"
          >
            {/* Reaction-Diffusion Background */}
            <div className="absolute inset-0 z-[-1] opacity-40 pointer-events-none">
              <ReactionFront cellSize={12} className="text-zinc-700" />
            </div>

            {/* Branding */}
            <div className="flex flex-col items-center gap-4">
              <LiquidMetalText text="EDITRON" fontSize={120} />
              <p className="text-zinc-500 font-light tracking-widest text-sm uppercase">
                The New Standard of Editing
              </p>
            </div>

            {/* Minimal Upload Action */}
            <div className="flex flex-col items-center gap-6 z-10">
              <input
                id="video-upload-input"
                type="file"
                className="hidden"
                accept="video/mp4,video/quicktime,video/x-msvideo"
                onChange={onFileSelect}
              />
              <LiquidMetalButton
                label="Upload Video"
                onClick={handleUpload}
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="studio"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full h-full flex flex-col"
          >
            <div className="flex flex-col gap-12">
              <CaptionStudio />
              <AutoTrim />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ambient Background Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-zinc-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-zinc-800/10 rounded-full blur-[120px]" />
      </div>
    </div>
  );
}
