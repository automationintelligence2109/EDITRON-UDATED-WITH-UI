import { z } from "zod";

const segmentSchema = z.object({
  id: z.string().min(1).max(200),
  start: z.number().finite().min(0),
  end: z.number().finite().min(0),
  text: z.string().max(20_000),
  hidden: z.boolean().optional(),
  words: z.array(z.object({
    word: z.string(),
    start: z.number().finite(),
    end: z.number().finite(),
  })).optional(),
});

const styleSchema = z.object({
  fontFamily: z.string().max(100),
  fontSize: z.number().finite().min(1).max(500),
  textColor: z.string().max(20),
  bgColor: z.string().max(20),
  bgOpacity: z.number().finite().min(0).max(100),
  position: z.enum(["top", "center", "bottom"]),
  bold: z.boolean(),
  italic: z.boolean(),
  uppercase: z.boolean(),
  letterSpacing: z.number().finite(),
  animationType: z.enum([
    "blur-reveal",
    "slide-up",
    "glass-pill",
    "karaoke-dim",
    "underline",
  ]).optional(),
  fontWeight: z.number().finite().min(100).max(900).optional(),
  letterSpacingUnit: z.enum(["px", "em"]).optional(),
  inactiveOpacity: z.number().finite().min(0).max(1).optional(),
  pillColor: z.string().max(100).optional(),
  pillBorder: z.string().max(100).optional(),
  pillBorderRadius: z.number().finite().min(0).max(100).optional(),
  pillPaddingX: z.number().finite().min(0).max(100).optional(),
  pillPaddingY: z.number().finite().min(0).max(100).optional(),
  accentColor: z.string().max(20).optional(),
  textShadow: z.string().max(200).optional(),
  shadowColor: z.string().max(100).optional(),
  shadowBlur: z.number().finite().min(0).max(100).optional(),
  shadowOffsetX: z.number().finite().min(-100).max(100).optional(),
  shadowOffsetY: z.number().finite().min(-100).max(100).optional(),
  activeWordFontFamily: z.string().max(100).optional(),
  activeWordFontStyle: z.enum(["normal", "italic"]).optional(),
  activeWordFontWeight: z.number().finite().min(100).max(900).optional(),
  hyperStyleId: z.enum([
    "clean",
    "pop-cinematic",
    "mr-beast-style",
    "minimal-doc",
    "hormozi-energy",
    "luxury-aesthetic",
    "cyber-neon",
    "podcast-clean",
    "viral-breaking",
    "editorial-luxe",
    "apple-glass-pill",
    "cinema-blur",
    "podcast-karaoke",
    "minimalist-underline",
  ]).nullable().optional(),
  posX: z.number().finite(),
  posY: z.number().finite(),
});

const brollSchema = z.object({
  id: z.string().min(1).max(200),
  windowId: z.string().max(200),
  segmentId: z.string().min(1).max(200).optional(),
  start: z.number().finite().min(0),
  end: z.number().finite().min(0),
  source: z.enum(["pexels", "pixabay", "user"]),
  previewUrl: z.string().max(4_000),
  thumbnail: z.string().max(4_000),
  sourceKey: z.string().min(1).max(1_000).optional(),
  thumbnailKey: z.string().min(1).max(1_000).optional(),
  mediaType: z.enum(["video", "image"]).optional(),
  query: z.string().max(2_000),
  durationHint: z.number().finite().optional(),
  trimStart: z.number().finite().optional(),
  trimEnd: z.number().finite().optional(),
  transitionIn: z.string().max(100).optional(),
  transitionOut: z.string().max(100).optional(),
  transitionOrder: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
});

export const projectSnapshotSchema = z.object({
  sourceName: z.string().min(1).max(255),
  isAudio: z.boolean(),
  segments: z.array(segmentSchema).max(50_000),
  style: styleSchema,
  brolls: z.array(brollSchema).max(2_000),
  aspectRatio: z.number().finite().positive().max(100),
  wordsPerCaption: z.number().int().min(1).max(12),
  autoEmojiEnabled: z.boolean(),
  brollTransitionsEnabled: z.boolean().optional(),
});

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(255),
  sourceKey: z.string().min(1).max(1_000),
  snapshot: projectSnapshotSchema,
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(255),
  snapshot: projectSnapshotSchema,
});

export const projectSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  createdAt: z.number().finite(),
  updatedAt: z.number().finite(),
  previewUrl: z.string().url(),
});

export const projectDetailsSchema = z.object({
  project: z.object({
    id: z.string().min(1),
    name: z.string(),
    createdAt: z.number().finite(),
    updatedAt: z.number().finite(),
    sourceKey: z.string().min(1).max(1_000),
    snapshot: projectSnapshotSchema,
  }),
  videoUrl: z.string().url(),
});

export const projectCreatedSchema = z.object({
  project: z.object({ id: z.string().min(1) }),
});

export type ProjectSnapshot = z.infer<typeof projectSnapshotSchema>;
export type ProjectSummary = z.infer<typeof projectSummarySchema>;
export type ProjectDetails = z.infer<typeof projectDetailsSchema>;
