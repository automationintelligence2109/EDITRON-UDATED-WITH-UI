"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { EDITRON_FONTS, getFontFamily } from "@/lib/languages";
import {
  activeSegmentIndex,
  getActiveWordIndex,
  getCaptionWordRenderState,
  getCaptionWords,
  getCaptionPositionBase,
  layoutCaptionWords,
  type CaptionSegment,
  type CaptionStyle,
} from "@/lib/captions";
import { activeBrollAt, isBrollImage, type BRollClip } from "@/lib/broll";
import { activeBrollTransitionAt } from "@/lib/broll-transitions";
import { cn } from "@/lib/utils";
import { isInterruptedPlayback } from "@/lib/media-playback";

type Props = {
  videoUrl: string | null;
  isAudio: boolean;
  segments: CaptionSegment[];
  currentTime: number;
  duration?: number;
  brollTransitionsEnabled?: boolean;
  style: CaptionStyle;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  aspectRatio?: number;
  onTimeUpdate?: (t: number) => void;
  onLoadedMetadata?: (duration: number) => void;
  onVideoDimensions?: (width: number, height: number) => void;
  brolls?: BRollClip[];
  hookTitle?: string;
  onChangeStyle?: (patch: Partial<CaptionStyle>) => void;
};

function playTransitionVideo(video: HTMLVideoElement) {
  video.play().catch((error: unknown) => {
    if (isInterruptedPlayback(error, video)) return;
    console.error("[CaptionPreview] Transition playback failed", error);
  });
}

