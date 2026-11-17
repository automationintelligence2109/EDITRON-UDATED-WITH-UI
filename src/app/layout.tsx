import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Editron.si",
  description: "Editron turns any video into caption-ready, word-timed subtitles in 82 languages — 14 Indian, 68 international. Auto Trim silences, style captions, export SRT/VTT.",
  keywords: ["Editron", "AI captions", "video subtitles", "ASR", "word-timed captions", "SRT generator", "Indian languages", "Hinglish captions"],
  authors: [{ name: "Editron" }],
  icons: {
    icon: { url: "/editron-icon.png?v=2", type: "image/png" },
  },
  openGraph: {
    title: "Editron.si",
    description: "82 languages. 14 Indian, 68 international. Auto Trim, word-timed captions, SRT/VTT export.",
    siteName: "Editron",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Editron.si",
    description: "82 languages. Auto Trim. Word-timed captions. SRT export.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Fonts — loaded via link tags to keep Turbopack happy */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Instrument+Serif:ital@0;1&family=Montserrat:wght@400;600;700;800;900&family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Poppins:wght@400;600;700;800;900&family=Anton&family=Bebas+Neue&family=Oswald:wght@400;600;700&family=Bangers&family=Kanit:wght@400;600;700;900&family=Archivo+Black&family=Russo+One&family=Space+Grotesk:wght@400;500;600;700&family=Syne:wght@400;500;600;700;800&family=Teko:wght@400;600;700&family=Luckiest+Guy&family=Playfair+Display:wght@400;700;900&family=Space+Mono:wght@400;700&family=Rubik:wght@400;500;600;700;900&family=Titan+One&family=Fredoka:wght@400;600;700&family=Comic+Neue:wght@400;700&family=Roboto:wght@400;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-background text-foreground">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
