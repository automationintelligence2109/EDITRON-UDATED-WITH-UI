"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
import { EDITRON_FONTS, getFontFamily } from "@/lib/languages";
import {
  CINEMATIC_PRESETS,
  DEFAULT_STYLE,
  type CaptionPosition,
  type CaptionStyle,
  type CinematicPresetId,
} from "@/lib/captions";
import { Bold, Italic, CaseSensitive, AlignStartVertical, AlignCenter, AlignEndVertical } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  style: CaptionStyle;
  onChange: (patch: Partial<CaptionStyle>) => void;
};

const HYPER_STYLES: {
  id: CinematicPresetId;
}[] = [
  { id: "clean" },
  { id: "pop-cinematic" },
  { id: "mr-beast-style" },
  { id: "minimal-doc" },
  { id: "hormozi-energy" },
  { id: "luxury-aesthetic" },
  { id: "cyber-neon" },
  { id: "podcast-clean" },
  { id: "viral-breaking" },
];

const PREMIUM_STYLES: { id: CinematicPresetId }[] = [
  { id: "editorial-luxe" },
  { id: "apple-glass-pill" },
  { id: "cinema-blur" },
  { id: "podcast-karaoke" },
  { id: "minimalist-underline" },
];

const POSITIONS: { value: CaptionPosition; label: string; icon: React.ReactNode }[] = [
  { value: "top", label: "Top", icon: <AlignStartVertical className="size-4" /> },
  { value: "center", label: "Center", icon: <AlignCenter className="size-4" /> },
  { value: "bottom", label: "Bottom", icon: <AlignEndVertical className="size-4" /> },
];

export function StylePanel({
  style,
  onChange,
}: Props) {
  const renderPresetButton = (preset: { id: CinematicPresetId }) => {
    const isSelected = style.hyperStyleId === preset.id;

    return (
      <button
        key={preset.id}
        type="button"
        aria-label={`${preset.id.replace(/-/g, " ")} style`}
        aria-pressed={isSelected}
        onClick={() => onChange({ hyperStyleId: preset.id })}
        className={cn(
          "relative h-11 w-full rounded-lg border transition-all duration-200 overflow-hidden flex items-center justify-center",
          isSelected
            ? "border-[#5b5b5f] bg-[#2f2f33] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
            : "border-[#d7d7d7]/20 bg-[#1f1f22] hover:bg-[#252528] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
        )}
      >
        <CinematicStylePreview presetId={preset.id} selected={isSelected} />
      </button>
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <section aria-label="Caption templates" className="space-y-1.5">
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Templates
          </h3>
          <div className="grid w-full max-w-[366px] grid-cols-2 gap-1.5">
            {HYPER_STYLES.map(renderPresetButton)}
          </div>
        </section>
        <section aria-label="Premium Studio caption presets" className="space-y-1.5">
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Premium Studio
          </h3>
          <div className="grid w-full max-w-[366px] grid-cols-2 gap-1.5">
            {PREMIUM_STYLES.map(renderPresetButton)}
          </div>
        </section>
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
                  {EDITRON_FONTS.filter((f) => f.category === cat).map((f) => (
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

        {/* Colors */}
        <div className="grid grid-cols-2 gap-2">
          <ColorField label="Text" value={style.textColor} onChange={(v) => onChange({ textColor: v })} />
          <ColorField label="Box" value={style.bgColor} onChange={(v) => onChange({ bgColor: v })} />
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

function CinematicStylePreview({ presetId, selected }: { presetId: CinematicPresetId; selected: boolean }) {
  const style = { ...DEFAULT_STYLE, ...CINEMATIC_PRESETS[presetId] };
  const presetNames: Record<CinematicPresetId, string> = {
    clean: "Clean",
    "pop-cinematic": "Pop",
    "mr-beast-style": "Mr. Beast",
    "minimal-doc": "Minimal",
    "hormozi-energy": "Hormozi",
    "luxury-aesthetic": "Luxury",
    "cyber-neon": "Cyber",
    "podcast-clean": "Podcast",
    "viral-breaking": "Breaking",
    "editorial-luxe": "Editorial Luxe",
    "apple-glass-pill": "Apple Glass Pill",
    "cinema-blur": "Cinema Blur",
    "podcast-karaoke": "Podcast Karaoke",
    "minimalist-underline": "Minimalist Underline",
  };
  const previewText = style.uppercase
    ? presetNames[presetId].toUpperCase()
    : presetNames[presetId];

  return (
    <span
      className="inline-flex max-w-full items-center justify-center gap-[0.3em] rounded px-1 py-0.5 text-[11px] leading-none"
      style={{
        backgroundColor: style.bgOpacity > 0
          ? hexWithOpacity(style.bgColor, style.bgOpacity / 100)
          : style.animationType === "glass-pill"
            ? style.pillColor ?? "rgba(20,20,22,0.72)"
            : selected
              ? "rgba(255,255,255,0.03)"
              : "transparent",
        border: style.pillBorder && style.animationType === "glass-pill"
          ? `1px solid ${style.pillBorder}`
          : selected
            ? "1px solid rgba(255,255,255,0.08)"
            : undefined,
        borderRadius: style.animationType === "glass-pill"
          ? `${style.pillBorderRadius ?? 8}px`
          : style.bgOpacity > 0 ? "4px" : selected ? "6px" : undefined,
        padding: style.animationType === "glass-pill" || style.bgOpacity > 0 || selected
          ? "3px 6px"
          : undefined,
        color: style.textColor,
        fontFamily: getFontFamily(style.fontFamily),
        fontSize: "11px",
        fontWeight: style.fontWeight ?? (style.bold ? 800 : 500),
        fontStyle: style.italic ? "italic" : "normal",
        textTransform: style.uppercase ? "uppercase" : "none",
        letterSpacing: `${style.letterSpacing}${style.letterSpacingUnit ?? "px"}`,
        textShadow: selected ? "0 2px 10px rgba(0,0,0,0.28)" : style.textShadow ?? "0 1px 2px rgba(0,0,0,0.75), 0 0 5px rgba(0,0,0,0.4)",
        boxShadow: selected && style.animationType === "glass-pill"
          ? "0 0 0 1px rgba(255,255,255,0.08), 0 8px 18px rgba(0,0,0,0.18)"
          : selected && style.animationType === "underline"
            ? `0 0 0 1px ${style.accentColor ?? "#818CF8"}`
            : undefined,
      }}
    >
      {previewText}
    </span>
  );
}

function hexWithOpacity(hex: string, opacity: number) {
  const value = hex.replace("#", "");
  const normalized = value.length === 3
    ? value.split("").map((character) => character + character).join("")
    : value;
  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${Math.max(0, Math.min(1, opacity))})`;
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
