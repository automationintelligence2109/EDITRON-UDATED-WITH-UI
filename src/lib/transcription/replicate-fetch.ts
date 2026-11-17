type ReplicateFetch = (input: Request | string, init?: RequestInit) => Promise<Response>;

export function createReplicateFetch(
  fetchRequest: ReplicateFetch = fetch,
  sleep: (milliseconds: number) => Promise<void> = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
): ReplicateFetch {
  return async (input, init) => {
    const response = await fetchRequest(input, init);
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    const url = input instanceof Request ? input.url : String(input);
    const path = new URL(url).pathname;
    if (response.status !== 429 || method.toUpperCase() !== "POST" ||
      !/^\/v1\/(?:models\/[^/]+\/[^/]+\/)?predictions\/?$/.test(path)) {
      return response;
    }

    let seconds = Number(response.headers.get("retry-after"));
    if (!Number.isFinite(seconds) || seconds <= 0) {
      try {
        const body: unknown = await response.clone().json();
        if (body && typeof body === "object" && "retry_after" in body) {
          seconds = Number(body.retry_after);
        }
      } catch (error) {
        console.warn("[Transcription] Could not read the rate-limit retry delay:", error);
      }
    }
    const delay = Number.isFinite(seconds) && seconds > 0 ? seconds : 10;
    console.warn(`[Transcription] Provider rate limit reached; retrying after ${Math.min(delay, 60)} seconds.`);
    await sleep(Math.min(delay, 60) * 1000);
    return response;
  };
}

export function isReplicateRateLimitError(error: unknown): boolean {
  return error instanceof Error && "response" in error &&
    error.response instanceof Response && error.response.status === 429;
}
