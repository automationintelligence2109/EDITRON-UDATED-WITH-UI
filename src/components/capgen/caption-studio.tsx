"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Upload,
  FileAudio,
  FileVideo,
  Sparkles,
  Loader2,
  Trash2,
  Plus,
  Download,
  Play,
  Pause,
  Wand2,
  Film,
  Type as TypeIcon,
  Settings2,
  CheckCircle2,
  AlertCircle,
  Video,
  Clapperboard,
  Anchor,
  AudioLines,
  Pencil,
  Maximize,
  Volume2,
  VolumeX,
} from "lucide-react";
import { INDIAN_LANGUAGES, INTERNATIONAL_LANGUAGES, getFontFamily } from "@/lib/languages";
import {
  DEFAULT_STYLE,
  downloadFile,
  formatClock,
  generateSRT,
  generateTXT,
  generateVTT,
  type CaptionSegment,
  type CaptionStyle,
} from "@/lib/captions";
import { CaptionPreview } from "./caption-preview";
import { StylePanel } from "./style-panel";
import { SegmentCard } from "./segment-card";
import { activeBrollAt, type BRollClip, buildBrollWindows } from "@/lib/broll";
import { LiquidMetalButton } from "./liquid-metal-button";
import { cn } from "@/lib/utils";
import { applyAutoEmojis } from "@/lib/emojis";

type Stage = "idle" | "uploading" | "transcribing" | "timing" | "done" | "error";

const STAGE_LABELS: Record<Stage, string> = {
  idle: "Idle",
  uploading: "Uploading file…",
  transcribing: "Transcribing speech with Whisper AI…",
  timing: "Aligning word timings…",
  done: "Captions ready",
  error: "Something went wrong",
};

const ACCEPTED = ".mp4,.mp3,.wav,.m4a,.webm,.mov,.ogg,.aac,.mkv";

