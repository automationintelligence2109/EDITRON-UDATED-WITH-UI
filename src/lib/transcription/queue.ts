import { Queue } from "bullmq";
import { createQueueRedisConnection } from "@/lib/redis";
import type { TranscriptionJobData } from "@/lib/transcription/types";

export const TRANSCRIPTION_QUEUE_NAME = "editron-transcriptions";

let transcriptionQueue: Queue<TranscriptionJobData> | null = null;

export function getTranscriptionQueue(): Queue<TranscriptionJobData> {
  if (!transcriptionQueue) {
    transcriptionQueue = new Queue<TranscriptionJobData>(TRANSCRIPTION_QUEUE_NAME, {
      connection: createQueueRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 10_000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
  }
  return transcriptionQueue;
}
