"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Clapperboard, X, Check, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { buildBrollWindows, type BRollClip, type BRollWindow } from "@/lib/broll";
import { BROLL_CONFIG } from "@/lib/broll-config";
import type { CaptionSegment } from "@/lib/captions";
import { formatClock } from "@/lib/captions";

type SuggestionResult = {
  windowId: string;
  start: number;
  end: number;
  query: string;
  clips: {
    id: string;
    source: "pexels" | "pixabay";
    previewUrl: string;
    thumbnail: string;
    durationHint?: number;
  }[];
  currentIndex: number;
};

type Props = {
  segments: CaptionSegment[];
  brolls: BRollClip[];
  setBrolls: React.Dispatch<React.SetStateAction<BRollClip[]>>;
};

export function BRollPanel({ segments, brolls, setBrolls }: Props) {
  const [windows, setWindows] = useState<BRollWindow[]>([]);
  const [suggestions, setSuggestions] = useState<Record<string, SuggestionResult>>({});
  const [loadingWindows, setLoadingWindows] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = async () => {
    if (!segments.length) return;

    const totalDuration = segments[segments.length - 1].end;
    const w = buildBrollWindows(segments, {
      windowSeconds: 6,
      videoDuration: totalDuration
    });
    setWindows(w);

    const initialLoading: Record<string, boolean> = {};
    w.forEach(win => initialLoading[win.id] = true);
    setLoadingWindows(initialLoading);
    setError(null);

    try {
      const res = await fetch("/api/broll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ windows: w.map((x) => ({ id: x.id, start: x.start, end: x.end, query: x.query })) }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to fetch suggestions.");

      const results = data.results as SuggestionResult[];
      const map: Record<string, SuggestionResult> = {};
      const newBrolls: BRollClip[] = [];

      for (const r of results) {
        map[r.windowId] = {
          ...r,
          clips: r.clips || [],
          currentIndex: 0
        };
        if (r.clips && r.clips.length > 0) {
          const bestClip = r.clips[0];
          const duration = Math.min(r.end - r.start, BROLL_CONFIG.MAX_DURATION);
          newBrolls.push({
            id: `${r.windowId}-${bestClip.id}`,
            windowId: r.windowId,
            start: r.start,
            end: r.start + duration,
            source: bestClip.source,
            previewUrl: bestClip.previewUrl,
            thumbnail: bestClip.thumbnail,
            query: r.query,
            durationHint: bestClip.durationHint,
          });
        }
      }

      setBrolls((prev) => {
        const existingIds = new Set(prev.map(b => b.windowId));
        const filteredNew = newBrolls.filter(nb => !existingIds.has(nb.windowId));
        return [...prev, ...filteredNew].sort((a, b) => a.start - b.start);
      });

      setSuggestions(map);
    } catch (e) {
      setError("Failed to fetch b-roll suggestions.");
    } finally {
      setLoadingWindows({});
    }
  };

  const autoApplyBroll = async () => {
    if (!windows.length) return;

    const initialLoading: Record<string, boolean> = {};
    windows.forEach(win => initialLoading[win.id] = true);
    setLoadingWindows(initialLoading);
    setError(null);

    try {
      const res = await fetch("/api/broll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ windows: windows.map((x) => ({ id: x.id, start: x.start, end: x.end, query: x.query })) }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to fetch suggestions.");

      const results = data.results as SuggestionResult[];
      const newBrolls: BRollClip[] = [];

      for (const r of results) {
        if (r.clips && r.clips.length > 0) {
          const bestClip = r.clips[0];
          const duration = Math.min(r.end - r.start, BROLL_CONFIG.MAX_DURATION);
          newBrolls.push({
            id: `${r.windowId}-${bestClip.id}`,
            windowId: r.windowId,
            start: r.start,
            end: r.start + duration,
            source: bestClip.source,
            previewUrl: bestClip.previewUrl,
            thumbnail: bestClip.thumbnail,
            query: r.query,
            durationHint: bestClip.durationHint,
          });
        }
      }

      setBrolls(newBrolls);
      setSuggestions(
        results.reduce((acc, r) => {
          acc[r.windowId] = {
            ...r,
            clips: r.clips || [],
            currentIndex: 0
          };
          return acc;
        }, {} as Record<string, SuggestionResult>)
      );
      toast({ title: "B-Roll Auto-Applied", description: `Added ${newBrolls.length} clips automatically.` });
    } catch (e) {
      setError("Failed to auto-apply B-roll clips.");
    } finally {
      setLoadingWindows({});
    }
  };

  useEffect(() => {
    if (segments.length) fetchSuggestions();
  }, [segments.length]);

  const assignClip = (win: BRollWindow, clip: SuggestionResult["clips"][number]) => {
    setBrolls((prev) => {
      const withoutThisWindow = prev.filter((b) => b.windowId !== win.id);
      const duration = Math.min(win.end - win.start, BROLL_CONFIG.MAX_DURATION);
      return [
        ...withoutThisWindow,
        {
          id: `${win.id}-${clip.id}`,
          windowId: win.id,
          start: win.start,
          end: win.start + duration,
          source: clip.source,
          previewUrl: clip.previewUrl,
          thumbnail: clip.thumbnail,
          query: win.query,
          durationHint: clip.durationHint,
        },
      ].sort((a, b) => a.start - b.start);
    });
    toast({ title: "B-roll added", description: `${formatClock(win.start)} – ${formatClock(win.start + Math.min(win.end - win.start, BROLL_CONFIG.MAX_DURATION))}` });
  };

  const removeClip = (windowId: string) => {
    setBrolls((prev) => prev.filter((b) => b.windowId !== windowId));
  };

  const regenerateClip = (clip: BRollClip) => {
    const s = suggestions[clip.windowId];
    if (!s || !s.clips || s.clips.length === 0) {
      toast({ title: "No clips available", description: "Cannot regenerate without available clips." });
      return;
    }

    const nextIndex = (s.currentIndex + 1) % s.clips.length;
    const selectedClip = s.clips[nextIndex];

    setSuggestions(prev => ({
      ...prev,
      [clip.windowId]: {
        ...s,
        currentIndex: nextIndex
      }
    }));

    setBrolls((prev) => {
      const withoutThisWindow = prev.filter((b) => b.windowId !== clip.windowId);
      const duration = Math.min(clip.end - clip.start, BROLL_CONFIG.MAX_DURATION);
      return [
        ...withoutThisWindow,
        {
          id: `${clip.windowId}-${selectedClip.id}`,
          windowId: clip.windowId,
          start: clip.start,
          end: clip.start + duration,
          source: selectedClip.source,
          previewUrl: selectedClip.previewUrl,
          thumbnail: selectedClip.thumbnail,
          query: clip.query,
          durationHint: selectedClip.durationHint,
        },
      ].sort((a, b) => a.start - b.start);
    });

    toast({ title: "B-roll cycled", description: `Switched to clip ${nextIndex + 1} of ${s.clips.length}` });
  };

  if (!segments.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-white/50">
        <Clapperboard className="size-8" />
        <p className="text-sm">Generate captions first — b-roll suggestions are built from your transcript.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-card mb-2">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="size-4" />
          <h4 className="text-xs font-bold uppercase tracking-wider">Smart Engine Features</h4>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {[
            { title: "Tiered B-Roll Search", desc: "Combined phrases first, then individual keywords to maximize hits." },
            { title: "Professional Pacing", desc: "Automatically spaced at 10s intervals for a high-retention flow." },
            { title: "Infinite Regeneration", desc: "Bulk fetch and cycle through clips for a smart, variety-filled feel." },
            { title: "Production Cache", desc: "Local JSON caching with 7-day TTL to ensure instant loading." },
          ].map((item, i) => (
            <li key={i} className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-white">{item.title}</span>
              <span className="text-[10px] text-muted-foreground">{item.desc}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-lg bg-secondary p-1 mb-6">
          <h3 className="text-sm font-semibold text-white">B-Roll Timeline</h3>
          <p className="text-xs text-white/50 ml-2">
            Manage your cutaways and refine your footage.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-[#2a2a2a] text-white/80 hover:text-white"
            onClick={fetchSuggestions}
            disabled={Object.values(loadingWindows).some(v => v)}
          >
            {Object.values(loadingWindows).some(v => v) ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Refresh All
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-[#FF6B1A] text-white hover:bg-[#e55a16]"
            onClick={autoApplyBroll}
            disabled={Object.values(loadingWindows).some(v => v) || !windows.length}
          >
            <Sparkles className="size-3.5" />
            Auto-Apply All
          </Button>
        </div>
      </div>
      {error && (
        <div className="rounded-md border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}
      <ScrollArea className="h-[400px] pr-2">
        <div className="flex flex-col gap-3">
          {windows.map((w) => {
            const s = suggestions[w.id];
            const assigned = brolls.find((b) => b.windowId === w.id);
            const isApplied = !!assigned;
            const isLoading = loadingWindows[w.id];

            return (
              <div key={w.id} className={`rounded-md border transition-colors ${isApplied ? "border-[#FF6B1A]/50 bg-[#1a1a1a]" : "border-[#2a2a2a] bg-[#161616]"} p-3`}>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-white/70">
                      {assigned
                        ? `${formatClock(assigned.start)} – ${formatClock(assigned.end)}`
                        : `${formatClock(w.start)} – ${formatClock(w.end)}`}
                    </span>
                    {isApplied && (
                      <span className="flex items-center gap-1 rounded bg-[#FF6B1A]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#FF6B1A]">
                        <Check className="size-3" /> Applied
                      </span>
                    )}
                  </div>
                  <span className="rounded bg-[#2a2a2a] px-1.5 py-0.5 text-[10px] text-white/60">
                    "{w.query}"
                  </span>
                </div>

                {!s ? (
                  <div className="flex items-center gap-2 py-3 text-xs text-white/40">
                    <Loader2 className="size-3.5 animate-spin" /> Searching for a clip…
                  </div>
                ) : s.clips.length === 0 ? (
                  <div className="flex items-center justify-between py-2">
                    <p className="text-xs text-white/40">No clips found for this moment.</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 text-xs text-white/60"
                      onClick={() => regenerateClip({
                        windowId: w.id,
                        start: w.start,
                        end: w.end,
                        query: w.query,
                        id: `regen-${w.id}`,
                        source: "pexels",
                        previewUrl: "",
                        thumbnail: "",
                        durationHint: 0
                      })}
                      disabled={isLoading}
                    >
                      <RefreshCw className={`size-3 ${isLoading ? "animate-spin" : ""}`} />
                      Try Again
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="relative group">
                        <img
                          src={s.clips[s.currentIndex || 0]?.thumbnail}
                          alt=""
                          className={`h-16 w-28 rounded object-cover transition-opacity ${isApplied ? "opacity-100" : "opacity-60 group-hover:opacity-100"}`}
                        />
                        <span className="absolute bottom-0 right-0 bg-black/70 px-1 text-[8px] uppercase text-white/70 pointer-events-none">
                          {s.clips[s.currentIndex || 0]?.source.charAt(0)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        {isApplied ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            onClick={() => removeClip(w.id)}
                          >
                            <X className="size-3" />
                            Remove from video
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="h-7 gap-1.5 bg-white text-black hover:bg-white/90"
                            onClick={() => {
                              if (s.clips.length > 0) assignClip(w, s.clips[s.currentIndex || 0]);
                            }}
                          >
                            <Check className="size-3" />
                            Apply to video
                          </Button>
                        )}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 border-[#2a2a2a] text-xs text-white/60 hover:text-white"
                      onClick={() => regenerateClip({
                        windowId: w.id,
                        start: w.start,
                        end: w.end,
                        query: w.query,
                        id: assigned?.id || `regen-${w.id}`,
                        source: s.clips[0].source,
                        previewUrl: s.clips[0].previewUrl,
                        thumbnail: s.clips[0].thumbnail,
                        durationHint: s.clips[0].durationHint
                      })}
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                      Regenerate
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
