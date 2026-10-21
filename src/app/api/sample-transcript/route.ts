import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Pre-baked demo transcript — used by the "Try with sample" button.
// Mimics a 22-second product walkthrough clip with word-timed segments.
export async function GET() {
  const segments = [
    { start: 0.0, end: 1.3, text: "Hey everyone" },
    { start: 1.3, end: 2.8, text: "welcome back to the channel" },
    { start: 2.8, end: 4.4, text: "today we're talking about" },
    { start: 4.4, end: 6.0, text: "how to make your videos" },
    { start: 6.0, end: 7.6, text: "stand out with captions" },
    { start: 7.6, end: 9.2, text: "the secret is word-timed text" },
    { start: 9.2, end: 10.9, text: "every word knows its millisecond" },
    { start: 10.9, end: 12.5, text: "edit any word in two clicks" },
    { start: 12.5, end: 14.1, text: "pick from 82 languages" },
    { start: 14.1, end: 15.7, text: "14 Indian, 68 international" },
    { start: 15.7, end: 17.4, text: "auto trim silences and filler words" },
    { start: 17.4, end: 19.0, text: "export SRT or video" },
    { start: 19.0, end: 20.6, text: "your editor will love you" },
    { start: 20.6, end: 22.2, text: "try CapGen free today" },
  ];

  const language = "en-US";
  const text = segments.map((s) => s.text).join(" ");
  const durationSec = segments[segments.length - 1].end;

  return NextResponse.json({
    success: true,
    text,
    language,
    durationSec,
    segments,
    isSample: true,
  });
}
