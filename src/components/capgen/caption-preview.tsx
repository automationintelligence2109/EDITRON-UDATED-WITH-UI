"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CAPGEN_FONTS, getFontFamily } from "@/lib/languages";
import { activeSegmentIndex, type CaptionSegment, type CaptionStyle, type CaptionAnimation } from "@/lib/captions";
import { activeBrollAt, type BRollClip } from "@/lib/broll";
import { cn } from "@/lib/utils";

type Props = {
  videoUrl: string | null;
  isAudio: boolean;
  segments: CaptionSegment[];
  currentTime: number;
  style: CaptionStyle;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  aspectRatio?: number;
  captionSpeed?: number;
  onTimeUpdate?: (t: number) => void;
  onLoadedMetadata?: (duration: number) => void;
  onVideoDimensions?: (width: number, height: number) => void;
  brolls?: BRollClip[];
  hookTitle?: string;
  onChangeStyle?: (patch: Partial<CaptionStyle>) => void;
};

function getStringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export function CaptionPreview({
  videoUrl,
  isAudio,
  segments,
  currentTime,
  style,
  videoRef,
  aspectRatio = 16 / 9,
  captionSpeed = 1,
  onTimeUpdate,
  onLoadedMetadata,
  onVideoDimensions,
  brolls = [],
  hookTitle = "",
  onChangeStyle,
}: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);

  const fontFamilyCss = getFontFamily(style.fontFamily);
  const activeBroll = useMemo(() => activeBrollAt(brolls, currentTime), [brolls, currentTime]);

  const activeTransition = useMemo(() => {
    const TRANS_DURATION = 0.3;
    const transitionAssets = [
      "fade", "wipeleft", "wiperight", "wipeup", "wipedown",
      "slideleft", "slideright", "slideup", "slidedown",
      "circlecrop", "rectcrop", "distance", "fadeblack",
      "fadewhite", "radial", "smoothleft", "smoothright",
      "smoothup", "smoothdown", "circleopen", "circleclose",
      "vertopen", "vertclose", "horzopen", "horzclose",
      "dissolve", "pixelize", "diagtl", "diagtr", "diagbl",
      "diagbr", "hlslice", "hrslice", "vuslice", "vdslice",
      "hblur", "fadegrays", "wipetl", "wipetr", "wipebl",
      "wipebr", "squeezeh", "squeezev", "zoomin", "fadefast",
      "fadeslow", "hlwind", "hrwind", "vuwind", "vdwind",
      "coverleft", "coverright", "coverup", "coverdown",
      "revealleft", "revealright", "revealup", "revealdown"
    ];

    for (const broll of brolls) {
      if (!broll.id) continue;
      const hash = getStringHash(broll.id);

      if (currentTime >= broll.start - TRANS_DURATION && currentTime <= broll.start + TRANS_DURATION) {
        const asset = broll.transitionIn || transitionAssets[hash % transitionAssets.length];
        return { type: "in", brollId: broll.id, asset };
      }
      if (currentTime >= broll.end - TRANS_DURATION && currentTime <= broll.end + TRANS_DURATION) {
        const asset = broll.transitionOut || transitionAssets[(hash + 1) % transitionAssets.length];
        return { type: "out", brollId: broll.id, asset };
      }
    }
    return null;
  }, [brolls, currentTime]);

  const activeIdx = useMemo(() => activeSegmentIndex(segments, currentTime), [segments, currentTime]);
  const activeSeg = activeIdx >= 0 ? segments[activeIdx] : null;

  const wordsWithTiming = useMemo(() => {
    if (!activeSeg) return [];
    if (activeSeg.words) return activeSeg.words;

    const words = activeSeg.text.split(/\s+/);
    const duration = activeSeg.end - activeSeg.start;
    return words.map((w, i) => ({
      word: w,
      start: activeSeg.start + (i * (duration / words.length)),
      end: activeSeg.start + ((i + 1) * (duration / words.length)),
    }));
  }, [activeSeg]);

  const positionClass =
    style.position === "top"
      ? "items-start pt-6"
      : style.position === "center"
        ? "items-center"
        : "items-end pb-8";

  const textTransform = style.uppercase ? "uppercase" : "none";
  const fontWeight = style.bold ? 800 : 500;
  const fontStyle = style.italic ? "italic" : "normal";
  const bgStyle =
    style.bgOpacity > 0
      ? {
          backgroundColor: hexWithOpacity(style.bgColor, style.bgOpacity / 100),
        }
      : undefined;

  const wrapperBg = isAudio
    ? "linear-gradient(135deg, #1A1A1A 0%, #2a2a2a 60%, #FF6B1A 200%)"
    : undefined;

  const getAnimationInitial = (anim: CaptionAnimation) => {
    switch (anim) {
      case "pop": return { scale: 0.8, opacity: 0 };
      case "slide": return { y: 20, opacity: 0 };
      case "cascade": return { opacity: 0 };
      case "bounce": return { scale: 0.5, opacity: 0 };
      case "zoom": return { scale: 0, opacity: 0 };
      case "flip": return { rotateX: 90, opacity: 0 };
      case "blur": return { opacity: 0, filter: "blur(10px)" };
      default: return { opacity: 0 };
    }
  };

  const getAnimationAnimate = (anim: CaptionAnimation) => {
    switch (anim) {
      case "pop": return { scale: 1, opacity: 1 };
      case "slide": return { y: 0, opacity: 1 };
      case "cascade": return { opacity: 1 };
      case "bounce": return { scale: 1, opacity: 1 };
      case "zoom": return { scale: 1, opacity: 1 };
      case "flip": return { rotateX: 0, opacity: 1 };
      case "blur": return { opacity: 1, filter: "blur(0px)" };
      default: return { opacity: 1 };
    }
  };

  const isTall = aspectRatio < 1;
  const isSquare = aspectRatio >= 0.95 && aspectRatio <= 1.05;
  const containerStyle: React.CSSProperties = isAudio
    ? { aspectRatio: "16 / 9" }
    : { aspectRatio: `${aspectRatio}` };

  const wrapperClass = cn(
    "mx-auto overflow-hidden rounded-xl border border-[#2a2a2a] bg-black relative",
    isTall
      ? "h-[75vh] max-h-[640px] w-auto max-w-full"
      : isSquare
        ? "h-[70vh] max-h-[560px] w-auto max-w-full"
        : "w-full"
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current || !captionRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
      const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
      captionRef.current.style.left = `${xPercent}%`;
      captionRef.current.style.top = `${yPercent}%`;
      onChangeStyle?.({
        posX: xPercent - 50,
        posY: yPercent - 50
      });
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleGlobalMouseMove);
      window.addEventListener("mouseup", handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isDragging, onChangeStyle]);

  return (
    <div
      ref={containerRef}
      className={wrapperClass}
      style={containerStyle}
    >
      <div className="relative size-full overflow-hidden bg-black">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="absolute inset-0 size-full object-contain z-0"
            onTimeUpdate={(e) => onTimeUpdate?.(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              onLoadedMetadata?.(v.duration);
              if (v.videoWidth > 0 && v.videoHeight > 0) {
                onVideoDimensions?.(v.videoWidth, v.videoHeight);
              }
            }}
            playsInline
          />
        ) : (
          null
        )}

        {activeBroll && (
          <video
            key={activeBroll.id}
            src={activeBroll.previewUrl}
            className="absolute inset-0 size-full object-cover z-10"
            autoPlay
            muted
            loop
            playsInline
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              const start = activeBroll.trimStart ?? 0;
              const end = activeBroll.trimEnd ?? v.duration;
              if (v.currentTime < start) {
                v.currentTime = start;
              } else if (v.currentTime >= end) {
                v.currentTime = start;
              }
            }}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (activeBroll.trimStart !== undefined) {
                v.currentTime = activeBroll.trimStart;
              }
            }}
          />
        )}

        {activeTransition && (
          <motion.div
            key={`trans-${activeTransition.brollId}-${activeTransition.type}-${activeTransition.asset}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "absolute inset-0 z-50 pointer-events-none flex items-center justify-center",
              activeTransition.asset === "fade" && "bg-black/50",
              activeTransition.asset === "fadewhite" && "bg-white/50",
              activeTransition.asset === "fadeblack" && "bg-black/80"
            )}
            style={{
              mixBlendMode: "screen",
            }}
          >
            <div className={cn(
              "size-full transition-all duration-300 ease-in-out",
              activeTransition.type === "in" ? "animate-in fade-in zoom-in-50" : "animate-out fade-out zoom-out-50"
            )} />
          </motion.div>
        )}



        {hookTitle && (
          <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center px-6">
            <div className="max-w-[90%] rounded-xl bg-white px-4 py-2.5 text-center shadow-lg">
              <span className="text-[15px] font-extrabold leading-snug text-[#111111]">
                {hookTitle}
              </span>
            </div>
          </div>
        )}

        {!videoUrl && (
          <div
            className="absolute inset-0 grid place-items-center z-0"
            style={{
              background: wrapperBg || "linear-gradient(135deg, #1A1A1A 0%, #2a2a2a 100%)",
            }}
          >
            <div className="text-center text-white/80">
              <p className="text-sm font-medium">No media loaded</p>
              <p className="mt-1 text-xs text-white/60">Upload a file or try the sample</p>
            </div>
          </div>
        )}

        {activeSeg && (
          <div
            className={cn(
              "absolute inset-0 pointer-events-none flex justify-center px-6",
              positionClass
            )}
            style={{ zIndex: 20 }}
          >
            <AnimatePresence mode="popLayout">
              <motion.div
                key={activeSeg.id}
                initial={getAnimationInitial(style.animation)}
                animate={getAnimationAnimate(style.animation)}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.3,
                  ease: "easeOut"
                }}
                ref={captionRef}
                onMouseDown={handleMouseDown}
                className="absolute max-w-[88%] rounded-md px-2 py-1 text-center select-none cursor-move pointer-events-auto"
                style={{
                  ...bgStyle,
                  fontFamily: fontFamilyCss,
                  fontSize: `${style.fontSize}px`,
                  color: style.textColor,
                  fontWeight,
                  fontStyle,
                  textTransform,
                  letterSpacing: `${style.letterSpacing}px`,
                  lineHeight: 1.1,
                  left: `${style.posX + 50}%`,
                  top: `${style.posY + 50}%`,
                  transform: 'translate(-50%, -50%)',
                  textShadow:
                    style.template === "outline"
                      ? undefined
                      : "0 2px 8px rgba(0,0,0,0.6)",
                  WebkitTextStroke:
                    style.template === "outline"
                      ? `${Math.max(1, style.strokeWidth)}px ${style.strokeColor}`
                      : undefined,
                }}
              >
                {style.template === "active-word" ? (
                  <span className="inline-flex flex-wrap justify-center gap-x-[0.35em] gap-y-0">
                    {wordsWithTiming.map((wObj, i) => {
                      const adjustedStart = wObj.start * captionSpeed;
                      const adjustedEnd = wObj.end * captionSpeed;
                      const isActive = currentTime >= adjustedStart && currentTime < adjustedEnd;
                      return (
                        <motion.span
                          key={i}
                          animate={{
                            scale: isActive ? 1.2 : 1,
                            color: isActive ? style.highlightColor : style.textColor,
                          }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          style={{
                            display: "inline-block",
                            marginRight: "0.35em",
                            fontWeight: isActive ? 900 : 800,
                          }}
                          className={cn(isActive && "capgen-active-word")}
                        >
                          {wObj.word}
                        </motion.span>
                      );
                    })}
                  </span>
                ) : style.template === "boxed" ? (
                  <span
                    style={{
                      backgroundColor: style.highlightColor,
                      color: "#ffffff",
                      padding: "0.1em 0.4em",
                      borderRadius: "0.25em",
                    }}
                  >
                    {style.uppercase ? activeSeg.text.toUpperCase() : activeSeg.text}
                  </span>
                ) : (
                  <span>{style.uppercase ? activeSeg.text.toUpperCase() : activeSeg.text}</span>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function formatAspectRatio(ratio: number): string {
  const common: Array<[number, string]> = [
    [16 / 9, "16:9"],
    [9 / 16, "9:16"],
    [1, "1:1"],
    [4 / 3, "4:3"],
    [3 / 4, "3:4"],
    [21 / 9, "21:9"],
    [2 / 3, "2:3"],
    [3 / 2, "3:2"],
  ];
  for (const [r, label] of common) {
    if (Math.abs(ratio - r) < 0.02) return label;
  }
  return ratio.toFixed(2);
}

function hexWithOpacity(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export { CAPGEN_FONTS };
