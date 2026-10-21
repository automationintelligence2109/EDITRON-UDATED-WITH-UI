// CapGen language catalog — 14 Indian (+ Romanized variants) + 68 international = 82 total

export type Language = {
  code: string;
  name: string;
  roman?: boolean; // true if Romanized transliteration
  native?: string;
};

export const INDIAN_LANGUAGES: Language[] = [
  { code: "en-IN", name: "English (India)", native: "English" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "hinglish", name: "Hinglish", native: "Hinglish", roman: true },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "telugish", name: "Telugish", native: "Telugish", roman: true },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "tanglish", name: "Tanglish", native: "Tanglish", roman: true },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "kannadish", name: "Kannadish", native: "Kannadish", roman: true },
  { code: "ml", name: "Malayalam", native: "മലയാളം" },
  { code: "manglish", name: "Manglish", native: "Manglish", roman: true },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "bengalish", name: "Bengalish", native: "Bengalish", roman: true },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "punjabish", name: "Punjabish", native: "Punjabish", roman: true },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
  { code: "gujaratish", name: "Gujaratish", native: "Gujaratish", roman: true },
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "marathish", name: "Marathish", native: "Marathish", roman: true },
  { code: "or", name: "Odia", native: "ଓଡ଼ିଆ" },
  { code: "odish", name: "Odish", native: "Odish", roman: true },
  { code: "ur", name: "Urdu", native: "اردو" },
];

