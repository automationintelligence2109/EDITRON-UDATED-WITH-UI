export type TranscriptionJobData = {
  jobId: string;
  userId: string;
  sourceKey: string;
  sourceName: string;
  mode: "transcribe" | "translate";
  wordsPerCaption: number;
};

export type TranscriptionResult = {
  captions: Array<{
    id: string;
    start: number;
    end: number;
    text: string;
    words: Array<{ word: string; start: number; end: number }>;
  }>;
  captionCount: number;
  mode: TranscriptionJobData["mode"];
  sourceKey: string;
  elapsedMs: number;
};

export type TranscriptionProgress = {
  stage: string;
  progress: number;
};
