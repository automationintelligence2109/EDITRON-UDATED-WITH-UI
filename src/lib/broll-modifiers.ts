// Visual Modifiers to make stock searches look "AI-generated" and professional.
// These are appended to the user's dynamic keywords.

export const VISUAL_MODIFIERS = {
  CINEMATIC: ["cinematic", "4k", "shallow depth of field", "slow motion", "highly detailed", "professional lighting"],
  AESTHETIC: ["minimalist", "bright", "clean", "modern", "aesthetic", "elegant"],
  NATURE: ["organic", "natural light", "outdoor", "fresh", "environmental"],
  ACTION: ["dynamic", "fast paced", "movement", "energetic", "close up"],
  CONCEPTUAL: ["abstract", "metaphor", "symbolic", "conceptual", "moody"],
};

/**
 * Generates a set of diverse search queries based on a single user keyword.
 * @param keyword The dynamic keyword extracted from the user's video.
 * @param count How many variations to generate.
 */
export function expandQuery(keyword: string, count: number = 4): string[] {
  const allModifiers = [
    ...VISUAL_MODIFIERS.CINEMATIC,
    ...VISUAL_MODIFIERS.AESTHETIC,
    ...VISUAL_MODIFIERS.NATURE,
    ...VISUAL_MODIFIERS.ACTION,
    ...VISUAL_MODIFIERS.CONCEPTUAL,
  ];

  const queries: string[] = [keyword]; // Always include the raw keyword first

  for (let i = 1; i < count; i++) {
    const randomMod = allModifiers[Math.floor(Math.random() * allModifiers.length)];
    queries.push(`${keyword} ${randomMod}`);
  }

  return queries;
}
