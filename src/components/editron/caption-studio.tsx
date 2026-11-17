"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import {
  Upload,
  FileAudio,
  FileVideo,
  Sparkles,
  Loader2,
  Trash2,
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
import { getFontFamily } from "@/lib/languages";
import {
  DEFAULT_STYLE,
  CINEMATIC_PRESETS,
  downloadFile,
  formatClock,
  getActiveWordIndex,
  getCaptionWordRenderState,
  getCaptionWords,
  getCaptionPositionBase,
  getEaseOutProgress,
  generateSRT,
  generateTXT,
  generateVTT,
  layoutCaptionWords,
  type CaptionSegment,
  type CaptionStyle,
} from "@/lib/captions";
import { CaptionPreview } from "./caption-preview";
import { ProcessingOrb } from "./processing-orb";
import { StylePanel } from "./style-panel";
import { SegmentCard } from "./segment-card";
import {
  activeBrollAt,
  fetchBrollSuggestions,
  isBrollImage,
  limitBrollWindows,
  type BRollClip,
  buildBrollWindows,
} from "@/lib/broll";
import {
  activeBrollTransitionAt,
  assignBrollTransitions,
  BROLL_TRANSITIONS,
  cycleBrollTransitions,
} from "@/lib/broll-transitions";
import { createProject, getProject, updateProject } from "@/lib/recent-projects";
import type { ProjectSnapshot } from "@/lib/project-state";
import { LiquidMetalButton } from "./liquid-metal-button";
import { cn } from "@/lib/utils";
import { applyAutoEmojis } from "@/lib/emojis";
import { getExportDimensions, type ExportQuality } from "@/lib/export-dimensions";
import { RecordingError, supportedRecordingTypes } from "@/lib/export-recording";
import { isInterruptedPlayback } from "@/lib/media-playback";
import { hasUnsavedWorkspaceWork } from "@/lib/workspace-session";
import { brollBelongsToSegment, regroupCaptions } from "@/lib/caption-regroup";

type Stage = "idle" | "uploading" | "queued" | "transcribing" | "timing" | "done" | "error";

const STAGE_LABELS: Record<Stage, string> = {
  idle: "Idle",
  uploading: "Uploading file…",
  queued: "Waiting for a video worker…",
  transcribing: "Processing video…",
  timing: "Aligning word timings…",
  done: "Captions ready",
  error: "Something went wrong",
};

const PROCESSING_MESSAGES = ["Cooking up your edit", "Making some magic", "Crafting your edit"];

function ProcessingMessage() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMessageIndex((index) => (index + 1) % PROCESSING_MESSAGES.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      <span className="sr-only">Your edit is processing.</span>
      <p className="mt-3 text-sm font-medium text-zinc-300" aria-hidden="true">
        {PROCESSING_MESSAGES[messageIndex]}…
      </p>
    </>
  );
}

const ACCEPTED = ".mp4,.mp3,.wav,.m4a,.webm,.mov,.ogg,.aac,.mkv";

