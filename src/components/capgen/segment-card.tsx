"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Play, RefreshCw, Check, Film, Upload, Sparkles, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatClock } from "@/lib/captions";
import { BROLL_CONFIG } from "@/lib/broll-config";
import { toast } from "@/hooks/use-toast";
import type { CaptionSegment } from "@/lib/captions";
import type { BRollClip } from "@/lib/broll";
import { BrollTrimmerModal } from "./broll-trimmer-modal";

type SegmentCardProps = {
  segment: CaptionSegment & { deleted?: boolean };
  index: number;
  isActive: boolean;
  onUpdate: (id: string, patch: Partial<CaptionSegment>) => void;
  onDelete: (id: string) => void;
  onSeek: (t: number) => void;
  broll: BRollClip | null;
  onAssignBroll: (segmentId: string, clip: any) => void;
  onRegenerateBroll: (clip: BRollClip) => void;
  onRemoveBroll: (windowId: string) => void;
  onFetchAndAssignBroll: (segmentId: string, text: string) => void;
  suggestions: any; // SuggestionResult from BRollPanel
};

export function SegmentCard({
  segment,
  index,
  isActive,
  onUpdate,
  onDelete,
  onSeek,
  broll,
  onAssignBroll,
  onRegenerateBroll,
  onRemoveBroll,
  onFetchAndAssignBroll,
  suggestions,
}: SegmentCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(segment.text);
  const [isUploading, setIsUploading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
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
    await onFetchAndAssignBroll(segment.id, segment.text);
  };

  const handleManualSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
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
      setIsSearching(false);
      setSearchQuery("");
      setShowSearch(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/broll/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setTrimmingClip(data.clip);
        toast({
          title: "Upload successful",
          description: "Now select the part of the video you want to use.",
        });
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
      setIsUploading(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          "group relative flex flex-col gap-3 rounded-xl border p-4 transition-all",
          isActive
            ? "border-[#FF6B1A] bg-[#1a1a1a] shadow-[0_0_15px_rgba(255,107,26,0.1)]"
            : "border-[#2a2a2a] bg-[#161616] opacity-80 hover:opacity-100",
          segment.deleted && "border-red-900/50 bg-red-950/10 opacity-50"
        )}
      >
        {/* Top Row: Time, Status, and Query */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
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
          </div>

          <div className="flex items-center gap-3">
            {broll && (
              <span className="rounded bg-[#2a2a2a] px-1.5 py-0.5 text-[10px] text-white/60">
                "{broll.query}"
              </span>
            )}
            <button
              onClick={() => onDelete(segment.id)}
              className={cn(
                "grid size-7 place-items-center rounded transition-colors",
                segment.deleted ? "bg-green-500/20 text-green-500" : "text-muted-foreground hover:bg-red-500/20 hover:text-red-500"
              )}
              title={segment.deleted ? "Restore segment" : "Remove bad take"}
            >
              {segment.deleted ? <Check className="size-3.5" /> : <X className="size-3.5" />}
            </button>
          </div>
        </div>

        {/* Middle Row: Text Editing */}
        <div className="flex items-start gap-3">
          <button
            onClick={() => onSeek(segment.start)}
            className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground hover:bg-primary hover:text-white transition-colors"
          >
            <Play className="size-3.5 ml-0.5" />
          </button>

          <div className="flex-1">
            {isEditing ? (
              <Input
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                onBlur={handleCommit}
                onKeyDown={(e) => e.key === "Enter" && handleCommit()}
                className="h-9 border-primary bg-card text-sm"
              />
            ) : (
              <div
                onClick={() => {
                  setText(segment.text);
                  setIsEditing(true);
                }}
                className="cursor-text rounded-md border border-transparent px-2 py-1.5 text-sm text-white hover:border-border hover:bg-background transition-colors"
              >
                {segment.text}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Row: B-Roll Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-3">
            {broll ? (
              <div className="flex items-center gap-4">
                <div
                  className="relative h-14 w-24 overflow-hidden rounded-lg border border-border bg-black cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setTrimmingClip(broll)}
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
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddBroll}
                  className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-primary"
                >
                  <Film className="size-3" /> Add B-Roll
                </Button>

                {showSearch ? (
                  <div className="flex items-center gap-2 pl-2 border-l border-border animate-in fade-in slide-in-from-left-2 duration-200">
                    <Input
                      autoFocus
                      placeholder="Search keyword..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleManualSearch();
                        if (e.key === "Escape") setShowSearch(false);
                      }}
                      className="h-7 w-32 text-[10px] bg-background border-border"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleManualSearch}
                      disabled={isSearching || !searchQuery.trim()}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                    >
                      {isSearching ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSearch(true)}
                    className="h-7 w-7 p-0 rounded-full border-border text-muted-foreground hover:text-primary"
                    title="Search B-Roll"
                  >
                    <Search className="size-3" />
                  </Button>
                )}

                <div className="relative">
                  <input
                    type="file"
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    accept="video/mp4,video/quicktime,image/jpeg,image/png"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-primary"
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

          {broll && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (broll.source === "user") {
                  setTrimmingClip(broll);
                } else {
                  onRegenerateBroll(broll);
                }
              }}
              className="h-8 gap-1.5 border-[#2a2a2a] bg-black text-xs text-white hover:bg-accent"
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
  onDelete,
  onSeek,
  broll,
  onAssignBroll,
  onRegenerateBroll,
  onRemoveBroll,
  onFetchAndAssignBroll,
  suggestions,
}: SegmentCardProps) {
  return (
    <>
      <SegmentCard
        {...{
          segment, index, isActive, onUpdate, onDelete, onSeek, broll,
          onAssignBroll, onRegenerateBroll, onRemoveBroll, onFetchAndAssignBroll, suggestions
        }}
      />
    </>
  );
}
