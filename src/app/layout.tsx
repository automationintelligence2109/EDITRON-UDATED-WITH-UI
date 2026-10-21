import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "CapGen — The only captioning tool you always needed.",
  description: "CapGen turns any video into caption-ready, word-timed subtitles in 82 languages — 14 Indian, 68 international. Auto Trim silences, style captions, export SRT/VTT.",
  keywords: ["CapGen", "AI captions", "video subtitles", "ASR", "word-timed captions", "SRT generator", "Indian languages", "Hinglish captions"],
  authors: [{ name: "CapGen" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "CapGen — The only captioning tool you always needed.",
    description: "82 languages. 14 Indian, 68 international. Auto Trim, word-timed captions, SRT/VTT export.",
    siteName: "CapGen",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CapGen — AI Caption Generator",
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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Montserrat:wght@400;600;700;800;900&family=Poppins:wght@400;600;700;800;900&family=Anton&family=Bebas+Neue&family=Oswald:wght@400;600;700&family=Bangers&family=Kanit:wght@400;600;700;900&family=Archivo+Black&family=Russo+One&family=Teko:wght@400;600;700&family=Luckiest+Guy&family=Playfair+Display:wght@400;700;900&family=Space+Mono:wght@400;700&family=Rubik:wght@400;500;600;700;900&family=Titan+One&family=Fredoka:wght@400;600;700&family=Comic+Neue:wght@400;700&family=Roboto:wght@400;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