export function CaptionStudio() {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isAudio, setIsAudio] = useState(false);
  const [language, setLanguage] = useState("en-US");
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [segments, setSegments] = useState<CaptionSegment[]>([]);
  const [style, setStyle] = useState<CaptionStyle>(DEFAULT_STYLE);
  const [brolls, setBrolls] = useState<BRollClip[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<number>(16 / 9);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [activeTab, setActiveTab] = useState<"preview" | "captions" | "style" | "broll">("preview");

  const [suggestions, setSuggestions] = useState<Record<string, any>>({});

  const fetchSuggestions = async () => {
    if (!segments.length) return;

    const MIN_GAP = 5.0;
    const MAX_GAP = 15.0;
    const finalWindows: any[] = [];

    const STOP_WORDS = new Set([
      "the", "a", "an", "this", "that", "and", "or", "but", "in", "on", "at", "to", "from", "by", "of", "with", "is", "are", "was", "were", "be", "been", "being", "it", "i", "you", "he", "she", "we", "they", "my", "your", "his", "her", "its", "our", "their", "can", "could", "will", "would", "should", "may", "might", "must", "do", "does", "did", "have", "has", "had"
    ]);

    const cleanQuery = (text: string) => {
      const words = text.toLowerCase().split(/\\s+/);
      const filtered = words.filter(w => !STOP_WORDS.has(w) && w.length > 1);
      return filtered.length > 0 ? filtered.join(" ") : text;
    };

    const calculateScore = (text: string) => {
      const words = text.toLowerCase().split(/\\s+/);
      if (words.length < 2) return 0.1;
      if (words.length > 12) return 0.3;

      let score = 0;
      words.forEach(w => {
        if (!STOP_WORDS.has(w) && w.length > 3) score += 1;
      });

      return score / words.length;
    };

    let currentSearchStart = 0;

    while (currentSearchStart < (segments[segments.length - 1]?.end || 0)) {
      const windowEnd = currentSearchStart + MAX_GAP;
      const candidates = segments.filter(s => s.start >= currentSearchStart && s.start <= windowEnd);

      if (candidates.length > 0) {
        let bestSeg = candidates[0];
        let maxScore = -1;

        candidates.forEach(s => {
          const score = calculateScore(s.text);
          if (score > maxScore) {
            maxScore = score;
            bestSeg = s;
          }
        });

        if (maxScore > 0.2) {
          finalWindows.push({
            id: `auto-${bestSeg.id}`,
            start: bestSeg.start,
            end: bestSeg.end,
            query: cleanQuery(bestSeg.text)
          });
          currentSearchStart = bestSeg.end + MIN_GAP;
        } else {
          currentSearchStart += 5.0;
        }
      } else {
        currentSearchStart += 5.0;
      }
    }

    if (finalWindows.length === 0 && segments.length > 0) {
      finalWindows.push({
        id: `auto-${segments[0].id}`,
        start: segments[0].start,
        end: segments[0].end,
        query: cleanQuery(segments[0].text)
      });
    }

    try {
      const res = await fetch("/api/broll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ windows: finalWindows }),
      });
      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      if (data.success) {
        const map: Record<string, any> = {};
        (data.results as any[]).forEach(r => {
          map[r.windowId] = { ...r, currentIndex: 0 };
        });
        setSuggestions(map);

        const autoAssignments: BRollClip[] = [];
        (data.results as any[]).forEach(r => {
          if (r.windowId.startsWith("auto-") && r.clips?.[0]) {
            const clip = r.clips[0];
            const seg = segments.find(s => s.id === r.windowId.replace("auto-", ""));
            if (seg) {
              autoAssignments.push({
                id: `${seg.id}-${clip.id}`,
                windowId: r.windowId,
                start: seg.start,
                end: Math.max(seg.end, seg.start + 3),
                source: clip.source,
                previewUrl: clip.previewUrl,
                thumbnail: clip.thumbnail,
                query: clip.query,
                durationHint: clip.durationHint,
              });
            }
          }
        });

        if (autoAssignments.length > 0) {
          setBrolls(prev => [...prev, ...autoAssignments].sort((a, b) => a.start - b.start));
        }
      } else {
        console.error("B-roll API error:", data.error);
      }
    } catch (e) {
      console.error("B-roll fetch failed", e);
    }
  };

  useEffect(() => {
    if (segments.length) fetchSuggestions();
  }, [segments.length]);

  const [wordsPerCaption, setWordsPerCaption] = useState(3);
  const [captionSpeed, setCaptionSpeed] = useState(1.0);
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [exportQuality, setExportQuality] = useState<"480p" | "720p" | "1080p">("1080p");
  const [autoEmojiEnabled, setAutoEmojiEnabled] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (segments.length === 0) return;

    setSegments((prev) => {
      return prev.map(s => ({
        ...s,
        text: autoEmojiEnabled
          ? applyAutoEmojis(s.text)
          : s.text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{1F600}-\u{1F64F}]/gu, "").trim()
      }));
    });
  }, [autoEmojiEnabled]);

  const handleFile = useCallback(
    (f: File | null) => {
      if (!f) return;
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      const url = URL.createObjectURL(f);
      setFile(f);
      setVideoUrl(url);
      setIsAudio(!f.type.startsWith("video/"));
      setSegments([]);
      setStage("idle");
      setErrorMsg(null);
      setAspectRatio(16 / 9);
    },
    [videoUrl]
  );

  useEffect(() => {
    const uploaded = (window as any).lastUploadedVideo;
    if (uploaded && uploaded.file) {
      handleFile(uploaded.file);
      delete (window as any).lastUploadedVideo;
    }
  }, [handleFile]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, [videoUrl]);

  useEffect(() => {
    let frameId: number;
    const updateTime = () => {
      if (videoRef.current && !videoRef.current.paused) {
        setCurrentTime(videoRef.current.currentTime);
      }
      frameId = requestAnimationFrame(updateTime);
    };
    updateTime();
    return () => cancelAnimationFrame(frameId);
  }, []);

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0] || null;
    handleFile(f);
  };

  const generate = async () => {
    if (!file) {
      setErrorMsg("Upload a file first.");
      setStage("error");
      return;
    }
    setErrorMsg(null);
    setStage("uploading");

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("language", language);
      fd.append("words_per_caption", String(wordsPerCaption));

      setTimeout(() => setStage("transcribing"), 250);

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Transcription failed.");
      }

      if (data.tightenedVideoUrl) {
        setVideoUrl(`/api/video?path=${encodeURIComponent(data.tightenedVideoUrl)}`);
      }

      setStage("timing");
      await new Promise((r) => setTimeout(r, 250));

      const rawSegs: any[] = (data.captions || []).map(
        (c: { id?: string; start: number; end: number; text: string; v_score?: number }, i: number) => ({
          id: c.id || `seg-${i}-${Math.random().toString(36).slice(2, 8)}`,
          start: c.start,
          end: c.end,
          text: c.text,
          v_score: c.v_score || 0,
        })
      );

      const segs: CaptionSegment[] = rawSegs.map(s => ({
        ...s,
        text: applyAutoEmojis(s.text)
      }));

      if (segs.length === 0) {
        throw new Error("No captions generated. Try a different file with clearer speech.");
      }

      setSegments(segs);
      if (data.language && data.language.length >= 2) {
        setLanguage(data.language);
      }
      setStage("done");
      setActiveTab("captions");
      setAutoEmojiEnabled(true);
      toast({
        title: "Captions ready!",
        description: `${segs.length} segments · language: ${data.language || language}${data.languageProbability ? ` (${Math.round(data.languageProbability * 100)}%)` : ""}`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transcription failed.";
      setErrorMsg(msg);
      setStage("error");
      toast({
        title: "Transcription failed",
        description: msg,
        variant: "destructive",
      });
    }
  };

  const loadSample = async () => {
    try {
      setStage("uploading");
      setErrorMsg(null);
      const res = await fetch("/api/sample-transcript");
      const data = await res.json();
      if (!data.success) throw new Error("Failed to load sample.");
      setStage("timing");
      await new Promise((r) => setTimeout(r, 250));
      setSegments(
        (data.segments as Array<{ start: number; end: number; text: string }>).map((s, i) => ({
          id: `sample-${i}-${Math.random().toString(36).slice(2, 6)}`,
          start: s.start,
          end: s.end,
          text: s.text,
        }))
      );
      setLanguage(data.language || "en-US");
      setStage("done");
      setActiveTab("captions");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sample load failed.";
      setErrorMsg(msg);
      setStage("error");
    }
  };

  const updateSegment = (id: string, patch: Partial<CaptionSegment & { deleted?: boolean }>) => {
    setSegments((prev) => prev.map((s) => {
      if (s.id === id) {
        let finalText = patch.text ?? s.text;
        if (autoEmojiEnabled && patch.text) {
          finalText = applyAutoEmojis(finalText);
        }
        return { ...s, ...patch, text: finalText } as CaptionSegment & { deleted?: boolean };
      }
      return s as CaptionSegment & { deleted?: boolean };
    }));
  };

  const assignClip = (segmentId: string, clip: any) => {
    setBrolls((prev) => {
      const windowId = clip.windowId;
      if (!windowId) return prev;

      const withoutThisWindow = prev.filter((b) => b.windowId !== windowId);
      const seg = segments.find(s => s.id === segmentId);
      const start = seg?.start || 0;

      const duration = Math.max(3, Math.min(4, 6));

      return [
        ...withoutThisWindow,
        {
          id: `${segmentId}-${clip.id}`,
          windowId: windowId,
          start: start,
          end: start + duration,
          source: clip.source,
          previewUrl: clip.previewUrl,
          thumbnail: clip.thumbnail,
          query: clip.query,
          durationHint: clip.durationHint,
        },
      ].sort((a, b) => a.start - b.start);
    });
  };

  const fetchAndAssignBroll = async (segmentId: string, text: string) => {
    try {
      const res = await fetch("/api/broll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          windows: [{
            id: `direct-${segmentId}`,
            start: 0,
            end: 6,
            query: text
          }]
        }),
      });

      if (!res.ok) throw new Error("Failed to fetch B-roll");
      const data = await res.json();

      if (!data.success || !data.results || data.results.length === 0) {
        toast({ title: "No clips found", description: `Could not find B-roll for "${text}"`, variant: "destructive" });
        return;
      }

      const bestClip = data.results[0].clips?.[0];
      if (!bestClip) {
        toast({ title: "No clips found", description: "The search returned no visual matches.", variant: "destructive" });
        return;
      }

      const seg = segments.find(s => s.id === segmentId);
      const start = seg?.start || 0;
      const duration = Math.max(3, Math.min(4, 6));

      setBrolls((prev) => {
        const windowId = `direct-${segmentId}`;
        const withoutThisWindow = prev.filter((b) => b.windowId !== windowId);
        return [
          ...withoutThisWindow,
          {
            id: `${segmentId}-${bestClip.id}`,
            windowId: windowId,
            start: start,
            end: start + duration,
            source: bestClip.source,
            previewUrl: bestClip.previewUrl,
            thumbnail: bestClip.thumbnail,
            query: text,
            durationHint: bestClip.durationHint,
          },
        ].sort((a, b) => a.start - b.start);
      });

      toast({ title: "B-roll added", description: `Added clip for "${text}"` });
    } catch (e) {
      console.error("Direct B-roll error:", e);
      toast({ title: "Error", description: "Failed to add B-roll automatically.", variant: "destructive" });
    }
  };

  const removeClip = (windowId: string) => {
    setBrolls((prev) => prev.filter((b) => b.windowId !== windowId));
  };

  const regenerateClip = async (clip: BRollClip) => {
    const windowId = clip.windowId;
    const query = clip.query;
    let s = suggestions[windowId];

    if (!s || !s.clips || s.clips.length === 0) {
      try {
        const res = await fetch("/api/broll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            windows: [{
              id: windowId,
              start: clip.start,
              end: clip.end,
              query: query
            }]
          }),
        });
        const data = await res.json();
        if (!data.success || !data.results?.[0]?.clips?.length) {
          toast({ title: "No clips available", description: "Could not find alternative clips.", variant: "destructive" });
          return;
        }

        const newClips = data.results[0].clips;
        const currentClipId = clip.id.includes('-') ? clip.id.split('-').pop() : clip.id;
        const filteredClips = newClips.filter(c => c.id !== currentClipId);

        if (filteredClips.length === 0) {
          toast({ title: "Same clip found", description: "API returned the same clip.", variant: "destructive" });
          return;
        }

        const suggestionResult = {
          windowId,
          start: clip.start,
          end: clip.end,
          query: query,
          clips: newClips,
          currentIndex: 0
        };
        setSuggestions(prev => ({ ...prev, [windowId]: suggestionResult }));
        s = suggestionResult;
      } catch (e) {
        console.error("Regen error:", e);
        toast({ title: "Error", description: "Failed to regenerate clip.", variant: "destructive" });
        return;
      }
    }

    const nextIndex = (s.currentIndex + 1) % s.clips.length;
    const selectedClip = s.clips[nextIndex];

    setSuggestions(prev => ({
      ...prev,
      [windowId]: {
        ...s,
        currentIndex: nextIndex
      }
    }));

    setBrolls((prev) => {
      const withoutThisWindow = prev.filter((b) => b.windowId !== windowId);
      const duration = Math.max(3, Math.min(clip.end - clip.start, 4));
      return [
        ...withoutThisWindow,
        {
          id: `${windowId}-${selectedClip.id}`,
          windowId: windowId,
          start: clip.start,
          end: clip.start + duration,
          source: selectedClip.source,
          previewUrl: selectedClip.previewUrl,
          thumbnail: selectedClip.thumbnail,
          query: query,
          durationHint: selectedClip.durationHint,
        },
      ].sort((a, b) => a.start - b.start);
    });

    toast({ title: "B-roll cycled", description: `Switched to clip ${nextIndex + 1} of ${s.clips.length}` });
  };

  const addSegment = () => {
    const lastEnd = segments.length ? segments[segments.length - 1].end : 0;
    const seg: CaptionSegment = {
      id: `seg-new-${Math.random().toString(36).slice(2, 8)}`,
      start: lastEnd,
      end: +(lastEnd + 1.5).toFixed(3),
      text: "new caption",
    };
    setSegments((prev) => [...prev, seg]);
    setEditingId(seg.id);
    setEditText(seg.text);
  };

  const commitEdit = (id: string) => {
    let finalText = editText.trim() || " ";
    if (autoEmojiEnabled) {
      finalText = applyAutoEmojis(finalText);
    }
    updateSegment(id, { text: finalText });
    setEditingId(null);
    setEditText("");
  };

  const seekTo = (t: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = t;
      setCurrentTime(t);
      if (!isPlaying) {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMute = !videoRef.current.muted;
    videoRef.current.muted = nextMute;
    setIsMuted(nextMute);
  };

  const toggleFullScreen = () => {
    if (!videoRef.current) return;
    if (!document.fullscreenElement) {
      videoRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const exportSRT = () => {
    if (!segments.length) return;
    downloadFile("capgen-captions.srt", generateSRT(segments), "application/x-subrip");
  };

  const exportVTT = () => {
    if (!segments.length) return;
    downloadFile("capgen-captions.vtt", generateVTT(segments), "application/x-subrip");
  };

  const exportTXT = () => {
    if (!segments.length) return;
    downloadFile("capgen-transcript.txt", generateTXT(segments), "text/plain");
  };

  const exportVideo = async () => {
    const video = videoRef.current;
    if (!video || !segments.length || !videoUrl) return;

    setIsExportingVideo(true);
    setExportProgress(0);
    setExportMsg("Preparing canvas…");

    try {
      if (!video.videoWidth || !video.videoHeight) {
        await new Promise<void>((resolve, reject) => {
          const onLoad = () => resolve();
          const onError = () => reject(new Error("Video failed to load"));
          video.addEventListener("loadedmetadata", onLoad, { once: true });
          video.addEventListener("error", onError, { once: true });
          setTimeout(() => reject(new Error("Video metadata timeout")), 5000);
        });
      }

      const vw = video.videoWidth || 1280;
      const vh = video.videoHeight || 720;

      const QUALITY_LONG_SIDE: Record<typeof exportQuality, number> = {
        "480p": 480,
        "720p": 720,
        "1080p": 1080,
      };
      const maxDim = QUALITY_LONG_SIDE[exportQuality];
      let cw: number;
      let ch: number;
      if (aspectRatio >= 1) {
        cw = maxDim;
        ch = Math.round(maxDim / aspectRatio);
      } else {
        ch = maxDim;
        cw = Math.round(maxDim * aspectRatio);
      }
      cw = cw % 2 === 0 ? cw : cw + 1;
      ch = ch % 2 === 0 ? ch : ch + 1;

      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");

      const canvasStream = canvas.captureStream(30);

      const combinedStream = canvasStream;
      let cleanupAudioContext: (() => void) | null = null;
      try {
        const videoEl = video as HTMLVideoElement & { captureStream?: () => MediaStream; mozCaptureHStream?: () => MediaStream };
        const vStream = videoEl.captureStream?.() || (videoEl as any).mozCaptureStream?.();
        if (vStream) {
          const audioTracks = vStream.getAudioTracks();
          if (audioTracks.length > 0) {
            audioTracks.forEach((at) => combinedStream.addTrack(at));
          }
        }
      } catch {
      }

      const mimeCandidates = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
        "video/mp4",
      ];
      const mimeType = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || "video/webm";
      const fileExt = mimeType.includes("mp4") ? "mp4" : "webm";

      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond:
          exportQuality === "1080p" ? 8_000_000 : exportQuality === "720p" ? 5_000_000 : exportQuality === "2_500_000",
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const done = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      });

      video.pause();
      video.currentTime = 0;
      video.muted = true;
      await new Promise((r) => setTimeout(r, 100));

      const totalDuration = video.duration || segments[segments.length - 1]?.end || 10;

      const fontFamilyCss = getFontFamily(style.fontFamily);
      const fontWeight = style.bold ? "800" : "500";
      const fontStyle = style.italic ? "italic" : "normal";

      const brollEls = new Map<string, HTMLVideoElement>();
      let brollTainted = false;
      let lastActiveBrollId: string | null = null;
      if (brolls.length) {
        setExportMsg("Loading b-roll clips…");
        await Promise.all(
          brolls.map(
            (b) =>
              new Promise<void>((resolve) => {
                if (brollEls.has(b.previewUrl)) return resolve();
                const el = document.createElement("video");
                el.crossOrigin = "anonymous";
                el.src = b.previewUrl;
                el.muted = true;
                el.loop = true;
                el.playsInline = true;
                el.preload = "auto";
                const done = () => resolve();
                el.addEventListener("loadeddata", done, { once: true });
                el.addEventListener("error", done, { once: true });
                setTimeout(done, 4000);
                brollEls.set(b.previewUrl, el);
                el.load();
              })
          )
        );
      }

      setExportMsg("Recording…");

      recorder.start(100);
      await video.play();

      const renderFrame = () => {
        if (video.paused || video.ended) {
          finishExport();
          return;
        }
        const t = video.currentTime;

        const activeBroll = !brollTainted ? brolls.find((b) => t >= b.start && t < b.end) : undefined;
        const brollEl = activeBroll ? brollEls.get(activeBroll.previewUrl) : undefined;

        if (activeBroll?.id !== lastActiveBrollId) {
          if (lastActiveBrollId) {
            const prevBroll = brolls.find((b) => b.id === lastActiveBrollId);
            const prevEl = prevBroll ? brollEls.get(prevBroll.previewUrl) : undefined;
            prevEl?.pause();
          }
          if (brollEl) {
            brollEl.currentTime = 0;
            brollEl.play().catch(() => {});
          }
          lastActiveBrollId = activeBroll?.id ?? null;
        }

        try {
          if (brollEl && brollEl.readyState >= 2) {
            drawCover(ctx, brollEl, brollEl.videoWidth, brollEl.videoHeight, cw, ch);
          } else {
            drawCover(ctx, video, vw, vh, cw, ch);
          }
        } catch {
          brollTainted = true;
          drawCover(ctx, video, vw, vh, cw, ch);
          toast({
            title: "B-roll export limited",
            description: "One or more b-roll sources blocked canvas capture (CORS). Continuing export without cutaways.",
            variant: "destructive",
          });
        }

        const seg = segments.find((s) => t >= s.start && t < s.end);
        if (seg) {
          drawCaption(ctx, seg, cw, ch, style, fontFamilyCss, fontWeight, fontStyle, t);
        }

        setExportProgress(Math.min(100, Math.round((t / totalDuration) * 100)));

        if (t < totalDuration) {
          requestAnimationFrame(renderFrame);
        } else {
          finishExport();
        }
      };

      const finishExport = () => {
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
        video.pause();
        video.muted = false;
        brollEls.forEach((el) => {
          el.pause();
          el.src = "";
        });
        cleanupAudioContext?.();
      };

      requestAnimationFrame(renderFrame);

      const blob = await done;
      combinedStream.getTracks().forEach((t) => t.stop());

      setExportMsg("Saving file…");
      setExportProgress(100);

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `capgen-captioned-video.${fileExt}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setExportMsg(null);
      setIsExportingVideo(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Video export failed";
      console.error("[exportVideo]", msg);
      setExportMsg(`Export failed: ${msg}`);
      setIsExportingVideo(false);
      setTimeout(() => setExportMsg(null), 5000);
    }
  };

  const updateStyle = (patch: Partial<CaptionStyle>) => {
    setStyle((s) => {
      const updated = { ...s, ...patch };

      if (patch.hyperStyleId) {
        const styleId = patch.hyperStyleId;
        if (styleId === "pop-cinematic") {
          updated.textColor = "#FFFFFF";
          updated.highlightColor = "#FF6B1A";
          updated.fontFamily = "archivo-black";
          updated.template = "active-word";
          updated.animation = "pop";
        } else if (styleId === "mr-beast-style") {
          updated.textColor = "#FFFF00";
          updated.highlightColor = "#FFFFFF";
          updated.fontFamily = "anton";
          updated.template = "active-word";
          updated.animation = "pop";
          updated.uppercase = true;
        } else if (styleId === "minimal-doc") {
          updated.textColor = "#EEEEEE";
          updated.highlightColor = "#FFFFFF";
          updated.fontFamily = "inter";
          updated.animation = "none";
          updated.uppercase = false;
        } else if (styleId === "hormozi-energy") {
          updated.textColor = "#FFFFFF";
          updated.highlightColor = "#CFFF00";
          updated.fontFamily = "bebas-neue";
          updated.template = "active-word";
          updated.animation = "pop";
          updated.uppercase = true;
        } else if (styleId === "luxury-aesthetic") {
          updated.textColor = "#FFFFFF";
          updated.highlightColor = "#F5F5F5";
          updated.fontFamily = "playfair-display";
          updated.template = "plain";
          updated.animation = "slide";
          updated.uppercase = false;
          updated.italic = true;
        } else if (styleId === "cyber-neon") {
          updated.textColor = "#00FFFF";
          updated.highlightColor = "#FF00FF";
          updated.fontFamily = "russo-one";
          updated.template = "active-word";
          updated.animation = "pop";
          updated.bgColor = "#000000";
          updated.bgOpacity = 70;
        } else if (styleId === "podcast-clean") {
          updated.textColor = "#FFFFFF";
          updated.highlightColor = "#FFB800";
          updated.fontFamily = "montserrat";
          updated.template = "active-word";
          updated.animation = "slide";
          updated.uppercase = false;
        } else if (styleId === "viral-breaking") {
          updated.textColor = "#FFFFFF";
          updated.highlightColor = "#FFFFFF";
          updated.fontFamily = "archivo-black";
          updated.template = "boxed";
          updated.animation = "pop";
          updated.bgColor = "#FF0000";
          updated.bgOpacity = 100;
          updated.uppercase = true;
        }
      }

      return updated;
    });
  };

  const generateHookTitle = useCallback(async () => {
    // Removed
  }, []);

  const toggleHookTitle = (enabled: boolean) => {
    // Removed
  };

  const canExport = segments.length > 0;
  const activeIdx = segments.findIndex((s) => currentTime >= s.start && currentTime < s.end);

  function drawCover(ctx: CanvasRenderingContext2D, el: HTMLVideoElement, vw: number, vh: number, cw: number, ch: number) {
    const scale = Math.max(cw / vw, ch / vh);
    const x = (cw - vw * scale) / 2;
    const y = (ch - vh * scale) / 2;
    ctx.drawImage(el, x, y, vw * scale, vh * scale);
  }
  function drawCaption(ctx: CanvasRenderingContext2D, seg: CaptionSegment, cw: number, ch: number, style: CaptionStyle, font: string, weight: string, italic: string, t: number) {
    ctx.save();
    ctx.font = `${weight} ${style.fontSize}px ${font}`;
    ctx.fillStyle = style.textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(seg.text, cw / 2, ch * 0.85);
    ctx.restore();
  }
  function drawHookTitle(ctx: CanvasRenderingContext2D, text: string, cw: number, ch: number) {
    ctx.save();
    ctx.font = "bold 40px sans-serif";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText(text, cw / 2, ch * 0.2);
    ctx.restore();
  }

  return (
    <section id="studio" className="relative scroll-mt-20 bg-background py-14 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold text-foreground">
            <Sparkles className="size-3.5" />
            Live caption studio
          </div>
          <h2 className="text-balance text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Caption a video <span className="capgen-gradient-text">right now</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground">
            Upload a clip, pick a language, hit generate. Edit word timings, style the captions, export SRT — all in your browser.
          </p>
        </div>

        {/* Studio card */}
        <div className="overflow-hidden rounded-3xl border-liquid-metal bg-zinc-950 shadow-2xl">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-b border-zinc-800 bg-black px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Film className="size-4.5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Editron Studio</div>
                <div className="text-xs text-muted-foreground">
                  {file ? file.name : "No file loaded"}{" "}
                  {file && <span className="text-primary">· {(file.size / 1024 / 1024).toFixed(2)} MB</span>}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="h-9 w-[200px] border-border bg-card text-sm">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Indian · 14</SelectLabel>
                    {INDIAN_LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>
                        {l.name}
                        {l.roman && (
                          <span className="ml-1 rounded bg-secondary px-1 text-[10px] uppercase text-primary">
                            roman
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>International · 68</SelectLabel>
                    {INTERNATIONAL_LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>
                        {l.name}
                        {l.roman && (
                          <span className="ml-1 rounded bg-secondary px-1 text-[10px] uppercase text-primary">
                            roman
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3">
                      <Label htmlFor="wpc-input" className="text-xs font-medium text-muted-foreground">
                        Words/caption
                      </Label>
                      <Input
                        id="wpc-input"
                        type="number"
                        min={1}
                        max={12}
                        value={wordsPerCaption}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (!isNaN(v)) setWordsPerCaption(Math.max(1, Math.min(12, v)));
                          else setWordsPerCaption(6);
                        }}
                        className="h-6 w-12 border-transparent bg-transparent p-0 text-center text-sm text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Words per caption segment (1–12). Lower = more frequent caption pops.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <LiquidMetalButton
                label="Generate Captions"
                onClick={generate}
                width={160}
                className="disabled:opacity-50"
              />

              <LiquidMetalButton
                label="Try with sample"
                onClick={loadSample}
                width={140}
              />
            </div>
          </div>

          {/* Progress bar */}
          {stage !== "idle" && (
            <div className="border-b border-border bg-card px-4 py-2 sm:px-6">
              <div className="flex items-center gap-2 text-xs">
                {stage === "error" ? (
                  <AlertCircle className="size-4 text-red-500" />
                ) : stage === "done" ? (
                  <CheckCircle2 className="size-4 text-primary" />
                ) : (
                  <Loader2 className="size-4 animate-spin text-primary" />
                )}
                <span className={cn("font-medium", stage === "error" ? "text-red-600" : "text-white")}>
                  {STAGE_LABELS[stage]}
                </span>
                {errorMsg && <span className="text-red-500">— {errorMsg}</span>}
                {stage === "done" && segments.length > 0 && (
                  <span className="ml-auto text-muted-foreground">
                    {segments.length} segments · {segments.reduce((a, s) => a + s.text.split(/\\s+/).length, 0)} words
                  </span>
                )}
              </div>
              {stage !== "error" && stage !== "done" && (
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    className="h-full bg-primary"
                    initial={false}
                    animate={{
                      width:
                        stage === "uploading" ? "30%" : stage === "transcribing" ? "70%" : stage === "timing" ? "92%" : "100%",
                    }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Body */}
          <div className="grid gap-0 lg:grid-cols-[1.4fr_1fr]">
            {/* Left: preview + upload */}
            <div className="border-b border-border p-4 sm:p-6 lg:border-b-0 lg:border-r">
              {videoUrl ? (
                <div className="space-y-3">
                  <CaptionPreview
                    videoUrl={videoUrl}
                    isAudio={isAudio}
                    segments={segments}
                    currentTime={currentTime}
                    style={style}
                    videoRef={videoRef}
                    aspectRatio={aspectRatio}
                    onTimeUpdate={(t) => setCurrentTime(t)}
                    onLoadedMetadata={(d) => setDuration(d)}
                    onVideoDimensions={(w, h) => {
                      if (w > 0 && h > 0) {
                        setAspectRatio(w / h);

                        const baselineSize = Math.round(w * 0.05);

                        if (style.fontSize === DEFAULT_STYLE.fontSize) {
                          setStyle((s) => ({ ...s, fontSize: Math.max(14, Math.min(120, baselineSize)) }));
                        }
                      }
                    }}
                    brolls={brolls}
                    hookTitle=""
                    onChangeStyle={(patch) => setStyle((s) => ({ ...s, ...patch }))}
                  />
                  {/* Professional Seek Bar */}
                  <div
                    className="relative h-2 w-full cursor-pointer rounded-full bg-secondary overflow-hidden group"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const pos = Math.max(0, Math.min(1, x / rect.width));
                      seekTo(pos * duration);
                    }}
                  >
                    {/* B-Roll Markers - Rendered FIRST so they are in the background */}
                    <div className="absolute inset-0 pointer-events-none flex items-center">
                      {brolls && brolls.map((b, idx) => {
                        const left = duration > 0 ? (b.start / duration) * 100 : 0;
                        const width = duration > 0 ? ((b.end - b.start) / duration) * 100 : 0;
                        if (duration <= 0) return null;
                        return (
                          <div
                            key={`${b.id}-${idx}`}
                            className="absolute h-full bg-[#FF6B1A] z-0"
                            style={{
                              left: `${left}%`,
                              width: `${width}%`,
                            }}
                            title={`B-Roll: ${b.query}`}
                          />
                        );
                      })}
                    </div>
                    {/* Playhead - Using a distinct style to ensure it doesn't "wipe out" the orange */}
                    <div
                      className="absolute top-0 h-full bg-white/30 transition-all duration-100 ease-linear z-10"
                      style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                    />
                    {/* Playhead Indicator Line - The sharp white line */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-white z-20"
                      style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                    />
                  </div>

                  {/* Mini player controls */}
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 relative z-10">
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                      aria-label={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
                    </button>
                    <span className="font-mono text-xs text-muted-foreground">
                      {formatClock(currentTime)} / {formatClock(duration)}
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={toggleMute}
                        className="text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={toggleFullScreen}
                        className="text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        <Maximize className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        <Upload className="size-4" />
                        Replace
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  style={{ aspectRatio: "16 / 9" }}
                  className={cn(
                    "grid w-full cursor-pointer place-items-center rounded-xl border-2 border-dashed bg-black p-6 text-center transition-all duration-300",
                    dragOver ? "border-zinc-400 bg-zinc-900/50" : "border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/30"
                  )}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
                  }}
                >
                  <div className="mx-auto max-w-md">
                    <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
                      <Upload className="size-7" />
                    </div>
                    <h3 className="text-lg font-bold text-white">
                      Drop a video or audio file
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      mp4 · mp3 · wav · m4a · webm · mov · up to 150MB
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <Button type="button" className="bg-primary text-primary-foreground hover:bg-primary/90">
                        <Upload className="size-4" />
                        Choose file
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          loadSample();
                        }}
                        className="border-border bg-card text-white hover:bg-accent hover:text-foreground"
                      >
                        <Sparkles className="size-4" />
                        Try sample
                      </Button>
                    </div>
                    <p className="mt-4 text-xs text-muted-foreground">
                      Audio is processed locally — only the bytes are sent to /api/transcribe for ASR.
                    </p>
                  </div>
                </div>
              )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED}
                  onChange={(e) => handleFile(e.target.files?.[0] || null)}
                  className="hidden"
                  aria-hidden="true"
                />

              {/* Export buttons */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Export
                </span>
                <Select value={exportQuality} onValueChange={(v) => setExportQuality(v as typeof exportQuality)}>
                  <SelectTrigger className="h-9 w-[100px] border-border bg-card text-xs">
                    <SelectValue placeholder="Quality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="480p">480p</SelectItem>
                    <SelectItem value="720p">720p</SelectItem>
                    <SelectItem value="1080p">1080p</SelectItem>
                  </SelectContent>
                </Select>
                <LiquidMetalButton
                  label="Export Video"
                  onClick={exportVideo}
                  width={130}
                  className="disabled:opacity-50"
                />
                {!canExport && (
                  <span className="text-xs text-muted-foreground">Generate captions to enable export</span>
                )}
                {canExport && isAudio && (
                  <span className="text-xs text-muted-foreground">Video export needs a video file (not audio-only)</span>
                )}
              </div>

              {/* Export progress bar */}
              {(isExportingVideo || exportMsg) && (
                <div className="mt-3 rounded-lg border border-border bg-background px-4 py-2">
                  <div className="flex items-center gap-2 text-xs">
                    {exportMsg && exportMsg.startsWith("Export failed") ? (
                      <AlertCircle className="size-4 text-red-500" />
                    ) : isExportingVideo ? (
                      <Loader2 className="size-4 animate-spin text-primary" />
                    ) : (
                      <Clapperboard className="size-4 text-primary" />
                    )}
                    <span className={cn("font-medium", exportMsg?.startsWith("Export failed") ? "text-red-s500" : "text-white")}>
                      {exportMsg || "Processing…"}
                    </span>
                  </div>
                  {isExportingVideo && (
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-secondary">
                      <motion.div
                        className="h-full bg-primary"
                        initial={false}
                        animate={{ width: `${exportProgress}%` }}
                        transition={{ duration: 0.2 }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* AI Tools */}
              <div className="mt-4 rounded-lg border-liquid-metal bg-zinc-950 p-3">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  AI Tools
                </h4>
                <div className="text-xs text-muted-foreground italic">
                  Advanced tools are currently disabled.
                </div>
              </div>
            </div>

            {/* Right: Tab-based Editor */}
            <div className="bg-background p-4 sm:p-6 border-l border-liquid-metal">
              <div className="flex items-center justify-center gap-3 rounded-full bg-zinc-900 p-1 mb-6 border border-zinc-800">
                {[
                  { id: "captions", label: "Captions", icon: TypeIcon },
                  { id: "style", label: "Style", icon: Settings2 },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "flex items-center gap-2 px-6 py-2 rounded-full text-xs font-bold transition-all",
                      activeTab === tab.id
                        ? "bg-white text-black shadow-lg scale-105"
                        : "text-zinc-500 hover:text-white hover:bg-zinc-800"
                    )}
                  >
                    <tab.icon className="size-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === "captions" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Caption Segments ({segments.length})
                    </h4>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={addSegment}
                      className="h-7 border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800"
                    >
                      <Plus className="size-3.5" />
                      Add Segment
                    </Button>
                  </div>
                  <ScrollArea className="capgen-scroll h-[550px] rounded-lg border border-zinc-800 bg-zinc-950">
                    <div className="flex flex-col gap-3 p-3">
                      {segments.length === 0 && (
                        <div className="p-6 text-center text-sm text-muted-foreground">
                          No segments yet. Generate captions or click <strong className="text-primary">Add Segment</strong>.
                        </div>
                      )}
                      {segments.map((seg, i) => {
                        const broll = brolls.find(b =>
                          b.windowId === `w-${seg.start.toFixed(1)}` ||
                          b.windowId === `direct-${seg.id}` ||
                          b.windowId === `manual-${seg.id}` ||
                          b.windowId === `user-upload-${seg.id}` ||
                          b.windowId.startsWith(`auto-`) && b.windowId.replace("auto-", "") === seg.id
                        );

                        return (
                          <SegmentCard
                            key={seg.id}
                            index={i}
                            segment={seg}
                            isActive={activeIdx === i}
                            onUpdate={updateSegment}
                            onDelete={(id) => updateSegment(id, { deleted: true })}
                            onSeek={seekTo}
                            broll={broll}
                            onAssignBroll={assignClip}
                            onRegenerateBroll={regenerateClip}
                            onRemoveBroll={removeClip}
                            onFetchAndAssignBroll={fetchAndAssignBroll}
                            suggestions={suggestions}
                          />
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {activeTab === "style" && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Global Style Settings
                    </h4>
                    <Settings2 className="size-4 text-muted-foreground" />
                  </div>
                  <StylePanel
                    style={style}
                    onChange={updateStyle}
                    autoEmojiEnabled={autoEmojiEnabled}
                    onAutoEmojiChange={setAutoEmojiEnabled}
                    wordsPerCaption={wordsPerCaption}
                    onWordsPerCaptionChange={setWordsPerCaption}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Below studio: file type hints */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <FileVideo className="size-3.5 text-primary" /> Video: mp4, webm, mov, mkv
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FileAudio className="size-3.5 text-primary" /> Audio: mp3, wav, m4a, ogg, aac
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-primary" /> 150MB max
          </span>
        </div>
      </div>
    </section>
  );
}
