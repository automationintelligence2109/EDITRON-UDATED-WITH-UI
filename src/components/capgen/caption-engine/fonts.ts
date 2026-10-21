export const CAPGEN_FONTS = [
  { value: "inter", label: "Inter", cssFamily: "Inter", category: "Modern" },
  { value: "montserrat", label: "Montserrat", cssFamily: "Montserrat", category: "Modern" },
  { value: "poppins", label: "Poppins", cssFamily: "Poppins", category: "Modern" },
  { value: "anton", label: "Anton", cssFamily: "Anton", category: "Viral" },
  { value: "bebas-neue", label: "Bebas Neue", cssFamily: "Bebas Neue", category: "Viral" },
  { value: "oswald", label: "Oswald", cssFamily: "Oswald", category: "Viral" },
  { value: "bangers", label: "Bangers", cssFamily: "Bangers", category: "Playful" },
  { value: "kanit", label: "Kanit", cssFamily: "Kanit", category: "Playful" },
  { value: "archivo-black", label: "Archivo Black", cssFamily: "Archivo Black", category: "Viral" },
  { value: "russo-one", label: "Russo One", cssFamily: "Russo One", category: "Tech" },
  { value: "teko", label: "Teko", cssFamily: "Teko", category: "Tech" },
  { value: "luckiest-guy", label: "Luckiest Guy", cssFamily: "Luckiest Guy", category: "Playful" },
  { value: "playfair-display", label: "Playfair Display", cssFamily: "Playfair Display", category: "Elegant" },
  { value: "space-mono", label: "Space Mono", cssFamily: "Space Mono", category: "Tech" },
  { value: "rubik", label: "Rubik", cssFamily: "Rubik", category: "Modern" },
];

export function getFontFamily(fontValue: string): string {
  const font = CAPGEN_FONTS.find((f) => f.value === fontValue);
  return font ? `var(--font-${font.value})` : "sans-serif";
}
