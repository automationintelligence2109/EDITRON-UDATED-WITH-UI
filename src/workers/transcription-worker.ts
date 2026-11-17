import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { UnrecoverableError, Worker } from "bullmq";
import "dotenv/config";
import { db, TranscriptionJobStatus } from "@/lib/db";
import { getR2Client } from "@/lib/r2";
import { createQueueRedisConnection } from "@/lib/redis";
import {
  processTranscriptionJob,
  TranscriptionInputError,
  TranscriptionServiceError,
} from "@/lib/transcription/processor";
import { TRANSCRIPTION_QUEUE_NAME } from "@/lib/transcription/queue";
import type { TranscriptionJobData } from "@/lib/transcription/types";

const concurrencySetting = Number.parseInt(process.env.TRANSCRIPTION_WORKER_CONCURRENCY || "1", 10);
const concurrency = Number.isInteger(concurrencySetting) && concurrencySetting > 0
  ? Math.min(concurrencySetting, 8)
  : 1;

async function startWorker() {
  await db.$connect();
  const redisConnection = createQueueRedisConnection();
  const worker = new Worker<TranscriptionJobData>(
    TRANSCRIPTION_QUEUE_NAME,
    async (job) => {
      const record = await db.transcriptionJob.findUnique({ where: { id: job.data.jobId } });
      if (!record || record.userId !== job.data.userId || record.inputKey !== job.data.sourceKey) {
        throw new UnrecoverableError("The transcription job record is missing or invalid.");
      }

      await db.transcriptionJob.update({
        where: { id: job.data.jobId },
        data: {
          status: TranscriptionJobStatus.PROCESSING,
          stage: "starting",
          progress: 1,
          attempts: job.attemptsMade + 1,
          error: null,
        },
      });

      try {
        const result = await processTranscriptionJob(job.data, async ({ stage, progress }) => {
          await db.transcriptionJob.update({
            where: { id: job.data.jobId },
            data: {
              status: TranscriptionJobStatus.PROCESSING,
              stage,
              progress,
            },
          });
        });

        await db.transcriptionJob.update({
          where: { id: job.data.jobId },
          data: {
            status: TranscriptionJobStatus.SUCCEEDED,
            stage: "complete",
            progress: 100,
            result: JSON.stringify(result),
            error: null,
          },
        });

        const r2 = getR2Client();
        await r2.client.send(new DeleteObjectCommand({
          Bucket: r2.bucket,
          Key: job.data.sourceKey,
        })).catch((error) => {
          console.error("[Transcribe worker] Could not delete uploaded source:", error);
        });

        return result;
      } catch (error) {
        const attempts = job.attemptsMade + 1;
        const terminal = error instanceof TranscriptionInputError ||
          attempts >= (job.opts.attempts ?? 1);
        const safeMessage = error instanceof TranscriptionInputError || error instanceof TranscriptionServiceError
          ? error.message
          : "Video processing failed. Please try again later.";

        await db.transcriptionJob.update({
          where: { id: job.data.jobId },
          data: {
            status: terminal ? TranscriptionJobStatus.FAILED : TranscriptionJobStatus.QUEUED,
            stage: terminal ? "failed" : "queued",
            progress: 0,
            error: terminal ? safeMessage : null,
          },
        }).catch((updateError) => {
          console.error("[Transcribe worker] Could not update failed job:", updateError);
        });

        if (terminal) {
          const r2 = getR2Client();
          await r2.client.send(new DeleteObjectCommand({
            Bucket: r2.bucket,
            Key: job.data.sourceKey,
          })).catch((cleanupError) => {
            console.error("[Transcribe worker] Could not delete failed source:", cleanupError);
          });
        }

        if (error instanceof TranscriptionInputError) {
          throw new UnrecoverableError(error.message);
        }
        throw error;
      }
    },
    { connection: redisConnection, concurrency },
  );

  worker.on("ready", () => {
    console.log(`[Transcribe worker] Ready with concurrency ${concurrency}.`);
  });
  worker.on("failed", (job, error) => {
    console.error(`[Transcribe worker] Job ${job?.id || "unknown"} failed:`, error);
  });
  worker.on("error", (error) => {
    console.error("[Transcribe worker] Worker error:", error);
  });

  const shutdown = async () => {
    console.log("[Transcribe worker] Shutting down.");
    await worker.close();
    await redisConnection.quit();
    await db.$disconnect();
  };
  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());
}

startWorker().catch(async (error: unknown) => {
  console.error("[Transcribe worker] Could not start:", error);
  await db.$disconnect();
  process.exitCode = 1;
});
