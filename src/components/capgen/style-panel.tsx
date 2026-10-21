"use client";

import { useState } from "react";
import { LiquidMetalButton } from "./liquid-metal-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CAPGEN_FONTS } from "@/lib/languages";
import type { CaptionPosition, CaptionStyle, CaptionTemplate } from "@/lib/captions";
import { Bold, Italic, CaseSensitive, AlignStartVertical, AlignCenter, AlignEndVertical, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  style: CaptionStyle;
  onChange: (patch: Partial<CaptionStyle>) => void;
  autoEmojiEnabled?: boolean;
  onAutoEmojiChange?: (v: boolean) => void;
  wordsPerCaption?: number;
  onWordsPerCaptionChange?: (v: number) => void;
};

const HYPER_STYLES = [
  {
    id: "plain",
    label: "PLAIN",
    preview: { color: "#ffffff", stroke: "none", shadow: "none", font: "normal", family: "Inter" }
  },
  {
    id: "pop-cinematic",
    label: "POP",
    preview: { color: "#ffffff", stroke: "1px black", shadow: "0 0 15px rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.8)", font: "bold", family: "Archivo Black" }
  },
  {
    id: "mr-beast-style",
    label: "BEAST",
    preview: { color: "#ffff00", stroke: "1px black", shadow: "0 0 15px rgba(255,255,0,0.4), 0 2px 0px #000", font: "black", family: "Archivo Black", letterSpacing: "1px" }
  },
  {
    id: "minimal-doc",
    label: "MINIMAL",
    preview: { color: "#ffffff", stroke: "none", shadow: "0 0 15px rgba(255,255,255,0.2), 0 2px 10px rgba(0,0,0,0.5)", font: "medium", family: "Inter" }
  },
  {
    id: "hormozi-energy",
    label: "ENERGY",
    preview: { color: "#cfff00", stroke: "1px black", shadow: "0 0 15px rgba(207,255,0,0.4), 0 2px 0px rgba(0,0,0,0.4)", font: "black", family: "Archivo Black", letterSpacing: "1px" }
  },
  {
    id: "luxury-aesthetic",
    label: "LUXURY",
    preview: { color: "#ffffff", stroke: "none", shadow: "0 0 15px rgba(255,255,255,0.3), 0 0 10px rgba(0,0,0,0.6)", font: "normal", family: "Playfair Display", letterSpacing: "2px" }
  },
  {
    id: "cyber-neon",
    label: "CYBER",
    preview: { color: "#00ffff", stroke: "none", shadow: "0 0 15px #00ffff, 0 0 5px #00ffff", font: "bold", family: "Russo One" }
  },
  {
    id: "podcast-clean",
    label: "PODCAST",
    preview: { color: "#ffffff", stroke: "1px black", shadow: "0 0 15px rgba(255,255,255,0.2), 0 2px 0px rgba(0,0,0,0.7)", font: "semibold", family: "Inter", letterSpacing: "1px" }
  },
  {
    id: "viral-breaking",
    label: "BREAKING",
    preview: { color: "#ffffff", stroke: "none", shadow: "0 0 10px rgba(255,0,0,0.5)", font: "black", family: "Archivo Black", bg: "#ff0000" }
  },
];

const TEMPLATES: { value: CaptionTemplate; label: string; previewType: "text" | "boxed" | "highlight" }[] = [
  { value: "plain", label: "Plain", previewType: "text" },
  { value: "active-word", label: "Karaoke", previewType: "highlight" },
  { value: "boxed", label: "Boxed", previewType: "boxed" },
  { value: "outline", label: "Outline", previewType: "text" },
];

const ANIMATIONS = [
  { id: "none", label: "Static", variant: "static" },
  { id: "pop", label: "Pop", variant: "pop" },
  { id: "cascade", label: "Cascade", variant: "slide-up" },
  { id: "slide", label: "Slide", variant: "slide-right" },
  { id: "bounce", label: "Bounce", variant: "bounce" },
  { id: "zoom", label: "Zoom", variant: "zoom" },
  { id: "flip", label: "Flip", variant: "flip" },
  { id: "blur", label: "Blur", variant: "blur" },
] as const;

const POSITIONS: { value: CaptionPosition; label: string; icon: React.ReactNode }[] = [
  { value: "top", label: "Top", icon: <AlignStartVertical className="size-4" /> },
  { value: "center", label: "Center", icon: <AlignCenter className="size-4" /> },
  { value: "bottom", label: "Bottom", icon: <AlignEndVertical className="size-4" /> },
];

