"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Play, RefreshCw, Check, Film, Upload, Sparkles, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatClock } from "@/lib/captions";
import { BROLL_CONFIG } from "@/lib/broll-config";
import { isBrollImage } from "@/lib/broll";
import { toast } from "@/hooks/use-toast";
import type { CaptionSegment } from "@/lib/captions";
import type { BRollClip } from "@/lib/broll";
import { BrollTrimmerModal } from "./broll-trimmer-modal";

type SegmentCardProps = {
  segment: CaptionSegment;
  index: number;
  isActive: boolean;
  onUpdate: (id: string, patch: Partial<CaptionSegment>) => void;
  onToggleHidden: (id: string) => void;
  onSeek: (t: number) => void;
  broll: BRollClip | null;
  onAssignBroll: (segmentId: string, clip: any) => void;
  onRegenerateBroll: (clip: BRollClip) => Promise<void>;
  onRemoveBroll: (windowId: string) => void;
  onFetchAndAssignBroll: (segmentId: string, text: string) => Promise<void>;
  onBrollActivityChange: (change: number) => void;
  suggestions: any; // SuggestionResult from BRollPanel
};

export function SegmentCard({
  segment,
  index,
  isActive,
  onUpdate,
  onToggleHidden,
  onSeek,
  broll,
  onAssignBroll,
  onRegenerateBroll,
  onRemoveBroll,
  onFetchAndAssignBroll,
  onBrollActivityChange,
  suggestions,
}: SegmentCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(segment.text);
  const [isUploading, setIsUploading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingBroll, setIsAddingBroll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [trimmingClip, setTrimmingClip] = useState<BRollClip | null>(null);

  const handleCommit = () => {
    onUpdate(segment.id, { text });
    setIsEditing(false);
  };

  const s = suggestions?.[`w-${segment.start.toFixed(1)}`] || suggestions?.[segment.id];
  const clipIndex = s?.currentIndex || 0;
  const availableClips = s?.clips || [];

  const handleAddBroll = async () => {
    setIsAddingBroll(true);
    onBrollActivityChange(1);
    try {
      await onFetchAndAssignBroll(segment.id, segment.text);
    } finally {
      onBrollActivityChange(-1);
      setIsAddingBroll(false);
    }
  };

  const handleManualSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    onBrollActivityChange(1);
    try {
      const res = await fetch("/api/broll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          windows: [{
            id: `manual-${segment.id}`,
            start: segment.start,
            end: Math.max(segment.end, segment.start + 3),
            query: searchQuery
          }]
        }),
      });
      const data = await res.json();
      if (data.success && data.results?.[0]?.clips?.length > 0) {
        const bestClip = data.results[0].clips[0];
        onAssignBroll(segment.id, {
          ...bestClip,
          windowId: `manual-${segment.id}`,
          start: segment.start,
          end: Math.max(segment.end, segment.start + 3),
          query: searchQuery
        });
        toast({ title: "B-roll found", description: `Matched clip for "${searchQuery}"` });
      } else {
        toast({ title: "No matches", description: "Could not find a clip for that keyword.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Search error", description: "Failed to fetch manual B-roll.", variant: "destructive" });
    } finally {
      onBrollActivityChange(-1);
      setIsSearching(false);
      setSearchQuery("");
      setShowSearch(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    onBrollActivityChange(1);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/broll/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        toast({
          title: "Upload successful",
          description: data.clip.mediaType === "image"
            ? "Image B-roll added to this segment."
            : "Now select the part of the video you want to use.",
        });
        if (data.clip.mediaType === "image") {
          onAssignBroll(segment.id, {
            ...data.clip,
            windowId: `user-upload-${segment.id}`,
            start: segment.start,
            end: Math.max(segment.end, segment.start + 3),
          });
        } else {
          setTrimmingClip(data.clip);
        }
      } else {
        toast({
          title: "Upload failed",
          description: data.error || "Something went wrong during upload.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Upload error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      onBrollActivityChange(-1);
      setIsUploading(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          "group relative flex min-w-0 flex-col gap-3 rounded-xl border p-3 transition-all sm:p-4",
          isActive
            ? "border-[#FF6B1A] bg-[#1a1a1a] shadow-[0_0_15px_rgba(255,107,26,0.1)]"
            : "border-[#2a2a2a] bg-[#161616] opacity-80 hover:opacity-100",
          segment.hidden && "border-zinc-700 bg-zinc-900/50 opacity-60"
        )}
      >
        {/* Top Row: Time, Status, and Query */}
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="grid size-6 place-items-center rounded bg-secondary text-[10px] font-bold text-primary">
              {index + 1}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {formatClock(segment.start)} → {formatClock(segment.end)}
            </span>
            {broll && (
              <span className="flex items-center gap-1 rounded bg-[#FF6B1A]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#FF6B1A]">
                <Check className="size-3" /> Applied
              </span>
            )}
            {segment.hidden && (
              <span className="text-xs text-zinc-300">Caption hidden</span>
            )}
          </div>

          <div className="flex min-w-0 shrink items-center gap-1 sm:gap-3">
            {broll && (
              <span className="max-w-24 truncate rounded bg-[#2a2a2a] px-1.5 py-0.5 text-[10px] text-white/60">
                "{broll.query}"
              </span>
            )}
            <button
              type="button"
              onClick={() => onToggleHidden(segment.id)}
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded transition-colors sm:size-7",
                segment.hidden ? "bg-green-500/20 text-green-400" : "text-muted-foreground hover:bg-zinc-800 hover:text-white"
              )}
              title={segment.hidden ? "Show caption" : "Hide caption"}
              aria-label={segment.hidden ? `Show caption ${index + 1}` : `Hide caption ${index + 1}`}
            >
              {segment.hidden ? <Check className="size-3.5" /> : <X className="size-3.5" />}
            </button>
          </div>
        </div>

        {/* Middle Row: Text Editing */}
        <div className="flex items-start gap-3">
          <button
            onClick={() => onSeek(segment.start)}
            aria-label={`Play caption ${index + 1}`}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground hover:bg-primary hover:text-white transition-colors sm:size-8"
          >
            <Play className="size-3.5 ml-0.5" />
          </button>

          <div className="min-w-0 flex-1">
            {isEditing ? (
              <Input
                autoFocus
                aria-label={`Edit caption ${index + 1}`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onBlur={handleCommit}
                onKeyDown={(e) => e.key === "Enter" && handleCommit()}
                className="h-10 border-primary bg-card text-base sm:h-9 sm:text-sm"
              />
            ) : (
              <button
                type="button"
                aria-label={`Edit caption ${index + 1}`}
                onClick={() => {
                  setText(segment.text);
                  setIsEditing(true);
                }}
                className="w-full cursor-text break-words rounded-md border border-transparent px-2 py-1.5 text-left text-sm text-white hover:border-border hover:bg-background focus-visible:border-primary focus-visible:outline-none transition-colors"
              >
                {segment.text}
              </button>
            )}
          </div>
        </div>

        {/* Bottom Row: B-Roll Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            {broll ? (
              <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-4">
                <div
                  className={cn(
                    "relative h-14 w-24 overflow-hidden rounded-lg border border-border bg-black transition-colors",
                    !isBrollImage(broll) && "cursor-pointer hover:border-primary",
                  )}
                  onClick={() => {
                    if (!isBrollImage(broll)) setTrimmingClip(broll);
                  }}
                >
                  <img
                    src={broll.thumbnail}
                    alt="B-roll"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute bottom-0 right-0 bg-black/70 px-1 text-[8px] text-white">
                    {broll.source.charAt(0).toUpperCase()}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveBroll(broll.windowId)}
                  className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20"
                >
                  <X className="size-3 mr-1" /> Remove from video
                </Button>
              </div>
            ) : (
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddBroll}
                  disabled={isAddingBroll}
                  className="h-10 gap-1.5 text-xs text-muted-foreground hover:text-primary sm:h-7"
                >
                  <Film className="size-3" /> Add B-Roll
                </Button>

                {showSearch ? (
                  <div className="flex max-w-full items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200 sm:border-l sm:border-border sm:pl-2">
                    <Input
                      autoFocus
                      placeholder="Search keyword..."
                      aria-label={`Search B-roll for caption ${index + 1}`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleManualSearch();
                        if (e.key === "Escape") setShowSearch(false);
                      }}
                      className="h-10 w-32 max-w-full bg-background border-border text-base sm:h-7 sm:text-xs"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleManualSearch}
                      aria-label="Search B-roll"
                      disabled={isSearching || !searchQuery.trim()}
                      className="h-10 w-10 p-0 text-muted-foreground hover:text-primary sm:h-7 sm:w-7"
                    >
                      {isSearching ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSearch(true)}
                    className="h-10 w-10 p-0 rounded-full border-border text-muted-foreground hover:text-primary sm:h-7 sm:w-7"
                    title="Search B-Roll"
                  >
                    <Search className="size-3" />
                  </Button>
                )}

                <div className="relative">
                  <input
                    type="file"
                    aria-label={`Upload B-roll for caption ${index + 1}`}
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                    accept="video/mp4,video/quicktime,image/jpeg,image/png"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 gap-1.5 text-xs text-muted-foreground hover:text-primary sm:h-7"
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <RefreshCw className="size-3 animate-spin" />
                    ) : (
                      <Upload className="size-3" />
                    )}
                    {isUploading ? "Uploading..." : "Upload B-Roll"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {broll && !isBrollImage(broll) && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (broll.source === "user") {
                  setTrimmingClip(broll);
                } else {
                  onBrollActivityChange(1);
                  try {
                    await onRegenerateBroll(broll);
                  } finally {
                    onBrollActivityChange(-1);
                  }
                }
              }}
              className="h-10 gap-1.5 border-[#2a2a2a] bg-black text-xs text-white hover:bg-accent sm:h-8"
            >
              <RefreshCw className="size-3" />
              {broll.source === "user" ? "Re-trim" : "Regenerate"}
            </Button>
          )}
        </div>
      </div>
      {trimmingClip && (
        <BrollTrimmerModal
          clip={trimmingClip}
          onCancel={() => setTrimmingClip(null)}
          onApply={(start, end) => {
            onAssignBroll(segment.id, {
              ...trimmingClip,
              windowId: `user-upload-${segment.id}`,
              start: segment.start,
              end: Math.max(segment.end, segment.start + 3),
              trimStart: start,
              trimEnd: end,
            });
            setTrimmingClip(null);
          }}
        />
      )}
    </>
  );
}

export function SegmentCardWrapper({
  segment,
  index,
  isActive,
  onUpdate,
  onToggleHidden,
  onSeek,
  broll,
  onAssignBroll,
  onRegenerateBroll,
  onRemoveBroll,
  onFetchAndAssignBroll,
  onBrollActivityChange,
  suggestions,
}: SegmentCardProps) {
  return (
    <>
      <SegmentCard
        {...{
          segment, index, isActive, onUpdate, onToggleHidden, onSeek, broll,
          onAssignBroll, onRegenerateBroll, onRemoveBroll, onFetchAndAssignBroll, onBrollActivityChange, suggestions
        }}
      />
    </>
  );
}