export function CaptionPreview({
  videoUrl,
  isAudio,
  segments,
  currentTime,
  duration,
  brollTransitionsEnabled = true,
  style,
  videoRef,
  aspectRatio = 16 / 9,
  onTimeUpdate,
  onLoadedMetadata,
  onVideoDimensions,
  brolls = [],
  hookTitle = "",
  onChangeStyle,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const draggingPointerRef = useRef<number | null>(null);
  const activeBrollVideoRef = useRef<HTMLVideoElement>(null);
  const transitionVideoRef = useRef<HTMLVideoElement>(null);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [fontRevision, setFontRevision] = useState(0);

  const fontFamilyCss = getFontFamily(style.fontFamily);
  const activeBroll = useMemo(() => activeBrollAt(brolls, currentTime), [brolls, currentTime]);
  const activeTransition = useMemo(
    () =>
      brollTransitionsEnabled
        ? activeBrollTransitionAt(brolls, currentTime, duration)
        : null,
    [brolls, currentTime, duration, brollTransitionsEnabled]
  );

  const activeIdx = useMemo(() => activeSegmentIndex(segments, currentTime), [segments, currentTime]);
  const activeSeg = activeIdx >= 0 ? segments[activeIdx] : null;

  const textTransform = style.uppercase ? "uppercase" : "none";
  const fontWeight = style.fontWeight ?? (style.bold ? 800 : 500);
  const fontStyle = style.italic ? "italic" : "normal";
  const captionWords = useMemo(
    () => (activeSeg ? getCaptionWords(activeSeg) : []),
    [activeSeg],
  );
  const activeWordIndex = getActiveWordIndex(captionWords, currentTime);
  const letterSpacingPx =
    style.letterSpacingUnit === "em"
      ? style.letterSpacing * style.fontSize
      : style.letterSpacing;
  const wordLayout = useMemo(() => {
    if (!activeSeg || !captionWords.length || previewSize.width <= 0 || typeof document === "undefined") {
      return { words: [], width: 0, height: 0, lineHeight: style.fontSize * 1.1 };
    }

    const measureCanvas = document.createElement("canvas");
    const context = measureCanvas.getContext("2d");
    if (!context) return { words: [], width: 0, height: 0, lineHeight: style.fontSize * 1.1 };

    const configureContext = (
      index: number,
      wordContext: CanvasRenderingContext2D,
    ) => {
      const activeWordFontFamily = style.animationType === "slide-up" &&
        index === activeWordIndex &&
        style.activeWordFontFamily;
      const family = activeWordFontFamily
        ? getFontFamily(activeWordFontFamily)
        : fontFamilyCss;
      const weight = activeWordFontFamily
        ? style.activeWordFontWeight ?? 400
        : fontWeight;
      const italic = activeWordFontFamily
        ? style.activeWordFontStyle ?? "italic"
        : fontStyle;
      wordContext.font = `${italic} ${weight} ${style.fontSize}px ${family}`;
      if ("letterSpacing" in wordContext) {
        wordContext.letterSpacing = `${letterSpacingPx}px`;
      }
    };

    const layout = layoutCaptionWords(
      captionWords,
      previewSize.width * 0.88,
      style.fontSize,
      (word, index) => {
        configureContext(index, context);
        return context.measureText(style.uppercase ? word.toUpperCase() : word).width;
      },
      (() => {
        configureContext(-1, context);
        return context.measureText(" ").width;
      })(),
    );
    return layout;
  }, [
    activeSeg,
    activeWordIndex,
    captionWords,
    fontFamilyCss,
    fontRevision,
    fontStyle,
    fontWeight,
    letterSpacingPx,
    previewSize.width,
    style.activeWordFontFamily,
    style.activeWordFontStyle,
    style.activeWordFontWeight,
    style.animationType,
    style.fontSize,
    style.uppercase,
  ]);
  const pillTarget = style.animationType === "glass-pill"
    ? wordLayout.words.find((placement) => placement.index === activeWordIndex) ?? null
    : null;
  const bgStyle =
    style.bgOpacity > 0
      ? {
          backgroundColor: hexWithOpacity(style.bgColor, style.bgOpacity / 100),
        }
      : undefined;

  const wrapperBg = isAudio
    ? "linear-gradient(135deg, #1A1A1A 0%, #2a2a2a 60%, #FF6B1A 200%)"
    : undefined;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      setPreviewSize({ width: container.clientWidth, height: container.clientHeight });
    });
    resizeObserver.observe(container);
    setPreviewSize({ width: container.clientWidth, height: container.clientHeight });
    return () => resizeObserver.disconnect();
  }, [aspectRatio, videoUrl]);

  useEffect(() => {
    let isCurrent = true;
    const weight = style.fontWeight ?? (style.bold ? 800 : 500);
    const fontFaces = [
      `${weight} 16px ${fontFamilyCss}`,
      ...(style.activeWordFontFamily
        ? [`italic ${style.activeWordFontWeight ?? 400} 16px ${getFontFamily(style.activeWordFontFamily)}`]
        : []),
    ];

    void Promise.all(fontFaces.map((fontFace) => document.fonts.load(fontFace)))
      .then(() => document.fonts.ready)
      .then(() => {
        if (isCurrent) setFontRevision((revision) => revision + 1);
      })
      .catch((error: unknown) => {
        console.error("[CaptionPreview] Caption font loading failed", error);
      });

    return () => {
      isCurrent = false;
    };
  }, [
    fontFamilyCss,
    style.activeWordFontFamily,
    style.activeWordFontWeight,
    style.bold,
    style.fontWeight,
  ]);

  useEffect(() => {
    const transitionVideo = transitionVideoRef.current;
    if (!activeTransition || !transitionVideo || transitionVideo.readyState < 1) return;

    transitionVideo.currentTime = Math.min(
      activeTransition.progress * activeTransition.asset.duration,
      Math.max(0, activeTransition.asset.duration - 0.001)
    );
    transitionVideo.playbackRate =
      activeTransition.asset.duration / (activeTransition.end - activeTransition.start);

    if (videoRef.current?.paused) {
      transitionVideo.pause();
    } else {
      playTransitionVideo(transitionVideo);
    }
  }, [
    activeTransition?.key,
    activeTransition?.start,
    activeTransition?.end,
    videoRef,
  ]);

  useEffect(() => {
    const brollVideo = activeBrollVideoRef.current;
    if (!brollVideo) return;
    if (videoRef.current?.paused) {
      brollVideo.pause();
    } else {
      brollVideo.play().catch((error: unknown) => {
        if (isInterruptedPlayback(error, brollVideo)) return;
        console.error("[CaptionPreview] B-roll playback failed", error);
      });
    }
  }, [activeBroll?.id, videoRef]);

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

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.preventDefault();
    draggingPointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (draggingPointerRef.current !== event.pointerId || !containerRef.current || !captionRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const xPercent = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
    captionRef.current.style.left = `${xPercent}%`;
    captionRef.current.style.top = `${yPercent}%`;
    onChangeStyle?.({
      posX: xPercent - 50,
      posY: yPercent - getCaptionPositionBase(style.position),
    });
  };

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
            onSeeking={(e) => {
              const time = e.currentTarget.currentTime;
              const transition = activeBrollTransitionAt(
                brolls,
                time,
                e.currentTarget.duration
              );
              const transitionVideo = transitionVideoRef.current;
              if (!transition || !transitionVideo || transitionVideo.readyState < 1) return;
              transitionVideo.currentTime = Math.min(
                transition.progress * transition.asset.duration,
                Math.max(0, transition.asset.duration - 0.001)
              );
            }}
            onPlay={() => {
              const transitionVideo = transitionVideoRef.current;
              if (transitionVideo) playTransitionVideo(transitionVideo);
              const brollVideo = activeBrollVideoRef.current;
              brollVideo?.play().catch((error: unknown) => {
                if (!isInterruptedPlayback(error, brollVideo)) {
                  console.error("[CaptionPreview] B-roll playback failed", error);
                }
              });
            }}
            onPause={() => {
              transitionVideoRef.current?.pause();
              activeBrollVideoRef.current?.pause();
            }}
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

        {activeBroll && (isBrollImage(activeBroll) ? (
          <img
            key={activeBroll.id}
            src={activeBroll.previewUrl}
            alt={activeBroll.query}
            className="absolute inset-0 z-10 size-full object-cover"
          />
        ) : (
          <video
            key={activeBroll.id}
            ref={activeBrollVideoRef}
            src={activeBroll.previewUrl}
            className="absolute inset-0 size-full object-cover z-10"
            muted
            playsInline
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              const start = activeBroll.trimStart ?? 0;
              const end = activeBroll.trimEnd ?? v.duration;
              if (v.currentTime < start || v.currentTime >= end) {
                v.currentTime = start;
              }
            }}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (activeBroll.trimStart !== undefined) {
                v.currentTime = activeBroll.trimStart;
              }
            }}
            onEnded={(e) => {
              const video = e.currentTarget;
              video.currentTime = activeBroll.trimStart ?? 0;
              video.play().catch((error: unknown) => {
                if (isInterruptedPlayback(error, video)) return;
                console.error("[CaptionPreview] B-roll loop playback failed", error);
              });
            }}
          />
        ))}

        {activeTransition && (
          <video
            key={activeTransition.key}
            ref={transitionVideoRef}
            src={activeTransition.asset.src}
            className="pointer-events-none absolute inset-0 z-10 size-full object-cover"
            style={{ mixBlendMode: "screen" }}
            muted
            playsInline
            preload="auto"
            onLoadedMetadata={(e) => {
              const transitionVideo = e.currentTarget;
              transitionVideo.currentTime = Math.min(
                activeTransition.progress * activeTransition.asset.duration,
                Math.max(0, activeTransition.asset.duration - 0.001)
              );
              transitionVideo.playbackRate =
                activeTransition.asset.duration / (activeTransition.end - activeTransition.start);
              if (videoRef.current?.paused) {
                transitionVideo.pause();
              } else {
                playTransitionVideo(transitionVideo);
              }
            }}
          />
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
              <p className="mt-1 text-xs text-white/60">Upload a file to preview it</p>
            </div>
          </div>
        )}

        {activeSeg && wordLayout.words.length > 0 && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 20 }}
          >
            <div
              key={activeSeg.id}
              ref={captionRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={() => { draggingPointerRef.current = null; }}
              onPointerCancel={() => { draggingPointerRef.current = null; }}
              onLostPointerCapture={() => { draggingPointerRef.current = null; }}
              className="absolute select-none touch-none pointer-events-auto cursor-move"
              style={{
                width: "88%",
                height: `${wordLayout.height}px`,
                left: `${style.posX + 50}%`,
                top: `${style.posY + getCaptionPositionBase(style.position)}%`,
                transform: "translate(-50%, -50%)",
                fontFamily: fontFamilyCss,
                fontSize: `${style.fontSize}px`,
                color: style.textColor,
                fontWeight,
                fontStyle,
                textTransform,
                letterSpacing: `${style.letterSpacing}${style.letterSpacingUnit ?? "px"}`,
                lineHeight: 1.1,
                textShadow: style.textShadow ?? "0 2px 8px rgba(0,0,0,0.6)",
              }}
            >
              {style.bgOpacity > 0 && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-1/2"
                  style={{
                    width: `${wordLayout.width + 16}px`,
                    height: `${wordLayout.height + 8}px`,
                    transform: "translate(-50%, -50%)",
                    borderRadius: "6px",
                    backgroundColor: bgStyle?.backgroundColor,
                  }}
                />
              )}
              {style.animationType === "glass-pill" && pillTarget && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-1/2"
                  style={{
                    left: `calc(50% + ${pillTarget.centerX}px)`,
                    top: `calc(50% + ${pillTarget.centerY}px)`,
                    width: `${pillTarget.width + (style.pillPaddingX ?? 8) * 2}px`,
                    height: `${style.fontSize * 1.1 + (style.pillPaddingY ?? 4) * 2}px`,
                    transform: "translate(-50%, -50%)",
                    border: style.pillBorder ? `1px solid ${style.pillBorder}` : undefined,
                    borderRadius: `${style.pillBorderRadius ?? 8}px`,
                    backgroundColor: style.pillColor,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
                    transition:
                      "left 160ms cubic-bezier(0.33,1,0.68,1), top 160ms cubic-bezier(0.33,1,0.68,1), width 160ms cubic-bezier(0.33,1,0.68,1)",
                  }}
                />
              )}
              {wordLayout.words.map((placement) => {
                const word = captionWords[placement.index];
                const wordState = getCaptionWordRenderState(
                  style.animationType,
                  word,
                  placement.index,
                  activeWordIndex,
                  currentTime,
                  style.inactiveOpacity,
                );
                const isActiveWord = placement.index === activeWordIndex;
                const activeWordFontFamily = isActiveWord
                  ? style.activeWordFontFamily
                  : undefined;
                const displayWord = style.uppercase ? word.word.toUpperCase() : word.word;

                return (
                  <span key={`word-${placement.index}`}>
                    <span
                      className="absolute left-1/2 top-1/2 whitespace-pre"
                      style={{
                        left: `calc(50% + ${placement.centerX}px)`,
                        top: `calc(50% + ${placement.centerY}px)`,
                        transform: `translate(-50%, -50%) translateY(${wordState.translateY}px) scale(${wordState.scale})`,
                        transformOrigin: "center",
                        opacity: wordState.opacity,
                        filter: wordState.blur > 0 ? `blur(${wordState.blur}px)` : undefined,
                        fontFamily: activeWordFontFamily
                          ? getFontFamily(activeWordFontFamily)
                          : undefined,
                        fontStyle: activeWordFontFamily
                          ? style.activeWordFontStyle ?? "italic"
                          : undefined,
                        fontWeight: activeWordFontFamily
                          ? style.activeWordFontWeight ?? 400
                          : undefined,
                      }}
                    >
                      {displayWord}
                    </span>
                    {style.animationType === "underline" && isActiveWord && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute left-1/2 top-1/2"
                        style={{
                          left: `calc(50% + ${placement.centerX}px)`,
                          top: `calc(50% + ${placement.centerY + style.fontSize * 0.68}px)`,
                          width: `${placement.width}px`,
                          height: "3px",
                          transform: "translate(-50%, -50%)",
                          borderRadius: "9999px",
                          backgroundColor: style.accentColor ?? "#818CF8",
                          clipPath: `inset(0 ${100 - wordState.underlineProgress * 100}% 0 0 round 2px)`,
                        }}
                      />
                    )}
                  </span>
                );
              })}
            </div>
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

export { EDITRON_FONTS };