export function StylePanel({
  style,
  onChange,
  autoEmojiEnabled,
  onAutoEmojiChange,
  wordsPerCaption,
  onWordsPerCaptionChange
}: Props) {
  const [activeCategory, setActiveCategory] = useState<"styles" | "templates" | "animations">("styles");

  return (
    <div className="space-y-6">
      {/* CATEGORY SWITCHER */}
      <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-zinc-950 border-liquid-metal">
        {(["styles", "templates", "animations"] as const).map((cat) => (
          <LiquidMetalButton
            key={cat}
            label={cat === "styles" ? "Cinematic" : cat === "templates" ? "Templates" : "Animations"}
            onClick={() => setActiveCategory(cat)}
            width={100}
            height={36}
            className={cn(
              "transition-all duration-300",
              activeCategory === cat
                ? "opacity-100"
                : "opacity-60 hover:opacity-100"
            )}
          />
        ))}
      </div>

      {/* DYNAMIC CONTENT AREA */}
      <div className="relative min-h-[120px]">
        <AnimatePresence mode="wait">
          {activeCategory === "styles" && (
            <motion.div
              key="styles"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="grid grid-cols-2 gap-2"
            >
              {HYPER_STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onChange({ hyperStyleId: s.id === "plain" ? null : s.id })}
                  className={cn(
                    "relative h-10 rounded-lg border transition-all overflow-hidden flex items-center justify-center group",
                    (style.hyperStyleId === s.id || (s.id === "plain" && !style.hyperStyleId))
                      ? "border-white bg-white shadow-sm ring-1 ring-white"
                      : "border-zinc-800 bg-zinc-950 hover:bg-zinc-900"
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-bold uppercase tracking-wider transition-colors",
                      (style.hyperStyleId === s.id || (s.id === "plain" && !style.hyperStyleId))
                        ? "text-black"
                        : "text-zinc-400 group-hover:text-white"
                    )}
                    style={{
                      color: (style.hyperStyleId === s.id || (s.id === "plain" && !style.hyperStyleId))
                        ? "#000"
                        : s.preview.color,
                      fontFamily: s.preview.family,
                      fontWeight: s.preview.font === "bold" || s.preview.font === "black" ? 900 : 400,
                      textShadow: s.preview.shadow !== "none" ? s.preview.shadow : "none",
                      letterSpacing: s.preview.letterSpacing || "normal",
                      backgroundColor: s.preview.bg || "transparent",
                      padding: s.preview.bg ? "2px 6px" : "0px",
                      borderRadius: s.preview.bg ? "4px" : "0px"
                    }}
                  >
                    {s.label}
                  </span>
                </button>
              ))}
            </motion.div>
          )}

          {activeCategory === "templates" && (
            <motion.div
              key="templates"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="grid grid-cols-2 gap-2"
            >
              {TEMPLATES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => onChange({ template: t.value })}
                  className={cn(
                    "relative h-12 rounded-lg border transition-all overflow-hidden flex items-center justify-center group",
                    style.template === t.value
                      ? "border-white bg-white shadow-sm ring-1 ring-white"
                      : "border-border bg-card hover:bg-accent"
                  )}
                >
                  <div className="flex gap-1 text-[10px] font-bold uppercase">
                    {t.previewType === "highlight" ? (
                      <>
                        <span className={cn(style.template === t.value ? "text-black" : "text-white/50")}>Sly</span>
                        <span className={cn(style.template === t.value ? "text-black" : "text-yellow-400")}>STYLE</span>
                      </>
                    ) : t.previewType === "boxed" ? (
                      <span className={cn(
                        "px-1 rounded border",
                        style.template === t.value ? "border-black text-black bg-transparent" : "border-white text-white bg-white/10"
                      )}>
                        {t.label}
                      </span>
                    ) : (
                      <span className={cn(style.template === t.value ? "text-black" : "text-white")}>
                        {t.label}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </motion.div>
          )}

          {activeCategory === "animations" && (
            <motion.div
              key="animations"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="grid grid-cols-2 gap-2"
            >
              {ANIMATIONS.map((anim) => (
                <button
                  key={anim.id}
                  type="button"
                  onClick={() => onChange({ animation: anim.id as any })}
                  className={cn(
                    "relative h-12 rounded-lg border transition-all overflow-hidden flex items-center justify-center group",
                    style.animation === anim.id
                      ? "border-white bg-white shadow-sm ring-1 ring-white"
                      : "border-border bg-black hover:bg-accent"
                  )}
                >
                  <motion.span
                    className={cn(
                      "text-xs font-bold uppercase",
                      style.animation === anim.id ? "text-black" : "text-white"
                    )}
                    animate={anim.variant === "static" ? {} : {
                      y: anim.variant === "pop" ? [0, -10, 0] : anim.variant === "slide-up" ? [10, 0] : 0,
                      x: anim.variant === "slide-right" ? [-10, 0] : 0,
                      scale: anim.variant === "zoom" ? [0.8, 1.2, 1] : 1,
                      rotateY: anim.variant === "flip" ? [0, 360] : 0,
                      filter: anim.variant === "blur" ? ["blur(4px)", "blur(0px)"] : "none",
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: Math.random() * 0.5,
                    }}
                  >
                    {anim.label}
                  </motion.span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CORE SETTINGS (STAY VISIBLE) */}
      <div className="space-y-4 pt-4 border-t border-liquid-metal">
        {/* Font Selection */}
        <div className="space-y-1.5">
          <Label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            Typography
          </Label>
          <Select value={style.fontFamily} onValueChange={(v) => onChange({ fontFamily: v })}>
            <SelectTrigger className="w-full bg-zinc-950 border-zinc-800 text-zinc-300">
              <SelectValue placeholder="Pick a font" />
            </SelectTrigger>
            <SelectContent>
              {["Viral", "Modern", "Playful", "Elegant", "Tech"].map((cat) => (
                <SelectGroup key={cat}>
                  <SelectLabel className="text-primary font-bold">{cat}</SelectLabel>
                  {CAPGEN_FONTS.filter((f) => f.category === cat).map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      <span style={{ fontFamily: f.cssFamily, fontSize: "15px", fontWeight: 700 }}>
                        {f.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Size & Spacing */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Size
              </Label>
              <span className="text-[10px] font-bold text-primary">{style.fontSize}px</span>
            </div>
            <Slider
              min={12}
              max={120}
              step={1}
              value={[style.fontSize]}
              onValueChange={(v) => onChange({ fontSize: v[0] })}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Spacing
              </Label>
              <span className="text-[10px] font-bold text-primary">{style.letterSpacing}px</span>
            </div>
            <Slider
              min={-2}
              max={12}
              step={1}
              value={[style.letterSpacing]}
              onValueChange={(v) => onChange({ letterSpacing: v[0] })}
            />
          </div>
        </div>

        {/* Caption Speed */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Caption Speed
            </Label>
            <span className="text-[10px] font-bold text-primary">
              {style.captionSpeed ? `${style.captionSpeed}x` : "1.0x"}
            </span>
          </div>
          <Slider
            min={0.5}
            max={3.0}
            step={0.1}
            value={[style.captionSpeed || 1.0]}
            onValueChange={(v) => onChange({ captionSpeed: v[0] })}
          />
        </div>

        {/* Colors */}
        <div className="grid grid-cols-3 gap-2">
          <ColorField label="Text" value={style.textColor} onChange={(v) => onChange({ textColor: v })} />
          <ColorField label="High" value={style.highlightColor} onChange={(v) => onChange({ highlightColor: v })} />
          <ColorField label="Box" value={style.bgColor} onChange={(v) => onChange({ bgColor: v })} />
        </div>

        {/* Words per Caption */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Words / Caption
            </Label>
            <span className="text-[10px] font-bold text-primary">{wordsPerCaption}</span>
          </div>
          <Slider
            min={1}
            max={12}
            step={1}
            value={[wordsPerCaption]}
            onValueChange={(v) => onWordsPerCaptionChange?.(v[0])}
          />
        </div>

        {/* Position & Toggles */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Position
            </Label>
            <ToggleGroup
              type="single"
              value={style.position}
              onValueChange={(v) => {
                if (v) onChange({ position: v as CaptionPosition });
              }}
              className="grid w-full grid-cols-3 gap-1 rounded-lg border border-border bg-background p-1"
            >
              {POSITIONS.map((p) => (
                <ToggleGroupItem
                  key={p.value}
                  value={p.value}
                  aria-label={p.label}
                  className="flex-col gap-1 py-2 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  {p.icon}
                  {p.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <ToggleBtn
              active={style.bold}
              onClick={() => onChange({ bold: !style.bold })}
              icon={<Bold className="size-4" />}
              label="Bold"
            />
            <ToggleBtn
              active={style.italic}
              onClick={() => onChange({ italic: !style.italic })}
              icon={<Italic className="size-4" />}
              label="Italic"
            />
            <ToggleBtn
              active={style.uppercase}
              onClick={() => onChange({ uppercase: !style.uppercase })}
              icon={<CaseSensitive className="size-4" />}
              label="Upper"
            />
          </div>
        </div>

        {/* Auto Emoji */}
        <div className="mt-6 rounded-xl border border-border bg-background p-3 transition-all group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-1.5 rounded-lg transition-colors",
                autoEmojiEnabled ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              )}>
                <Sparkles className="size-4" />
              </div>
              <Label className={cn(
                "text-xs font-semibold uppercase tracking-widest transition-colors",
                autoEmojiEnabled ? "text-foreground" : "text-muted-foreground"
              )}>
                Auto Emojis
              </Label>
            </div>
            <Switch
              checked={autoEmojiEnabled}
              onCheckedChange={onAutoEmojiChange}
              className="shrink-0 data-[state=checked]:bg-primary"
            />
          </div>
          <p className={cn(
            "mt-1 text-[10px] transition-colors",
            autoEmojiEnabled ? "text-muted-foreground" : "text-muted-foreground/40"
          )}>
            {autoEmojiEnabled
              ? "AI is currently injecting contextual emojis."
              : "Emojis are disabled. Turn on for automatic injection."}
          </p>
        </div>
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      <div className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-6 rounded"
          aria-label={label}
        />
        <span className="font-mono text-[11px] text-muted-foreground">{value.toUpperCase()}</span>
      </div>
    </div>
  );
}

function ToggleBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      variant="ghost"
      className={cn(
        "flex-col gap-1 py-2 text-xs",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </Button>
  );
}