export function CaptionStudio({
  initialFile = null,
  projectId = null,
  onSavedProjectChange,
  onUnsavedWorkChange,
}: {
  initialFile?: File | null;
  projectId?: string | null;
  onSavedProjectChange?: (projectId: string | null) => void;
  onUnsavedWorkChange?: (hasUnsavedWork: boolean) => void;
}) {
  const reduceMotion = useReducedMotion();
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [sourceKey, setSourceKey] = useState<string | null>(null);
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);
  const [projectLoadState, setProjectLoadState] = useState<"loading" | "ready" | "error">(
    projectId ? "loading" : "ready",
  );
  const [projectSaveState, setProjectSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveRetry, setSaveRetry] = useState(0);
  const [isAudio, setIsAudio] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [segments, setSegments] = useState<CaptionSegment[]>([]);
  const [style, setStyle] = useState<CaptionStyle>(DEFAULT_STYLE);
  const [brolls, setBrolls] = useState<BRollClip[]>([]);
  const [brollTransitionsEnabled, setBrollTransitionsEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<number>(16 / 9);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [activeTab, setActiveTab] = useState<"captions" | "style">("captions");

  const [suggestions, setSuggestions] = useState<Record<string, any>>({});
  const skipSuggestionsRef = useRef(false);
  const suggestionsRequestRef = useRef(0);
  const pendingSuggestedSegmentIdsRef = useRef<Set<string>>(new Set());
  const skipAutosaveRef = useRef(false);
  const projectIdRef = useRef<string | null>(null);
  const sourceKeyRef = useRef<string | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const saveRevisionRef = useRef(0);
  const projectSnapshotRef = useRef<ProjectSnapshot | null>(null);

  const fetchSuggestions = async (requestId: number) => {
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

    const searchWindows = limitBrollWindows(finalWindows);
    pendingSuggestedSegmentIdsRef.current = new Set(
      searchWindows.map((window) => window.id.slice("auto-".length)),
    );
    try {
      const results = await fetchBrollSuggestions(searchWindows);
      if (requestId !== suggestionsRequestRef.current) return;
      if (results.length) {
        const map: Record<string, any> = {};
        results.forEach(r => {
          map[r.windowId] = { ...r, currentIndex: 0 };
        });
        setSuggestions(map);

        const autoAssignments: BRollClip[] = [];
        results.forEach(r => {
          if (r.windowId.startsWith("auto-") && r.clips?.[0]) {
            const clip = r.clips[0];
            const seg = segments.find(s => s.id === r.windowId.replace("auto-", ""));
            if (seg) {
              autoAssignments.push(assignBrollTransitions({
                id: `${seg.id}-${clip.id}`,
                windowId: r.windowId,
                segmentId: seg.id,
                start: seg.start,
                end: Math.max(seg.end, seg.start + 3),
                source: clip.source,
                previewUrl: clip.previewUrl,
                thumbnail: clip.thumbnail,
                query: r.query,
                durationHint: clip.durationHint,
              }));
            }
          }
        });

        if (autoAssignments.length > 0) {
          setBrolls(prev =>
            cycleBrollTransitions(
              [...prev, ...autoAssignments].sort((a, b) => a.start - b.start)
            )
          );
        }
      }
    } catch (error) {
      if (requestId !== suggestionsRequestRef.current) return;
      const message = error instanceof Error ? error.message : "Could not load B-roll suggestions.";
      console.error("B-roll fetch failed", error);
      toast({
        title: "B-roll suggestions unavailable",
        description: message,
        variant: "destructive",
      });
    } finally {
      if (requestId === suggestionsRequestRef.current) {
        pendingSuggestedSegmentIdsRef.current.clear();
      }
    }
  };

  useEffect(() => {
    if (stage !== "done" || !segments.length) return;
    if (skipSuggestionsRef.current) {
      skipSuggestionsRef.current = false;
      return;
    }
    const requestId = ++suggestionsRequestRef.current;
    void fetchSuggestions(requestId);
    return () => {
      suggestionsRequestRef.current += 1;
      pendingSuggestedSegmentIdsRef.current.clear();
    };
  }, [stage]);

  const [wordsPerCaption, setWordsPerCaption] = useState(5);
  const [wordsPerCaptionInput, setWordsPerCaptionInput] = useState("5");
  const [pendingBrollOperations, setPendingBrollOperations] = useState(0);
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [exportQuality, setExportQuality] = useState<ExportQuality>("1080p");
  const [exportProgress, setExportProgress] = useState(0);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const loadedInitialFileRef = useRef<File | null>(null);
  const generationRequestIdRef = useRef(0);
  const generationAbortControllerRef = useRef<AbortController | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const projectSnapshot = useMemo<ProjectSnapshot>(() => ({
    sourceName,
    isAudio,
    segments,
    style,
    brolls,
    aspectRatio,
    wordsPerCaption,
    autoEmojiEnabled: true,
    brollTransitionsEnabled,
  }), [
    sourceName,
    isAudio,
    segments,
    style,
    brolls,
    aspectRatio,
    wordsPerCaption,
    brollTransitionsEnabled,
  ]);

  useEffect(() => {
    projectSnapshotRef.current = projectSnapshot;
  }, [projectSnapshot]);

  useEffect(() => {
    if (
      projectLoadState !== "ready" ||
      segments.length === 0 ||
      (!savedProjectId && !sourceKey)
    ) {
      return;
    }
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }

    const revision = ++saveRevisionRef.current;
    setProjectSaveState("saving");
    const timer = window.setTimeout(() => {
      const expectedSourceKey = sourceKey;
      saveQueueRef.current = saveQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          const snapshot = projectSnapshotRef.current;
          if (!snapshot) return;

          const currentProjectId = projectIdRef.current;
          if (currentProjectId) {
            setProjectSaveState("saving");
            await updateProject(currentProjectId, {
              name: snapshot.sourceName.replace(/\.[^.]+$/, "") || "Untitled project",
              snapshot,
            });
          } else {
            const currentSourceKey = sourceKeyRef.current;
            if (!currentSourceKey || currentSourceKey !== expectedSourceKey) return;
            setProjectSaveState("saving");
            const createdProject = await createProject({
              name: snapshot.sourceName.replace(/\.[^.]+$/, "") || "Untitled project",
              sourceKey: currentSourceKey,
              snapshot,
            });
            if (sourceKeyRef.current !== currentSourceKey) return;
            skipAutosaveRef.current = revision === saveRevisionRef.current;
            projectIdRef.current = createdProject.id;
            setSavedProjectId(createdProject.id);
            onSavedProjectChange?.(createdProject.id);
          }

          if (revision === saveRevisionRef.current) setProjectSaveState("saved");
        })
        .catch((error: unknown) => {
          console.error("[CaptionStudio] Project autosave failed:", error);
          if (revision !== saveRevisionRef.current) return;
          setProjectSaveState("error");
          toast({
            title: "Project could not be saved",
            description: error instanceof Error ? error.message : "Try editing again to retry saving.",
            variant: "destructive",
          });
        });
    }, 800);

    return () => window.clearTimeout(timer);
  }, [
    projectLoadState,
    sourceName,
    sourceKey,
    savedProjectId,
    isAudio,
    segments,
    style,
    brolls,
    aspectRatio,
    wordsPerCaption,
    brollTransitionsEnabled,
    onSavedProjectChange,
    saveRetry,
  ]);

  useEffect(() => {
    const hasUnsavedWork = hasUnsavedWorkspaceWork(
      stage, !!file, !!savedProjectId, projectSaveState,
    );
    onUnsavedWorkChange?.(hasUnsavedWork);
    if (!hasUnsavedWork) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [stage, file, savedProjectId, projectSaveState, onUnsavedWorkChange]);

  const handleFile = useCallback(
    (f: File | null) => {
      if (!f) return;
      if (hasUnsavedWorkspaceWork(stage, !!file, !!savedProjectId, projectSaveState) &&
          !window.confirm("Replacing this file will discard unsaved work. Continue?")) return;
      saveRevisionRef.current += 1;
      generationRequestIdRef.current += 1;
      generationAbortControllerRef.current?.abort();
      generationAbortControllerRef.current = null;
      videoRef.current?.pause();
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      const url = URL.createObjectURL(f);
      setFile(f);
      setSourceName(f.name);
      setSourceKey(null);
      sourceKeyRef.current = null;
      setSavedProjectId(null);
      onSavedProjectChange?.(null);
      projectIdRef.current = null;
      setProjectSaveState("idle");
      setVideoUrl(url);
      setIsAudio(!f.type.startsWith("video/"));
      setBrollTransitionsEnabled(true);
      setStyle(DEFAULT_STYLE);
      setSegments([]);
      setBrolls([]);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      setStage("idle");
      setErrorMsg(null);
      setExportMsg(null);
      setExportProgress(0);
      setAspectRatio(16 / 9);
    },
    [videoUrl, onSavedProjectChange, stage, file, savedProjectId, projectSaveState]
  );

  useEffect(() => {
    if (initialFile && loadedInitialFileRef.current !== initialFile) {
      loadedInitialFileRef.current = initialFile;
      handleFile(initialFile);
    }
  }, [handleFile, initialFile]);

  useEffect(() => {
    if (!projectId) return;

    let isCurrent = true;
    getProject(projectId)
      .then(({ project, videoUrl: savedVideoUrl }) => {
        if (!isCurrent) return;

        const snapshot = project.snapshot;
        skipSuggestionsRef.current = true;
        skipAutosaveRef.current = true;
        setErrorMsg(null);
        setSavedProjectId(project.id);
        projectIdRef.current = project.id;
        setSourceKey(project.sourceKey);
        sourceKeyRef.current = project.sourceKey;
        setSourceName(snapshot.sourceName);
        setIsAudio(snapshot.isAudio);
        setSegments(snapshot.segments);
        setStyle(snapshot.style);
        setBrolls(
          cycleBrollTransitions(
            [...snapshot.brolls].sort((a, b) => a.start - b.start)
          )
        );
        setAspectRatio(snapshot.aspectRatio);
        setWordsPerCaption(snapshot.wordsPerCaption);
        setWordsPerCaptionInput(String(snapshot.wordsPerCaption));
        setBrollTransitionsEnabled(snapshot.brollTransitionsEnabled ?? true);
        setVideoUrl(savedVideoUrl);
        setStage("done");
        setActiveTab("captions");
        setProjectLoadState("ready");
        setProjectSaveState("saved");
      })
      .catch((error: unknown) => {
        if (!isCurrent) return;
        const message = error instanceof Error ? error.message : "Could not load this project.";
        setErrorMsg(message);
        setStage("error");
        setProjectLoadState("error");
      });

    return () => {
      isCurrent = false;
    };
  }, [projectId]);

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
    if (
      stage === "uploading" ||
      stage === "queued" ||
      stage === "transcribing" ||
      stage === "timing"
    ) return;
    if (stage === "done") return;
    if (!file) {
      setErrorMsg("Upload a file first.");
      setStage("error");
      return;
    }
    const requestId = ++generationRequestIdRef.current;
    const abortController = new AbortController();
    generationAbortControllerRef.current = abortController;
    videoRef.current?.pause();
    setErrorMsg(null);
    setStage("uploading");

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("words_per_caption", String(wordsPerCaption));

      const enqueueResponse = await fetch("/api/transcribe", {
        method: "POST",
        body: fd,
        signal: abortController.signal,
      });
      const enqueueData = await enqueueResponse.json();

      if (!enqueueResponse.ok || !enqueueData.success || typeof enqueueData.jobId !== "string") {
        throw new Error(enqueueData.error || "Could not queue this video.");
      }

      if (requestId !== generationRequestIdRef.current) return;
      setStage("queued");

      let data: any;
      while (true) {
        const statusResponse = await fetch(
          `/api/transcribe/${encodeURIComponent(enqueueData.jobId)}`,
          { cache: "no-store", signal: abortController.signal },
        );
        const statusData = await statusResponse.json();
        if (!statusResponse.ok) {
          throw new Error(statusData.error || "Could not check video processing status.");
        }
        if (requestId !== generationRequestIdRef.current) return;

        if (statusData.status === "FAILED") {
          throw new Error(statusData.error || "Video processing failed.");
        }
        if (statusData.status === "SUCCEEDED") {
          if (!statusData.result) throw new Error("The video result was empty.");
          data = statusData.result;
          break;
        }
        if (statusData.status !== "QUEUED" && statusData.status !== "PROCESSING") {
          throw new Error("The video processing status was invalid.");
        }
        setStage(statusData.status === "QUEUED" ? "queued" : "transcribing");
        await new Promise((resolve) => setTimeout(resolve, 2_000));
      }

      if (requestId !== generationRequestIdRef.current) return;
      if (typeof data.tightenedVideoUrl === "string") setVideoUrl(data.tightenedVideoUrl);
      if (typeof data.sourceKey !== "string" || !data.sourceKey) {
        throw new Error("The processed video was not saved to project storage.");
      }
      setSourceKey(data.sourceKey);
      sourceKeyRef.current = data.sourceKey;

      setStage("timing");
      await new Promise((r) => setTimeout(r, 250));

      const rawSegs: CaptionSegment[] = (data.captions || []).map(
        (c: {
          id?: string;
          start: number;
          end: number;
          text: string;
          words?: CaptionSegment["words"];
        }, i: number) => ({
          id: c.id || `seg-${i}-${Math.random().toString(36).slice(2, 8)}`,
          start: c.start,
          end: c.end,
          text: applyAutoEmojis(c.text),
          words: c.words,
        })
      );

      if (rawSegs.length === 0) {
        throw new Error("No captions generated. Try a different file with clearer speech.");
      }

      setSegments(rawSegs);
      setStage("done");
      setActiveTab("captions");
      toast({
        title: "Captions ready!",
        description: `${rawSegs.length} caption segments generated.`,
      });
    } catch (err: unknown) {
      if (requestId !== generationRequestIdRef.current) return;
      const msg = err instanceof Error ? err.message : "Transcription failed.";
      setErrorMsg(msg);
      setStage("error");
      toast({
        title: "Transcription failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      if (requestId === generationRequestIdRef.current) {
        generationAbortControllerRef.current = null;
      }
    }
  };

  const updateSegment = (id: string, patch: Partial<CaptionSegment>) => {
    setSegments((prev) => prev.map((s) => {
      if (s.id === id) {
        let finalText = patch.text ?? s.text;
        if (patch.text) {
          finalText = applyAutoEmojis(finalText);
        }
        return { ...s, ...patch, text: finalText };
      }
      return s;
    }));
  };

  const assignClip = (segmentId: string, clip: any) => {
    setBrolls((prev) => {
      const windowId = clip.windowId;
      if (!windowId) return prev;

      const previousClip = prev.find((b) => b.windowId === windowId);
      const withoutThisWindow = prev.filter((b) => b.windowId !== windowId);
      const seg = segments.find(s => s.id === segmentId);
      const start = seg?.start || 0;

      const duration = Math.max(3, Math.min(4, 6));

      return cycleBrollTransitions([
        ...withoutThisWindow,
        assignBrollTransitions({
          ...clip,
          id: `${segmentId}-${clip.id}`,
          windowId: windowId,
          segmentId,
          start: start,
          end: start + duration,
          transitionOrder: previousClip?.transitionOrder ?? clip.transitionOrder,
        }),
      ].sort((a, b) => a.start - b.start));
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

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(
          data?.error || `B-roll request failed with status ${res.status}`
        );
      }

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
        const previousClip = prev.find((b) => b.windowId === windowId);
        const withoutThisWindow = prev.filter((b) => b.windowId !== windowId);
        return cycleBrollTransitions([
          ...withoutThisWindow,
          assignBrollTransitions({
            id: `${segmentId}-${bestClip.id}`,
            windowId: windowId,
            segmentId,
            start: start,
            end: start + duration,
            source: bestClip.source,
            previewUrl: bestClip.previewUrl,
            thumbnail: bestClip.thumbnail,
            query: text,
            durationHint: bestClip.durationHint,
            transitionOrder: previousClip?.transitionOrder,
          }),
        ].sort((a, b) => a.start - b.start));
      });

      toast({ title: "B-roll added", description: `Added clip for "${text}"` });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown B-roll error";
      console.error("Direct B-roll error:", message);
      toast({ title: "Error", description: message, variant: "destructive" });
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
      const previousClip = prev.find((b) => b.windowId === windowId);
      const withoutThisWindow = prev.filter((b) => b.windowId !== windowId);
      const duration = Math.max(3, Math.min(clip.end - clip.start, 4));
      return cycleBrollTransitions([
        ...withoutThisWindow,
        assignBrollTransitions({
          id: `${windowId}-${selectedClip.id}`,
          windowId: windowId,
          segmentId: clip.segmentId,
          start: clip.start,
          end: clip.start + duration,
          source: selectedClip.source,
          previewUrl: selectedClip.previewUrl,
          thumbnail: selectedClip.thumbnail,
          query: query,
          durationHint: selectedClip.durationHint,
          transitionOrder: previousClip?.transitionOrder,
        }),
      ].sort((a, b) => a.start - b.start));
    });

    toast({ title: "B-roll cycled", description: `Switched to clip ${nextIndex + 1} of ${s.clips.length}` });
  };

  const commitEdit = (id: string) => {
    updateSegment(id, { text: editText.trim() || " " });
    setEditingId(null);
    setEditText("");
  };

  const seekTo = (t: number, play = false) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = t;
      setCurrentTime(t);
      if (play && video.paused) {
        video.play().catch((error: unknown) => {
          if (!isInterruptedPlayback(error, video)) {
            console.error("[CaptionStudio] Playback failed:", error);
            toast({ title: "Playback failed", description: "Please try playing the video again.", variant: "destructive" });
          }
        });
      }
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch((error: unknown) => {
        if (!isInterruptedPlayback(error, video)) {
          console.error("[CaptionStudio] Playback failed:", error);
          toast({ title: "Playback failed", description: "Please try playing the video again.", variant: "destructive" });
        }
      });
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMute = !videoRef.current.muted;
    videoRef.current.muted = nextMute;
    setIsMuted(nextMute);
  };

  const toggleFullScreen = () => {
    if (!previewRef.current) return;
    if (!document.fullscreenElement) {
      previewRef.current.requestFullscreen().catch((err: Error) => {
        console.error("[CaptionStudio] Fullscreen failed:", err);
        toast({ title: "Fullscreen unavailable", description: err.message, variant: "destructive" });
      });
    } else {
      document.exitFullscreen().catch((err: Error) => {
        console.error("[CaptionStudio] Exiting fullscreen failed:", err);
        toast({ title: "Could not exit fullscreen", description: err.message, variant: "destructive" });
      });
    }
  };

  const exportSRT = () => {
    if (!segments.length) return;
    downloadFile("editron-captions.srt", generateSRT(segments), "application/x-subrip");
  };

  const exportVTT = () => {
    if (!segments.length) return;
    downloadFile("editron-captions.vtt", generateVTT(segments), "application/x-subrip");
  };

  const exportTXT = () => {
    if (!segments.length) return;
    downloadFile("editron-transcript.txt", generateTXT(segments), "text/plain");
  };

  const exportVideo = async (attempt = 0): Promise<void> => {
    const previewVideo = videoRef.current;
    if (!previewVideo || !segments.length || !videoUrl || isAudio) return;

    setIsExportingVideo(true);
    setExportProgress(0);
    setExportMsg("Preparing canvas…");

    let video = previewVideo;
    const wasMuted = video.muted;
    let combinedStream: MediaStream | null = null;
    let sourceStream: MediaStream | null = null;
    let recorder: MediaRecorder | null = null;
    let animationFrame = 0;
    const brollEls = new Map<string, HTMLVideoElement>();
    const brollImageEls = new Map<string, HTMLImageElement>();
    const transitionEls = new Map<string, HTMLVideoElement>();
    let retry = false;
    let candidateCount = 0;

    try {
      if (sourceKey) {
        video = document.createElement("video");
        video.preload = "auto";
        video.playsInline = true;
        video.src = `/api/media?${new URLSearchParams({ key: sourceKey })}`;
        video.load();
      } else if (new URL(videoUrl, window.location.href).origin !== window.location.origin) {
        video = document.createElement("video");
        video.crossOrigin = "anonymous";
        video.preload = "auto";
        video.playsInline = true;
        video.src = videoUrl;
        video.load();
      }
      const exportFontFaces = [
        `500 ${style.fontSize}px "Plus Jakarta Sans"`,
        `italic 400 ${style.fontSize}px "Instrument Serif"`,
        `600 ${style.fontSize}px "Inter"`,
        `500 ${style.fontSize}px "Space Grotesk"`,
        `700 ${style.fontSize}px "Outfit"`,
        `600 ${style.fontSize}px "Syne"`,
        `${style.fontWeight ?? (style.bold ? 800 : 500)} ${style.fontSize}px ${getFontFamily(style.fontFamily)}`,
      ];
      if (style.activeWordFontFamily) {
        exportFontFaces.push(
          `${style.activeWordFontStyle ?? "italic"} ${style.activeWordFontWeight ?? 400} ${style.fontSize}px ${getFontFamily(style.activeWordFontFamily)}`,
        );
      }
      await Promise.all(exportFontFaces.map((fontFace) => document.fonts.load(fontFace)));
      await document.fonts.ready;

      if (!video.videoWidth || !video.videoHeight) {
        if (video.error) {
          throw new Error("Video failed to load for export. Check the media server's CORS settings.");
        }
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            cleanup();
            reject(new Error("Video metadata timeout"));
          }, 10_000);
          const cleanup = () => {
            clearTimeout(timeout);
            video.removeEventListener("loadedmetadata", onLoad);
            video.removeEventListener("error", onError);
          };
          const onLoad = () => { cleanup(); resolve(); };
          const onError = () => {
            cleanup();
            reject(new Error("Video failed to load for export. Check the media server's CORS settings."));
          };
          video.addEventListener("loadedmetadata", onLoad);
          video.addEventListener("error", onError);
        });
      }

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const { width: cw, height: ch } = getExportDimensions(vw, vh, exportQuality);
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            cleanup();
            reject(new Error("Timed out while loading video frames."));
          }, 10_000);
          const cleanup = () => {
            clearTimeout(timeout);
            video.removeEventListener("loadeddata", onLoad);
            video.removeEventListener("error", onError);
          };
          const onLoad = () => { cleanup(); resolve(); };
          const onError = () => { cleanup(); reject(new Error("Could not load video frames.")); };
          video.addEventListener("loadeddata", onLoad);
          video.addEventListener("error", onError);
        });
      }

      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");

      video.pause();
      if (video.currentTime !== 0) {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            cleanup();
            reject(new Error("Timed out while seeking to the start of the video."));
          }, 10_000);
          const cleanup = () => {
            clearTimeout(timeout);
            video.removeEventListener("seeked", onSeeked);
            video.removeEventListener("error", onError);
          };
          const onSeeked = () => { cleanup(); resolve(); };
          const onError = () => { cleanup(); reject(new Error("Could not seek to the start of the video.")); };
          video.addEventListener("seeked", onSeeked);
          video.addEventListener("error", onError);
          video.currentTime = 0;
        });
      }
      video.muted = true;
      ctx.drawImage(video, 0, 0, cw, ch);
      try {
        ctx.getImageData(0, 0, 1, 1);
      } catch {
        throw new Error("This video cannot be exported because its source does not allow canvas access.");
      }

      combinedStream = canvas.captureStream(30);
      try {
        const videoEl = video as HTMLVideoElement & {
          captureStream?: () => MediaStream;
          mozCaptureStream?: () => MediaStream;
        };
        sourceStream = videoEl.captureStream?.() || videoEl.mozCaptureStream?.() || null;
        if (sourceStream) {
          const audioTracks = sourceStream.getAudioTracks();
          if (audioTracks.length > 0) {
            for (const track of audioTracks) combinedStream.addTrack(track);
          } else {
            toast({
              title: "Audio may be missing",
              description: "The browser did not provide an audio track for this export.",
              variant: "destructive",
            });
          }
        } else {
          throw new Error("This browser cannot capture the video audio.");
        }
      } catch (error) {
        console.error("[exportVideo] Audio capture failed", error);
        throw new Error("This browser cannot capture the video audio. Try another browser.");
      }

      if (typeof MediaRecorder === "undefined") {
        throw new Error("This browser does not support video recording.");
      }
      const mimeCandidates = supportedRecordingTypes(
        (type) => MediaRecorder.isTypeSupported(type),
        combinedStream.getAudioTracks().length > 0,
      );
      candidateCount = mimeCandidates.length;
      const mimeType = mimeCandidates[attempt];
      if (!mimeType) throw new Error("This browser does not support video recording.");

      try {
        recorder = new MediaRecorder(combinedStream, {
          mimeType,
          videoBitsPerSecond:
            exportQuality === "4k" ? 30_000_000 : exportQuality === "1080p" ? 8_000_000 : exportQuality === "720p" ? 5_000_000 : 2_500_000,
        });
      } catch (error) {
        throw new RecordingError(`Could not initialize ${mimeType}: ${error instanceof Error ? error.message : String(error)}`);
      }

      const chunks: Blob[] = [];
      let recordingError: Error | null = null;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onerror = (event) => {
        const detail = "error" in event && event.error instanceof Error
          ? event.error.message : "The encoder could not record this video.";
        recordingError = new RecordingError(`${mimeType}: ${detail}`);
      };

      const done = new Promise<Blob>((resolve) => {
        recorder!.onstop = () => resolve(new Blob(chunks, { type: recorder!.mimeType || mimeType }));
      });

      const totalDuration = video.duration;
      if (!Number.isFinite(totalDuration) || totalDuration <= 0) {
        throw new Error("Cannot export a video without a valid duration.");
      }

      const fontFamilyCss = getFontFamily(style.fontFamily);
      const fontWeight = String(style.fontWeight ?? (style.bold ? 800 : 500));
      const fontStyle = style.italic ? "italic" : "normal";

      let transitionLoadFailed = false;
      let lastActiveBrollId: string | null = null;
      let lastActiveTransitionKey: string | null = null;
      let lastActiveTransitionAssetId: string | null = null;
      const verifiedCanvasSources = new Set<string>();
      if (brolls.length) {
        setExportMsg("Loading b-roll clips…");
        await Promise.all(
          brolls.map(
            (b) => {
              if (isBrollImage(b)) {
                return new Promise<void>((resolve, reject) => {
                  if (brollImageEls.has(b.previewUrl)) return resolve();
                  const image = document.createElement("img");
                  image.crossOrigin = "anonymous";
                  const timeout = setTimeout(() => reject(new Error("Timed out loading a B-roll image.")), 15_000);
                  image.addEventListener("load", () => {
                    clearTimeout(timeout);
                    resolve();
                  }, { once: true });
                  image.addEventListener("error", () => {
                    clearTimeout(timeout);
                    reject(new Error("Could not load a B-roll image for export."));
                  }, { once: true });
                  brollImageEls.set(b.previewUrl, image);
                  image.src = b.sourceKey
                    ? `/api/media?${new URLSearchParams({ key: b.sourceKey })}`
                    : b.previewUrl;
                });
              }
              return new Promise<void>((resolve, reject) => {
                if (brollEls.has(b.previewUrl)) return resolve();
                const el = document.createElement("video");
                el.crossOrigin = "anonymous";
                el.src = b.sourceKey
                  ? `/api/media?${new URLSearchParams({ key: b.sourceKey })}`
                  : b.previewUrl;
                el.muted = true;
                el.loop = false;
                el.playsInline = true;
                el.preload = "auto";
                const timeout = setTimeout(() => reject(new Error("Timed out loading a B-roll video.")), 15_000);
                el.addEventListener("loadeddata", () => {
                  clearTimeout(timeout);
                  resolve();
                }, { once: true });
                el.addEventListener("error", () => {
                  clearTimeout(timeout);
                  reject(new Error("Could not load a B-roll video for export."));
                }, { once: true });
                brollEls.set(b.previewUrl, el);
                el.load();
              });
            }
          )
        );

        if (brollTransitionsEnabled) {
          const transitionIds = new Set(
            brolls.flatMap((clip) => {
              const assigned = assignBrollTransitions(clip);
              return [assigned.transitionIn, assigned.transitionOut].filter(
                (id): id is string => !!id
              );
            })
          );
          await Promise.all(
            [...transitionIds].map(
              (id) =>
                new Promise<void>((resolve) => {
                  const asset = BROLL_TRANSITIONS.find((item) => item.id === id);
                  if (!asset) {
                    transitionLoadFailed = true;
                    return resolve();
                  }
                  if (transitionEls.has(id)) return resolve();
                  const el = document.createElement("video");
                  el.crossOrigin = "anonymous";
                  el.src = asset.src;
                  el.muted = true;
                  el.playsInline = true;
                  el.preload = "auto";
                  let settled = false;
                  const done = (failed = false) => {
                    if (settled) return;
                    settled = true;
                    if (failed) transitionLoadFailed = true;
                    clearTimeout(timeout);
                    resolve();
                  };
                  const timeout = setTimeout(() => done(true), 4000);
                  el.addEventListener("loadeddata", () => done(), { once: true });
                  el.addEventListener("error", () => done(true), { once: true });
                  transitionEls.set(id, el);
                  el.load();
                })
            )
          );
          if (transitionLoadFailed) {
            toast({
              title: "Some transitions could not be loaded",
              description: "The video will export, but missing transition effects will be skipped.",
              variant: "destructive",
            });
          }
        }
      }

      setExportMsg("Recording…");

      try {
        recorder.start(100);
      } catch (error) {
        throw new RecordingError(`Could not start ${mimeType}: ${error instanceof Error ? error.message : String(error)}`);
      }
      await video.play();

      const renderFrame = () => {
        if (video.paused || video.ended) {
          if (!recordingError && !video.ended && video.currentTime < totalDuration - 0.1) {
            recordingError = new Error("Export stopped before the end of the video.");
          }
          finishExport();
          return;
        }
        const t = video.currentTime;

        const activeTransition = !brollTransitionsEnabled
          ? null
          : activeBrollTransitionAt(brolls, t, totalDuration);
        const activeBroll = activeBrollAt(brolls, t);
        const brollEl = activeBroll && !isBrollImage(activeBroll)
          ? brollEls.get(activeBroll.previewUrl)
          : undefined;
        const brollImage = activeBroll && isBrollImage(activeBroll)
          ? brollImageEls.get(activeBroll.previewUrl)
          : undefined;
        const transitionEl = activeTransition
          ? transitionEls.get(activeTransition.asset.id)
          : undefined;

        if (activeBroll?.id !== lastActiveBrollId) {
          if (lastActiveBrollId) {
            const prevBroll = brolls.find((b) => b.id === lastActiveBrollId);
            const prevEl = prevBroll ? brollEls.get(prevBroll.previewUrl) : undefined;
            prevEl?.pause();
          }
          if (brollEl) {
            brollEl.currentTime = activeBroll?.trimStart ?? 0;
            brollEl.play().catch((error: unknown) => {
              if (isInterruptedPlayback(error, brollEl)) return;
              console.error("[exportVideo] B-roll playback failed", error);
            });
          }
          lastActiveBrollId = activeBroll?.id ?? null;
        }

        if (brollEl && activeBroll) {
          const trimStart = activeBroll.trimStart ?? 0;
          const trimEnd = activeBroll.trimEnd ?? brollEl.duration;
          if (brollEl.ended || (Number.isFinite(trimEnd) && brollEl.currentTime >= trimEnd)) {
            brollEl.currentTime = trimStart;
            if (brollEl.ended) {
              brollEl.play().catch((error: unknown) => {
                if (isInterruptedPlayback(error, brollEl)) return;
                console.error("[exportVideo] B-roll loop playback failed", error);
              });
            }
          }
        }

        if (activeTransition?.key !== lastActiveTransitionKey) {
          if (lastActiveTransitionAssetId) {
            transitionEls.get(lastActiveTransitionAssetId)?.pause();
          }
          if (activeTransition && transitionEl) {
            transitionEl.currentTime = Math.min(
              activeTransition.progress * activeTransition.asset.duration,
              Math.max(0, activeTransition.asset.duration - 0.001)
            );
            transitionEl.playbackRate =
              activeTransition.asset.duration / (activeTransition.end - activeTransition.start);
            transitionEl.play().catch((error: unknown) => {
              if (isInterruptedPlayback(error, transitionEl)) return;
              console.error("[exportVideo] Transition playback failed", error);
            });
          }
          lastActiveTransitionKey = activeTransition?.key ?? null;
          lastActiveTransitionAssetId = activeTransition?.asset.id ?? null;
        }

        let canvasSource: string | null = null;
        if (brollImage && brollImage.complete && brollImage.naturalWidth > 0) {
          drawCover(ctx, brollImage, brollImage.naturalWidth, brollImage.naturalHeight, cw, ch);
          canvasSource = activeBroll?.previewUrl ?? null;
        } else if (brollEl && brollEl.readyState >= 2) {
          drawCover(ctx, brollEl, brollEl.videoWidth, brollEl.videoHeight, cw, ch);
          canvasSource = activeBroll?.previewUrl ?? null;
        } else {
          drawCover(ctx, video, vw, vh, cw, ch);
        }
        if (canvasSource && !verifiedCanvasSources.has(canvasSource)) {
          try {
            ctx.getImageData(0, 0, 1, 1);
          } catch {
            throw new Error("A B-roll source blocks canvas access. Check its CORS settings.");
          }
          verifiedCanvasSources.add(canvasSource);
        }

        if (activeTransition && transitionEl && transitionEl.readyState >= 2) {
          ctx.save();
          ctx.globalCompositeOperation = "screen";
          drawCover(
            ctx,
            transitionEl,
            transitionEl.videoWidth,
            transitionEl.videoHeight,
            cw,
            ch
          );
          ctx.restore();
          const transitionSource = activeTransition.asset.src;
          if (!verifiedCanvasSources.has(transitionSource)) {
            try {
              ctx.getImageData(0, 0, 1, 1);
            } catch {
              throw new Error("A transition blocks canvas access. Check its CORS settings.");
            }
            verifiedCanvasSources.add(transitionSource);
          }
        }

        const seg = segments.find((s) => !s.hidden && t >= s.start && t < s.end);
        if (seg) {
          drawCaption(ctx, seg, cw, ch, style, fontFamilyCss, fontWeight, fontStyle, t, previewVideo);
        }

        setExportProgress(Math.min(100, Math.round((t / totalDuration) * 100)));

        if (t < totalDuration) {
          animationFrame = requestAnimationFrame(renderSafely);
        } else {
          finishExport();
        }
      };

      const finishExport = () => {
        if (recorder && recorder.state !== "inactive") {
          recorder.stop();
        }
      };

      const renderSafely = () => {
        try {
          renderFrame();
        } catch (error) {
          recordingError = error instanceof Error ? error : new Error("Could not render the video.");
          finishExport();
        }
      };
      renderSafely();

      const blob = await done;
      if (recordingError) throw recordingError;
      if (blob.size === 0) throw new RecordingError(`${mimeType}: The browser produced an empty video.`);
      const actualType = blob.type.toLowerCase();
      const fileExt = actualType.startsWith("video/mp4") ? "mp4"
        : actualType.startsWith("video/webm") ? "webm" : null;
      if (!fileExt) throw new Error("The browser produced an unsupported video format.");

      setExportMsg("Saving file…");
      setExportProgress(100);

      const url = URL.createObjectURL(blob);
      try {
        await new Promise<void>((resolve, reject) => {
          const check = document.createElement("video");
          const timeout = setTimeout(() => finish(new Error("Timed out while checking the exported video.")), 10_000);
          const finish = (error?: Error) => {
            clearTimeout(timeout);
            check.onloadedmetadata = null;
            check.onerror = null;
            check.removeAttribute("src");
            check.load();
            if (error) reject(error);
            else resolve();
          };
          check.onloadedmetadata = () => {
            if (!check.videoWidth || !check.videoHeight) {
              finish(new Error("The exported file does not contain a playable video."));
            } else {
              finish();
            }
          };
          check.onerror = () => finish(new Error("The exported video could not be opened."));
          check.preload = "metadata";
          check.src = url;
        });
      } catch (error) {
        URL.revokeObjectURL(url);
        throw new RecordingError(`${mimeType}: ${error instanceof Error ? error.message : "The exported video could not be verified."}`);
      }
      const a = document.createElement("a");
      a.href = url;
      a.download = `editron-captioned-video.${fileExt}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      if (fileExt === "webm") {
        toast({
          title: "Exported as WebM",
          description: "Your browser could not record MP4. Use a player that supports WebM.",
        });
      }

      setExportMsg(`${fileExt.toUpperCase()} download started.`);
      setIsExportingVideo(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Video export failed";
      if (err instanceof RecordingError && attempt + 1 < candidateCount) {
        console.warn("[exportVideo] Encoder failed; trying another format:", msg);
        setExportMsg("Trying another video format…");
        retry = true;
      } else {
        console.error("[exportVideo]", msg);
        setExportMsg(`Export failed: ${msg}`);
        setIsExportingVideo(false);
      }
    } finally {
      cancelAnimationFrame(animationFrame);
      if (recorder && recorder.state !== "inactive") recorder.stop();
      combinedStream?.getTracks().forEach((track) => track.stop());
      sourceStream?.getTracks().forEach((track) => track.stop());
      video.pause();
      video.muted = wasMuted;
      if (video !== previewVideo) video.removeAttribute("src");
      brollEls.forEach((el) => {
        el.pause();
        el.src = "";
      });
      brollImageEls.forEach((image) => { image.src = ""; });
      transitionEls.forEach((el) => {
        el.pause();
        el.src = "";
      });
    }
    if (retry) await exportVideo(attempt + 1);
  };

  const updateStyle = (patch: Partial<CaptionStyle>) => {
    setStyle((s) => {
      if (patch.hyperStyleId) {
        const preset = CINEMATIC_PRESETS[patch.hyperStyleId];
        return {
          ...s,
          animationType: undefined,
          fontWeight: undefined,
          letterSpacingUnit: undefined,
          inactiveOpacity: undefined,
          pillColor: undefined,
          pillBorder: undefined,
          pillBorderRadius: undefined,
          pillPaddingX: undefined,
          pillPaddingY: undefined,
          accentColor: undefined,
          textShadow: undefined,
          shadowColor: undefined,
          shadowBlur: undefined,
          shadowOffsetX: undefined,
          shadowOffsetY: undefined,
          activeWordFontFamily: undefined,
          activeWordFontStyle: undefined,
          activeWordFontWeight: undefined,
          ...preset,
          hyperStyleId: patch.hyperStyleId,
        };
      }
      return { ...s, ...patch, hyperStyleId: null };
    });
  };

  const generateHookTitle = useCallback(async () => {
    // Removed
  }, []);

  const toggleHookTitle = (enabled: boolean) => {
    // Removed
  };

  const isProcessing = stage === "uploading" || stage === "queued" ||
    stage === "transcribing" || stage === "timing";
  const canExport = segments.length > 0 && !isAudio && !!videoUrl && !isProcessing;
  const activeIdx = segments.findIndex((s) => currentTime >= s.start && currentTime < s.end);

  const changeWordsPerCaption = (value: number) => {
    if (value === wordsPerCaption) return;
    if (segments.length) {
      const regrouped = regroupCaptions(segments, brolls, value, pendingSuggestedSegmentIdsRef.current);
      setSegments(regrouped.segments);
      setBrolls(regrouped.brolls);
    }
    setWordsPerCaption(value);
  };

  function drawCover(ctx: CanvasRenderingContext2D, el: CanvasImageSource, vw: number, vh: number, cw: number, ch: number) {
    const scale = Math.max(cw / vw, ch / vh);
    const x = (cw - vw * scale) / 2;
    const y = (ch - vh * scale) / 2;
    ctx.drawImage(el, x, y, vw * scale, vh * scale);
  }
  function drawCaption(
    ctx: CanvasRenderingContext2D,
    seg: CaptionSegment,
    cw: number,
    ch: number,
    style: CaptionStyle,
    font: string,
    weight: string,
    italic: string,
    time: number,
    previewVideo: HTMLVideoElement,
  ) {
    const scale = cw / (previewVideo.getBoundingClientRect().width || cw);
    const fontSize = style.fontSize * scale;
    const maxWidth = cw * 0.88;
    const words = getCaptionWords(seg);
    if (!words.length) return;

    ctx.save();
    const letterSpacing =
      (style.letterSpacingUnit === "em"
        ? style.letterSpacing * style.fontSize
        : style.letterSpacing) * scale;
    const fontForWord = (index: number) => {
      const activeWordFontFamily = style.animationType === "slide-up" &&
        index === getActiveWordIndex(words, time) &&
        style.activeWordFontFamily;
      return {
        family: activeWordFontFamily ? getFontFamily(activeWordFontFamily) : font,
        weight: activeWordFontFamily ? style.activeWordFontWeight ?? 400 : style.fontWeight ?? weight,
        italic: activeWordFontFamily ? style.activeWordFontStyle ?? "italic" : italic,
      };
    };
    const configureFont = (index: number) => {
      const currentFont = fontForWord(index);
      ctx.font = `${currentFont.italic} ${currentFont.weight} ${fontSize}px ${currentFont.family}`;
      if ("letterSpacing" in ctx) ctx.letterSpacing = `${letterSpacing}px`;
    };
    const activeWordIndex = getActiveWordIndex(words, time);
    const layout = layoutCaptionWords(
      words,
      maxWidth,
      fontSize,
      (word, index) => {
        configureFont(index);
        return ctx.measureText(style.uppercase ? word.toUpperCase() : word).width;
      },
      (() => {
        configureFont(-1);
        return ctx.measureText(" ").width;
      })(),
    );
    if (!layout.words.length) {
      ctx.restore();
      return;
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const centerX = cw * (0.5 + style.posX / 100);
    const centerY = ch * ((getCaptionPositionBase(style.position) + style.posY) / 100);
    ctx.translate(centerX, centerY);

    if (style.bgOpacity > 0) {
      ctx.fillStyle = hexWithOpacity(style.bgColor, style.bgOpacity / 100);
      const paddingX = 8 * scale;
      const paddingY = 4 * scale;
      fillRoundedRect(
        ctx,
        -layout.width / 2 - paddingX,
        -layout.height / 2 - paddingY,
        layout.width + paddingX * 2,
        layout.height + paddingY * 2,
        6 * scale,
      );
    }

    if (style.animationType === "glass-pill" && activeWordIndex >= 0) {
      const target = layout.words.find((word) => word.index === activeWordIndex);
      const previous = activeWordIndex > 0
        ? layout.words.find((word) => word.index === activeWordIndex - 1)
        : target;
      if (target && previous) {
        const progress = activeWordIndex > 0
          ? getEaseOutProgress(time - words[activeWordIndex].start, 0.16)
          : 1;
        const interpolate = (from: number, to: number) => from + (to - from) * progress;
        const pillX = interpolate(previous.centerX, target.centerX);
        const pillY = interpolate(previous.centerY, target.centerY);
        const pillWordWidth = interpolate(previous.width, target.width);
        const paddingX = (style.pillPaddingX ?? 8) * scale;
        const paddingY = (style.pillPaddingY ?? 4) * scale;
        const pillWidth = pillWordWidth + paddingX * 2;
        const pillHeight = fontSize * 1.1 + paddingY * 2;
        const pillRadius = (style.pillBorderRadius ?? 8) * scale;

        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.25)";
        ctx.shadowBlur = 20 * scale;
        ctx.shadowOffsetY = 4 * scale;
        ctx.fillStyle = style.pillColor ?? "rgba(20,20,22,0.72)";
        ctx.beginPath();
        ctx.roundRect(
          pillX - pillWidth / 2,
          pillY - pillHeight / 2,
          pillWidth,
          pillHeight,
          pillRadius,
        );
        ctx.fill();
        if (style.pillBorder) {
          ctx.strokeStyle = style.pillBorder;
          ctx.lineWidth = scale;
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    layout.words.forEach((placement) => {
      const word = words[placement.index];
      const wordState = getCaptionWordRenderState(
        style.animationType,
        word,
        placement.index,
        activeWordIndex,
        time,
        style.inactiveOpacity,
      );
      const currentFont = fontForWord(placement.index);
      const displayWord = style.uppercase ? word.word.toUpperCase() : word.word;

      ctx.save();
      ctx.globalAlpha *= wordState.opacity;
      ctx.filter = wordState.blur > 0 ? `blur(${wordState.blur * scale}px)` : "none";
      ctx.fillStyle = style.textColor;
      ctx.shadowColor = style.shadowColor ?? "rgba(0,0,0,0.6)";
      ctx.shadowBlur = (style.shadowBlur ?? 8) * scale;
      ctx.shadowOffsetX = (style.shadowOffsetX ?? 0) * scale;
      ctx.shadowOffsetY = (style.shadowOffsetY ?? 2) * scale;
      ctx.font = `${currentFont.italic} ${currentFont.weight} ${fontSize}px ${currentFont.family}`;
      ctx.translate(
        placement.centerX,
        placement.centerY + wordState.translateY * scale,
      );
      ctx.scale(wordState.scale, wordState.scale);
      ctx.fillText(displayWord, 0, 0);
      ctx.restore();

      if (style.animationType === "underline" && wordState.underlineProgress > 0) {
        const underlineHeight = 3 * scale;
        const underlineWidth = placement.width * wordState.underlineProgress;
        const underlineX = placement.centerX - placement.width / 2;
        const underlineY = placement.centerY + fontSize * 0.68;
        ctx.save();
        ctx.shadowColor = "transparent";
        ctx.beginPath();
        ctx.rect(underlineX, underlineY - underlineHeight / 2, underlineWidth, underlineHeight);
        ctx.clip();
        ctx.fillStyle = style.accentColor ?? "#818CF8";
        ctx.beginPath();
        ctx.roundRect(
          underlineX,
          underlineY - underlineHeight / 2,
          placement.width,
          underlineHeight,
          underlineHeight / 2,
        );
        ctx.fill();
        ctx.restore();
      }
    });

    ctx.restore();
  }

  function fillRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
  }

  function hexWithOpacity(hex: string, opacity: number) {
    const value = hex.replace("#", "");
    const normalized = value.length === 3 ? value.split("").map((char) => char + char).join("") : value;
    const red = parseInt(normalized.slice(0, 2), 16);
    const green = parseInt(normalized.slice(2, 4), 16);
    const blue = parseInt(normalized.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${Math.max(0, Math.min(1, opacity))})`;
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
    <section id="studio" className="relative scroll-mt-20 bg-background py-6 sm:py-8">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Studio card */}
        <div className="overflow-hidden rounded-3xl border-liquid-metal bg-zinc-950 shadow-2xl">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-b border-zinc-800 bg-black px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex min-w-0 items-start gap-3">
              <div className="relative mt-0.5 h-5 w-9 shrink-0 overflow-hidden">
                <Image
                  src="/editron-studio-logo.jpeg"
                  alt="Editron logo"
                  width={752}
                  height={564}
                  className="absolute left-[-22px] top-[-18px] h-[56px] w-[75px] max-w-none"
                />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold leading-5 text-white">Editron Studio</div>
                <div className="break-all text-xs leading-4 text-muted-foreground">
                  {sourceName || "No file loaded"}{" "}
                  {file && <span className="text-primary">· {(file.size / 1024 / 1024).toFixed(2)} MB</span>}
                  {(savedProjectId || sourceKey) && (
                    <span className={cn(
                      "ml-2",
                      projectSaveState === "error" ? "text-red-400" : "text-zinc-500",
                    )}>
                      {projectSaveState === "saving"
                        ? "· Saving project…"
                        : projectSaveState === "error"
                          ? "· Save failed"
                          : projectSaveState === "saved"
                            ? "· Saved to workspace"
                            : ""}
                    </span>
                  )}
                  {projectSaveState === "error" && (
                    <button
                      type="button"
                      onClick={() => setSaveRetry((value) => value + 1)}
                      className="ml-2 text-primary underline underline-offset-2"
                    >
                      Retry save
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex h-11 items-center gap-2 rounded-md border border-border bg-card px-3 sm:h-9">
                      <Label htmlFor="wpc-input" className="text-xs font-medium text-muted-foreground">
                        Words/caption
                      </Label>
                      <Input
                        id="wpc-input"
                        type="number"
                        min={1}
                        max={12}
                        value={wordsPerCaptionInput}
                        onChange={(e) => {
                          const input = e.target.value;
                          setWordsPerCaptionInput(input);
                          if (/^\d+$/.test(input)) {
                            const value = Number(input);
                            if (value >= 1 && value <= 12) changeWordsPerCaption(value);
                          }
                        }}
                        onBlur={() => setWordsPerCaptionInput(String(wordsPerCaption))}
                        disabled={isProcessing || isExportingVideo || pendingBrollOperations > 0 || projectLoadState === "loading"}
                        aria-invalid={wordsPerCaptionInput !== "" && (!/^\d+$/.test(wordsPerCaptionInput) || Number(wordsPerCaptionInput) < 1 || Number(wordsPerCaptionInput) > 12)}
                        inputMode="numeric"
                        className="h-9 w-12 border-transparent bg-transparent p-0 text-center text-base text-white sm:h-6 sm:text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {pendingBrollOperations > 0
                        ? "Wait for the B-roll operation to finish before changing caption length."
                        : "Choose 1–12 words per caption. Existing captions update without processing again."}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <LiquidMetalButton
                label={
                  isProcessing
                    ? "Processing…"
                    : stage === "done"
                      ? "Captions ready"
                      : "Edit now"
                }
                onClick={generate}
                width={160}
                disabled={
                  isProcessing ||
                  projectLoadState === "loading" ||
                  !file ||
                  stage === "done"
                }
              />
            </div>
          </div>
          {/* Completion and error status */}
          {(stage === "done" || stage === "error") && (
            <div className="border-b border-border bg-card px-4 py-2 sm:px-6">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {stage === "error" ? (
                  <AlertCircle className="size-4 text-red-500" />
                ) : stage === "done" ? (
                  <CheckCircle2 className="size-4 text-primary" />
                ) : null}
                <span className={cn("font-medium", stage === "error" ? "text-red-600" : "text-white")}>
                  {STAGE_LABELS[stage]}
                </span>
                {errorMsg && <span className="text-red-500"> - {errorMsg}</span>}
                {stage === "done" && segments.length > 0 && (
                  <span className="ml-auto text-muted-foreground">
                    {segments.length} segments · {segments.reduce((a, s) => a + s.text.trim().split(/\s+/).filter(Boolean).length, 0)} words
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Body */}
          <div className="grid min-w-0 gap-0 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            {/* Left: preview + upload */}
            <div className="min-w-0 border-b border-border p-3 sm:p-6 lg:border-b-0 lg:border-r">
              {videoUrl ? (
                <div className={cn("relative", isProcessing && "overflow-hidden rounded-xl")}>
                {isProcessing && (
                  <motion.div
                    className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-black px-6 py-10 text-center sm:min-h-[360px]"
                    role="status"
                    aria-live="polite"
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.98, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.6, ease: "easeOut" }}
                  >
                    <ProcessingOrb />
                    <ProcessingMessage />
                  </motion.div>
                )}
                <motion.div
                  className={cn("space-y-3", isProcessing && "pointer-events-none absolute inset-x-0 top-0")}
                  aria-hidden={isProcessing}
                  inert={isProcessing}
                  initial={false}
                  animate={isProcessing
                    ? { opacity: 0, scale: reduceMotion ? 1 : 0.98, filter: reduceMotion ? "blur(0px)" : "blur(6px)", transitionEnd: { visibility: "hidden" } }
                    : { opacity: 1, scale: 1, filter: "blur(0px)", visibility: "visible" }}
                  transition={{ duration: reduceMotion ? 0 : 0.5, ease: "easeInOut" }}
                >
                  <div ref={previewRef} className="bg-black fullscreen:flex fullscreen:items-center fullscreen:justify-center">
                  <CaptionPreview
                    videoUrl={videoUrl}
                    isAudio={isAudio}
                    segments={segments}
                    currentTime={currentTime}
                    duration={duration}
                    brollTransitionsEnabled={brollTransitionsEnabled}
                    style={style}
                    videoRef={videoRef}
                    aspectRatio={aspectRatio}
                    onTimeUpdate={(t) => setCurrentTime(t)}
                    onLoadedMetadata={(d) => setDuration(d)}
                    onVideoDimensions={(w, h) => {
                      if (w > 0 && h > 0) {
                        setAspectRatio(w / h);
                      }
                    }}
                    brolls={brolls}
                    hookTitle=""
                    onChangeStyle={(patch) => setStyle((s) => ({ ...s, ...patch }))}
                  />
                  </div>
                  {/* Professional Seek Bar */}
                  <div
                    className="relative h-10 w-full sm:h-6"
                  >
                    {/* B-Roll Markers - Rendered FIRST so they are in the background */}
                    <div className="absolute inset-x-0 top-4 h-2 overflow-hidden rounded-full bg-secondary pointer-events-none flex items-center sm:top-2">
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
                      className="pointer-events-none absolute top-4 h-2 rounded-full bg-white/30 z-10 sm:top-2"
                      style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                    />
                    {/* Playhead Indicator Line - The sharp white line */}
                    <div
                      className="pointer-events-none absolute top-3 bottom-3 w-0.5 bg-white z-20 sm:top-1 sm:bottom-1"
                      style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                    />
                    <input
                      type="range"
                      min={0}
                      max={duration > 0 && Number.isFinite(duration) ? duration : 0}
                      step={0.01}
                      value={Math.max(0, Math.min(currentTime, duration || 0))}
                      onChange={(event) => seekTo(Number(event.target.value))}
                      disabled={!duration}
                      aria-label="Seek video"
                      aria-valuetext={`${formatClock(currentTime)} of ${formatClock(duration)}`}
                      className="absolute inset-0 z-30 h-full w-full cursor-pointer opacity-0 focus-visible:opacity-100 accent-white"
                    />
                  </div>

                  {/* Mini player controls */}
                  <div className="relative z-10 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background px-2 py-2 sm:gap-3 sm:px-3">
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 sm:size-8"
                      aria-label={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
                    </button>
                    <span className="font-mono text-xs text-muted-foreground">
                      {formatClock(currentTime)} / {formatClock(duration)}
                    </span>
                    <div className="ml-auto flex items-center gap-1 sm:gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={toggleMute}
                        aria-label={isMuted ? "Unmute" : "Mute"}
                        className="h-10 w-10 px-0 text-muted-foreground hover:bg-secondary hover:text-foreground sm:h-9 sm:w-9"
                      >
                        {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={toggleFullScreen}
                        aria-label="Toggle fullscreen preview"
                        className="h-10 w-10 px-0 text-muted-foreground hover:bg-secondary hover:text-foreground sm:h-9 sm:w-9"
                      >
                        <Maximize className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (!fileInputRef.current) return;
                          fileInputRef.current.value = "";
                          fileInputRef.current.click();
                        }}
                        disabled={
                          stage === "uploading" || stage === "queued" ||
                          stage === "transcribing" || stage === "timing"
                        }
                        className="h-10 px-2 text-muted-foreground hover:bg-secondary hover:text-foreground sm:h-9 sm:px-3"
                      >
                        <Upload className="size-4" />
                        Replace
                      </Button>
                    </div>
                  </div>
                </motion.div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  className={cn(
                    "grid min-h-[240px] w-full cursor-pointer place-items-center rounded-xl border-2 border-dashed bg-black p-4 text-center transition-all duration-300 sm:aspect-video sm:p-6",
                    dragOver ? "border-zinc-400 bg-zinc-900/50" : "border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/30"
                  )}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
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
                    <div className="mt-4 flex items-center justify-center">
                      <span className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
                        <Upload className="size-4" />
                        Choose file
                      </span>
                    </div>
                    <p className="mt-4 text-xs text-muted-foreground">
                      Uploads are processed in the background. Files up to 150 MB and 30 minutes are supported.
                    </p>
                  </div>
                </div>
              )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED}
                  onChange={(event) => {
                    const input = event.currentTarget;
                    handleFile(input.files?.[0] || null);
                    input.value = "";
                  }}
                  disabled={
                    stage === "uploading" || stage === "queued" ||
                    stage === "transcribing" || stage === "timing"
                  }
                  className="hidden"
                  aria-hidden="true"
                />

              {/* Export buttons */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Export
                </span>
                <Select value={exportQuality} onValueChange={(v) => setExportQuality(v as typeof exportQuality)} disabled={!canExport || isExportingVideo}>
                  <SelectTrigger aria-label="Export quality" className="h-9 w-[100px] border-border bg-card text-xs">
                    <SelectValue placeholder="Quality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="480p">480p</SelectItem>
                    <SelectItem value="720p">720p</SelectItem>
                    <SelectItem value="1080p">1080p</SelectItem>
                    <SelectItem value="4k">4K</SelectItem>
                  </SelectContent>
                </Select>
                <LiquidMetalButton
                  label="Export Video"
                  onClick={() => void exportVideo()}
                  width={130}
                  disabled={!canExport || isExportingVideo}
                />
                {!segments.length && (
                  <span className="text-xs text-muted-foreground">Generate captions to enable export</span>
                )}
                {segments.length > 0 && isAudio && (
                  <span className="text-xs text-muted-foreground">Video export needs a video file (not audio-only)</span>
                )}
              </div>
              {/* Export progress bar */}
              {(isExportingVideo || exportMsg) && (
                <div role="status" aria-live="polite" className="mt-3 rounded-lg border border-border bg-background px-4 py-2">
                  <div className="flex items-center gap-2 text-xs">
                    {exportMsg && exportMsg.startsWith("Export failed") ? (
                      <AlertCircle className="size-4 text-red-500" />
                    ) : isExportingVideo ? (
                      <Loader2 className="size-4 animate-spin text-primary" />
                    ) : (
                      <Clapperboard className="size-4 text-primary" />
                    )}
                    <span className={cn("font-medium", exportMsg?.startsWith("Export failed") ? "text-red-500" : "text-white")}>
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

            </div>

            {/* Right: Tab-based Editor */}
            <div className="min-w-0 bg-background p-3 sm:p-6 lg:border-l lg:border-liquid-metal">
              <div className="flex items-center justify-center gap-3 rounded-full bg-zinc-900 p-1 mb-6 border border-zinc-800">
                {([
                  { id: "captions", label: "Captions", icon: TypeIcon },
                  { id: "style", label: "Templates", icon: Settings2 },
                ] as const).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    aria-pressed={activeTab === tab.id}
                    className={cn(
                      "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition-colors sm:flex-none sm:px-6",
                      activeTab === tab.id
                        ? "bg-white text-black shadow-lg"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                    )}
                  >
                    <tab.icon className="size-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === "captions" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Caption Segments ({segments.length})
                    </h4>
                    <div className="flex h-14 items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-3">
                      <span
                        id="broll-transitions-label"
                        className="text-xs font-medium text-zinc-300"
                      >
                        B-roll transitions
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {brollTransitionsEnabled ? "On" : "Off"}
                      </span>
                      <Switch
                        checked={brollTransitionsEnabled}
                        onCheckedChange={setBrollTransitionsEnabled}
                        aria-labelledby="broll-transitions-label"
                        disabled={isExportingVideo}
                        className="shrink-0 data-[state=checked]:bg-primary"
                      />
                    </div>
                  </div>
                  <ScrollArea className="editron-scroll h-[min(550px,60vh)] rounded-lg border border-zinc-800 bg-zinc-950">
                    <div className="flex flex-col gap-3 p-3">
                      {segments.length === 0 && (
                        <div className="p-6 text-center text-sm text-muted-foreground">
                          Upload a file and select Edit now to create captions. You can explore templates anytime.
                        </div>
                      )}
                      {segments.length > 0 && (
                        <p className="px-1 text-xs text-zinc-400">Hide captions without changing your video or audio.</p>
                      )}
                      {segments.map((seg, i) => {
                        const broll = brolls.find((clip) => brollBelongsToSegment(clip, seg)) ?? null;

                        return (
                          <SegmentCard
                            key={seg.id}
                            index={i}
                            segment={seg}
                            isActive={activeIdx === i}
                            onUpdate={updateSegment}
                            onToggleHidden={(id) => updateSegment(id, { hidden: !seg.hidden })}
                            onSeek={(time) => seekTo(time, true)}
                            broll={broll}
                            onAssignBroll={assignClip}
                            onRegenerateBroll={regenerateClip}
                            onRemoveBroll={removeClip}
                            onFetchAndAssignBroll={fetchAndAssignBroll}
                            onBrollActivityChange={(change) => setPendingBrollOperations((count) => count + change)}
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
                  <div
                    role="region"
                    aria-label="Global style controls"
                    tabIndex={0}
                    className="editron-scroll max-h-[min(550px,60vh)] overflow-y-auto overscroll-contain pr-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <StylePanel
                      style={style}
                      onChange={updateStyle}
                    />
                  </div>
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
