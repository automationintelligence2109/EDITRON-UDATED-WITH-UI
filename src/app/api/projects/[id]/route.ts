import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projectSnapshotSchema, updateProjectSchema } from "@/lib/project-state";
import { createR2ReadUrl, getUserR2Prefix } from "@/lib/r2";
import { getAuthenticatedUserId } from "@/lib/server-auth";
import { projectStorageConfigurationError } from "@/lib/project-storage";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Sign in to open this project." }, { status: 401 });
    }
    const configurationError = projectStorageConfigurationError();
    if (configurationError) return configurationError;

    const { id } = await params;
    const project = await db.project.findFirst({ where: { id, userId } });
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    let rawState: unknown;
    try {
      rawState = JSON.parse(project.state);
    } catch {
      return NextResponse.json({ error: "This project's saved data is invalid." }, { status: 500 });
    }

    const snapshot = projectSnapshotSchema.safeParse(rawState);
    if (!snapshot.success) {
      return NextResponse.json({ error: "This project's saved data is incompatible." }, { status: 500 });
    }

    const brollPrefix = `${getUserR2Prefix(userId)}broll/`;
    const brolls = await Promise.all(snapshot.data.brolls.map(async (clip) => {
      if (!clip.sourceKey) return clip;
      if (!clip.sourceKey.startsWith(brollPrefix) || clip.sourceKey.includes("..")) {
        throw new Error("Saved B-roll media does not belong to this account.");
      }
      if (clip.thumbnailKey &&
        (!clip.thumbnailKey.startsWith(brollPrefix) || clip.thumbnailKey.includes(".."))) {
        throw new Error("Saved B-roll thumbnail does not belong to this account.");
      }
      return {
        ...clip,
        previewUrl: await createR2ReadUrl(clip.sourceKey),
        thumbnail: clip.thumbnailKey
          ? await createR2ReadUrl(clip.thumbnailKey)
          : await createR2ReadUrl(clip.sourceKey),
      };
    }));

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        createdAt: project.createdAt.getTime(),
        updatedAt: project.updatedAt.getTime(),
        sourceKey: project.sourceKey,
        snapshot: { ...snapshot.data, brolls },
      },
      videoUrl: await createR2ReadUrl(project.sourceKey),
    });
  } catch (error) {
    console.error("[Projects] Could not open project:", error);
    return NextResponse.json({ error: "Could not open this project." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Sign in to save your project." }, { status: 401 });
    }
    const configurationError = projectStorageConfigurationError();
    if (configurationError) return configurationError;

    const { id } = await params;
    const payload = updateProjectSchema.safeParse(await request.json());
    if (!payload.success) {
      return NextResponse.json({ error: "Project data is invalid." }, { status: 400 });
    }

    const brollPrefix = `${getUserR2Prefix(userId)}broll/`;
    const brollKeys = payload.data.snapshot.brolls.flatMap((clip) =>
      [clip.sourceKey, clip.thumbnailKey].filter((key): key is string => Boolean(key)),
    );
    if (brollKeys.some((key) => !key.startsWith(brollPrefix) || key.includes(".."))) {
      return NextResponse.json({ error: "A B-roll file does not belong to this account." }, { status: 403 });
    }

    const project = await db.project.updateMany({
      where: { id, userId },
      data: {
        name: payload.data.name,
        state: JSON.stringify(payload.data.snapshot),
      },
    });
    if (project.count === 0) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Projects] Could not update project:", error);
    return NextResponse.json({ error: "Could not save this project." }, { status: 500 });
  }
}
