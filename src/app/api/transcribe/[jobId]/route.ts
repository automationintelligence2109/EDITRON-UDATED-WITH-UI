import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, TranscriptionJobStatus } from "@/lib/db";
import { createR2ReadUrl, getUserR2Prefix } from "@/lib/r2";
import { getAuthenticatedUserId } from "@/lib/server-auth";
import {
  getLocalTranscriptionJob,
  shouldUseLocalTranscriptionJobs,
} from "@/lib/transcription/local-jobs";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ jobId: string }> };

const transcriptionResultSchema = z.object({
  captions: z.array(z.object({
    id: z.string().min(1).max(200),
    start: z.number().finite().min(0),
    end: z.number().finite().min(0),
    text: z.string().max(20_000),
    words: z.array(z.object({
      word: z.string(),
      start: z.number().finite().min(0),
      end: z.number().finite().min(0),
    })).optional(),
  })).max(50_000),
  captionCount: z.number().int().min(0).max(50_000),
  mode: z.enum(["transcribe", "translate"]),
  sourceKey: z.string().min(1).max(1_000),
  elapsedMs: z.number().int().nonnegative(),
});

type TranscriptionResult = z.infer<typeof transcriptionResultSchema>;

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to check processing status." }, { status: 401 });
  }

  const { jobId } = await params;
  if (shouldUseLocalTranscriptionJobs()) {
    const localJob = getLocalTranscriptionJob(jobId, userId);
    if (!localJob) {
      return NextResponse.json({ error: "Processing job not found." }, { status: 404 });
    }

    let localResult: (TranscriptionResult & { tightenedVideoUrl: string }) | null = null;
    if (localJob.status === "SUCCEEDED" && localJob.result) {
      const parsedResult = transcriptionResultSchema.safeParse(localJob.result);
      if (!parsedResult.success) {
        return NextResponse.json({ error: "Processing result is invalid." }, { status: 500 });
      }
      const expectedPrefix = `${getUserR2Prefix(userId)}source/`;
      if (!parsedResult.data.sourceKey.startsWith(expectedPrefix) ||
        parsedResult.data.sourceKey.includes("..")) {
        return NextResponse.json({ error: "Processing result is invalid." }, { status: 500 });
      }
      localResult = {
        ...parsedResult.data,
        tightenedVideoUrl: await createR2ReadUrl(parsedResult.data.sourceKey),
      };
    }

    return NextResponse.json({
      status: localJob.status,
      stage: localJob.stage,
      progress: localJob.progress,
      error: localJob.error,
      result: localResult,
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  const job = await db.transcriptionJob.findFirst({
    where: { id: jobId, userId },
    select: {
      status: true,
      stage: true,
      progress: true,
      error: true,
      result: true,
    },
  });
  if (!job) {
    return NextResponse.json({ error: "Processing job not found." }, { status: 404 });
  }

  let result: (TranscriptionResult & { tightenedVideoUrl: string }) | null = null;
  if (job.status === TranscriptionJobStatus.SUCCEEDED) {
    if (!job.result) {
      console.error(`[Transcribe] Completed job ${jobId} has no result.`);
      return NextResponse.json({ error: "Processing result is unavailable." }, { status: 500 });
    }

    try {
      const parsedResult = transcriptionResultSchema.safeParse(JSON.parse(job.result));
      if (!parsedResult.success) {
        return NextResponse.json({ error: "Processing result is invalid." }, { status: 500 });
      }
      const savedResult = parsedResult.data;
      const expectedPrefix = `${getUserR2Prefix(userId)}source/`;
      if (!savedResult.sourceKey.startsWith(expectedPrefix) || savedResult.sourceKey.includes("..")) {
        throw new Error("The result media does not belong to this account.");
      }
      result = {
        ...savedResult,
        tightenedVideoUrl: await createR2ReadUrl(savedResult.sourceKey),
      };
    } catch (error) {
      console.error(`[Transcribe] Could not load result for job ${jobId}:`, error);
      return NextResponse.json({ error: "Processing result is invalid." }, { status: 500 });
    }
  }

  return NextResponse.json({
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    error: job.error,
    result,
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
