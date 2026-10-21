"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { X, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRollClip } from "@/lib/broll";

type BrollTrimmerModalProps = {
  clip: BRollClip;
  onApply: (trimStart: number, trimEnd: number) => void;
  onCancel: () => void;
};

export function BrollTrimmerModal({ clip, onApply, onCancel }: BrollTrimmerModalProps) {
  const [range, setRange] = useState<number[]>([0, 0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const handleLoadedMetadata = () => {
      const d = v.duration;
      setDuration(d);
      setRange([0, d]);
    };

    v.addEventListener("loadedmetadata", handleLoadedMetadata);
    return () => v.removeEventListener("loadedmetadata", handleLoadedMetadata);
  }, [clip]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const handleTimeUpdate = () => {
      if (isPlaying) {
        if (v.currentTime >= range[1]) {
          v.currentTime = range[0];
        }
      }
    };

    v.addEventListener("timeupdate", handleTimeUpdate);
    return () => v.removeEventListener("timeupdate", handleTimeUpdate);
  }, [range, isPlaying]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) {
      v.pause();
    } else {
      v.currentTime = range[0];
      v.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleRangeChange = (newRange: number[]) => {
    setRange(newRange);
    if (videoRef.current) {
      videoRef.current.currentTime = newRange[0];
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#161616] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a]">
          <h3 className="text-lg font-bold text-white">Trim B-Roll Clip</h3>
          <button onClick={onCancel} className="p-1 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors">
            <X className="size-5" />
          </button>
        </div>

        {/* Preview Area */}
        <div className="relative aspect-video bg-black group">
          <video
            ref={videoRef}
            src={clip.previewUrl}
            className="size-full object-contain"
            muted
            playsInline
          />
          <div
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20"
            onClick={togglePlay}
          >
            <div className="size-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30">
              {isPlaying ? <Pause className="size-6 fill-current" /> : <Play className="size-6 fill-current ml-1" />}
            </div>
          </div>
        </div>

        {/* Trimmer Controls */}
        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between text-xs font-mono text-muted-foreground">
              <span>Start: {range[0].toFixed(2)}s</span>
              <span>End: {range[1].toFixed(2)}s</span>
            </div>
            <Slider
              value={range}
              onValueChange={handleRangeChange}
              max={duration}
              step={0.1}
              className="py-4"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              Clip Duration: <span className="text-white font-medium">{(range[1] - range[0]).toFixed(2)}s</span>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={onCancel} className="text-white/60 hover:text-white">
                Cancel
              </Button>
              <Button
                onClick={() => onApply(range[0], range[1])}
                className="bg-[#FF6B1A] hover:bg-[#e55a0a] text-white font-bold px-6"
              >
                Apply Trim
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
