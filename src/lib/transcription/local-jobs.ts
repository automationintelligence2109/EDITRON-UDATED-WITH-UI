import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client } from "@/lib/r2";
import { processTranscriptionJob, TranscriptionInputError, TranscriptionServiceError } from "@/lib/transcription/processor";
import type {
  TranscriptionJobData,
  TranscriptionProgress,
  TranscriptionResult,
} from "@/lib/transcription/types";

type LocalJobStatus = "QUEUED" | "PROCESSING" | "SUCCEEDED" | "FAILED";

export type LocalTranscriptionJob = {
  userId: string;
  status: LocalJobStatus;
  stage: string;
  progress: number;
  error: string | null;
  result: TranscriptionResult | null;
  updatedAt: number;
};

type LocalJobState = { jobs: Map<string, LocalTranscriptionJob> };
const globalState = globalThis as typeof globalThis & {
  editronLocalTranscriptionJobs?: LocalJobState;
};
const state = globalState.editronLocalTranscriptionJobs ??= { jobs: new Map() };

export function shouldUseLocalTranscriptionJobs(): boolean {
  return process.env.NODE_ENV !== "production" &&
    process.env.AUTH_ENABLED !== "true" &&
    (!process.env.DATABASE_URL || !process.env.REDIS_URL);
}

function pruneJobs(now: number): void {
  for (const [jobId, job] of state.jobs) {
    if ((job.status === "SUCCEEDED" || job.status === "FAILED") && now - job.updatedAt > 60 * 60_000) {
      state.jobs.delete(jobId);
    }
  }
  while (state.jobs.size >= 1000) {
    const oldestJobId = state.jobs.keys().next().value;
    if (!oldestJobId) break;
    state.jobs.delete(oldestJobId);
  }
}

function updateLocalJob(jobId: string, update: Partial<LocalTranscriptionJob>): void {
  const job = state.jobs.get(jobId);
  if (!job) return;
  Object.assign(job, update, { updatedAt: Date.now() });
}

export function enqueueLocalTranscription(jobData: TranscriptionJobData): void {
  pruneJobs(Date.now());
  state.jobs.set(jobData.jobId, {
    userId: jobData.userId,
    status: "QUEUED",
    stage: "queued",
    progress: 0,
    error: null,
    result: null,
    updatedAt: Date.now(),
  });

  void processTranscriptionJob(jobData, async (progress: TranscriptionProgress) => {
    updateLocalJob(jobData.jobId, {
      status: "PROCESSING",
      stage: progress.stage,
      progress: progress.progress,
    });
  }).then((result) => {
    updateLocalJob(jobData.jobId, {
      status: "SUCCEEDED",
      stage: "complete",
      progress: 100,
      result,
      error: null,
    });
  }).catch(async (error: unknown) => {
    console.error(`[Local transcription] Job ${jobData.jobId} failed:`, error);
    updateLocalJob(jobData.jobId, {
      status: "FAILED",
      stage: "failed",
      progress: 0,
      error: error instanceof TranscriptionInputError || error instanceof TranscriptionServiceError
        ? error.message
        : "Video processing failed. Please try again later.",
    });

    try {
      const r2 = getR2Client();
      await r2.client.send(new DeleteObjectCommand({
        Bucket: r2.bucket,
        Key: jobData.sourceKey,
      }));
    } catch (cleanupError) {
      console.error(`[Local transcription] Could not delete failed input ${jobData.jobId}:`, cleanupError);
    }
  });
}

export function getLocalTranscriptionJob(
  jobId: string,
  userId: string,
): LocalTranscriptionJob | null {
  const job = state.jobs.get(jobId);
  return job?.userId === userId ? job : null;
}