export const INTERNATIONAL_LANGUAGES: Language[] = [
  { code: "en-US", name: "English (US)", native: "English" },
  { code: "en-GB", name: "English (UK)", native: "English" },
  { code: "en-AU", name: "English (Australia)", native: "English" },
  { code: "en-CA", name: "English (Canada)", native: "English" },
  { code: "fr", name: "French", native: "Français" },
  { code: "fr-CA", name: "French (Canada)", native: "Français" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "es-MX", name: "Spanish (Mexico)", native: "Español" },
  { code: "pt", name: "Portuguese", native: "Português" },
  { code: "pt-BR", name: "Portuguese (Brazil)", native: "Português" },
  { code: "it", name: "Italian", native: "Italiano" },
  { code: "ru", name: "Russian", native: "Русский" },
  { code: "ja", name: "Japanese", native: "日本語" },
  { code: "ko", name: "Korean", native: "한국어" },
  { code: "zh", name: "Chinese (Simplified)", native: "简体中文" },
  { code: "zh-TW", name: "Chinese (Traditional)", native: "繁體中文" },
  { code: "ar", name: "Arabic", native: "العربية" },
  { code: "tr", name: "Turkish", native: "Türkçe" },
  { code: "nl", name: "Dutch", native: "Nederlands" },
  { code: "pl", name: "Polish", native: "Polski" },
  { code: "sv", name: "Swedish", native: "Svenska" },
  { code: "id", name: "Indonesian", native: "Bahasa" },
  { code: "th", name: "Thai", native: "ไทย" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt" },
  { code: "uk", name: "Ukrainian", native: "Українська" },
  { code: "cs", name: "Czech", native: "Čeština" },
  { code: "el", name: "Greek", native: "Ελληνικά" },
  { code: "he", name: "Hebrew", native: "עברית" },
  { code: "fi", name: "Finnish", native: "Suomi" },
  { code: "da", name: "Danish", native: "Dansk" },
  { code: "no", name: "Norwegian", native: "Norsk" },
  { code: "ro", name: "Romanian", native: "Română" },
  { code: "hu", name: "Hungarian", native: "Magyar" },
  { code: "sk", name: "Slovak", native: "Slovenčina" },
  { code: "bg", name: "Bulgarian", native: "Български" },
  { code: "hr", name: "Croatian", native: "Hrvatski" },
  { code: "sr", name: "Serbian", native: "Српски" },
  { code: "sl", name: "Slovenian", native: "Slovenščina" },
  { code: "lt", name: "Lithuanian", native: "Lietuvių" },
  { code: "lv", name: "Latvian", native: "Latviešu" },
  { code: "et", name: "Estonian", native: "Eesti" },
  { code: "ms", name: "Malay", native: "Melayu" },
  { code: "tl", name: "Filipino", native: "Filipino" },
  { code: "my", name: "Burmese", native: "မြန်မာ" },
  { code: "km", name: "Khmer", native: "ខ្មែរ" },
  { code: "lo", name: "Lao", native: "ລາວ" },
  { code: "si", name: "Sinhala", native: "සිංහල" },
  { code: "ne", name: "Nepali", native: "नेपाली" },
  { code: "fa", name: "Persian", native: "فارسی" },
  { code: "ps", name: "Pashto", native: "پښتو" },
  { code: "ku", name: "Kurdish", native: "Kurdî" },
  { code: "az", name: "Azerbaijani", native: "Azərbaycan" },
  { code: "kk", name: "Kazakh", native: "Қазақ" },
  { code: "uz", name: "Uzbek", native: "Oʻzbek" },
  { code: "tg", name: "Tajik", native: "Тоҷикӣ" },
  { code: "ky", name: "Kyrgyz", native: "Кыргызча" },
  { code: "tk", name: "Turkmen", native: "Türkmen" },
  { code: "mn", name: "Mongolian", native: "Монгол" },
  { code: "am", name: "Amharic", native: "አማርኛ" },
  { code: "sw", name: "Swahili", native: "Kiswahili" },
  { code: "yo", name: "Yoruba", native: "Yorùbá" },
  { code: "zu", name: "Zulu", native: "isiZulu" },
  { code: "af", name: "Afrikaans", native: "Afrikaans" },
  { code: "is", name: "Icelandic", native: "Íslenska" },
  { code: "ga", name: "Irish", native: "Gaeilge" },
  { code: "cy", name: "Welsh", native: "Cymraeg" },
];

export const ALL_LANGUAGES: Language[] = [...INDIAN_LANGUAGES, ...INTERNATIONAL_LANGUAGES];

export function getLanguageByCode(code: string): Language | undefined {
  return ALL_LANGUAGES.find((l) => l.code === code);
}

// CapGen font catalog — synced with next/font/google loaded in layout.tsx
export type CapGenFont = {
  value: string;
  label: string;
  cssFamily: string;
  category: "Viral" | "Modern" | "Playful" | "Elegant" | "Tech";
};

export const CAPGEN_FONTS: CapGenFont[] = [
  // Viral & High-Impact
  { value: "archivo-black", label: "Archivo Black", cssFamily: "var(--font-archivo-black), sans-serif", category: "Viral" },
  { value: "anton", label: "Anton", cssFamily: "var(--font-anton), sans-serif", category: "Viral" },
  { value: "bebas-neue", label: "Bebas Neue", cssFamily: "var(--font-bebas-neue), sans-serif", category: "Viral" },
  { value: "russo-one", label: "Russo One", cssFamily: "var(--font-russo-one), sans-serif", category: "Viral" },
  { value: "titan-one", label: "Titan One", cssFamily: "'Titan One', sans-serif", category: "Viral" },

  // Modern & Clean
  { value: "inter", label: "Inter", cssFamily: "var(--font-inter), sans-serif", category: "Modern" },
  { value: "montserrat", label: "Montserrat", cssFamily: "var(--font-montserrat), sans-serif", category: "Modern" },
  { value: "poppins", label: "Poppins", cssFamily: "var(--font-poppins), sans-serif", category: "Modern" },
  { value: "rubik", label: "Rubik", cssFamily: "var(--font-rubik), sans-serif", category: "Modern" },
  { value: "roboto", label: "Roboto", cssFamily: "'Roboto', sans-serif", category: "Modern" },

  // Playful & Energetic
  { value: "bangers", label: "Bangers", cssFamily: "var(--font-bangers), sans-serif", category: "Playful" },
  { value: "luckiest-guy", label: "Luckiest Guy", cssFamily: "var(--font-luckiest-guy), sans-serif", category: "Playful" },
  { value: "kanit", label: "Kanit", cssFamily: "var(--font-kanit), sans-serif", category: "Playful" },
  { value: "fredoka", label: "Fredoka", cssFamily: "'Fredoka', sans-serif", category: "Playful" },
  { value: "comic-neue", label: "Comic Neue", cssFamily: "'Comic Neue', cursive", category: "Playful" },

  // Elegant & Sophisticated
  { value: "playfair-display", label: "Playfair Display", cssFamily: "var(--font-playfair-display), serif", category: "Elegant" },

  // Tech & Mono
  { value: "space-mono", label: "Space Mono", cssFamily: "var(--font-space-mono), monospace", category: "Tech" },
  { value: "oswald", label: "Oswald", cssFamily: "var(--font-oswald), sans-serif", category: "Tech" },
  { value: "teko", label: "Teko", cssFamily: "var(--font-teko), sans-serif", category: "Tech" },
];

export function getFontFamily(value: string): string {
  const font = CAPGEN_FONTS.find((f) => f.value === value);
  return font ? font.cssFamily : "var(--font-inter), sans-serif";
}
