import { getUserR2Prefix } from "./r2";

type MediaObject = {
  body: ReadableStream<Uint8Array>;
  contentType?: string;
  contentLength?: number;
  contentRange?: string;
};

export async function streamUserMedia(
  request: Request,
  userId: string | null,
  getObject: (key: string, range?: string) => Promise<MediaObject>,
): Promise<Response> {
  if (!userId) return Response.json({ error: "Sign in to access media." }, { status: 401 });

  const key = new URL(request.url).searchParams.get("key");
  const prefix = getUserR2Prefix(userId);
  if (!key || key.length > 1000 || key.includes("..") ||
    ![`${prefix}source/`, `${prefix}broll/`].some((allowed) => key.startsWith(allowed))) {
    return Response.json({ error: "Media not found." }, { status: 404 });
  }

  const range = request.headers.get("range") ?? undefined;
  if (range && !/^bytes=(?:\d+-\d*|-\d+)$/.test(range)) {
    return Response.json({ error: "Invalid byte range." }, { status: 416 });
  }

  try {
    const object = await getObject(key, range);
    const headers = new Headers({
      "Content-Type": object.contentType || "application/octet-stream",
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    if (object.contentLength !== undefined) headers.set("Content-Length", String(object.contentLength));
    if (object.contentRange) headers.set("Content-Range", object.contentRange);
    return new Response(object.body, { status: object.contentRange ? 206 : 200, headers });
  } catch (error) {
    console.error("[Media] Could not stream media:", error);
    const status = typeof error === "object" && error !== null && "$metadata" in error &&
      typeof error.$metadata === "object" && error.$metadata !== null &&
      "httpStatusCode" in error.$metadata && typeof error.$metadata.httpStatusCode === "number"
      ? error.$metadata.httpStatusCode : 500;
    if (status === 404) return Response.json({ error: "Media not found." }, { status: 404 });
    if (status === 416) return Response.json({ error: "Invalid byte range." }, { status: 416 });
    return Response.json({ error: "Could not load media." }, { status: 500 });
  }
}
