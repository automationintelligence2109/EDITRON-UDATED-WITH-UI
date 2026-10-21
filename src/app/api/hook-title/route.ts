import { NextRequest, NextResponse } from "next/server";
import { generateHeuristicHookTitle } from "@/lib/hook-title";

export const runtime = "nodejs";
export const maxDuration = 30;

type IncomingSegment = { start: number; end: number; text: string };

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

const SYSTEM_PROMPT =
  "You write short, punchy hook-title overlays for short-form video (like a Reel/Short's on-screen headline). " +
  "Rules: 5-9 words max. One relevant emoji at the end. No hashtags, no quotes around the text, no explanation — output ONLY the title line itself.";

function userPrompt(hookText: string) {
  return `Video opening line(s): "${hookText}"\n\nWrite one hook title overlay for this video.`;
}

function cleanTitle(raw: string): string {
  return raw.trim().replace(/^["']|["']$/g, "");
}

/** Groq — free tier, no credit card, OpenAI-compatible chat API. */
async function tryGroq(hookText: string): Promise<string | null> {
  if (!GROQ_API_KEY) return null;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 40,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt(hookText) },
        ],
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    return text ? cleanTitle(text) : null;
  } catch {
    return null;
  }
}

/** Google Gemini — free tier via AI Studio, no credit card. */
async function tryGemini(hookText: string): Promise<string | null> {
  if (!GEMINI_API_KEY) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: userPrompt(hookText) }] }],
          generationConfig: { maxOutputTokens: 40 },
        }),
        signal: AbortSignal.timeout(12000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ? cleanTitle(text) : null;
  } catch {
    return null;
  }
}

/** Anthropic — used if you already have a key; not required. */
async function tryAnthropic(hookText: string): Promise<string | null> {
  if (!ANTHROPIC_API_KEY) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 60,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt(hookText) }],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = (data.content || [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("");
    return text ? cleanTitle(text) : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  let body: { segments?: IncomingSegment[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const segments = Array.isArray(body.segments) ? body.segments : [];
  if (!segments.length) {
    return NextResponse.json({ success: false, error: "No segments provided." }, { status: 400 });
  }

  const hookText =
    segments
      .filter((s) => s.start < 8)
      .map((s) => s.text)
      .join(" ")
      .trim() || segments[0].text;

  // Try providers in order — first one with a configured key that succeeds
  // wins. None configured (or all fail) → local heuristic, which always
  // works with zero setup.
  for (const provider of [tryGroq, tryGemini, tryAnthropic]) {
    const title = await provider(hookText);
    if (title) {
      return NextResponse.json({ success: true, title, source: "ai" });
    }
  }

  const fallbackTitle = generateHeuristicHookTitle(
    segments.map((s, i) => ({ id: `s${i}`, start: s.start, end: s.end, text: s.text }))
  );
  return NextResponse.json({ success: true, title: fallbackTitle, source: "heuristic" });
}