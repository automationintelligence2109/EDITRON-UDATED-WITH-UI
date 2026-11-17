import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client } from "@/lib/r2";
import { getAuthenticatedUserId } from "@/lib/server-auth";
import { streamUserMedia } from "@/lib/media-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId();
  return streamUserMedia(request, userId, async (key, range) => {
    const { client, bucket } = getR2Client();
    const object = await client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      Range: range,
    }));
    if (!object.Body) throw new Error("Media object has no body.");
    return {
      body: object.Body.transformToWebStream(),
      contentType: object.ContentType,
      contentLength: object.ContentLength,
      contentRange: object.ContentRange,
    };
  });
}
