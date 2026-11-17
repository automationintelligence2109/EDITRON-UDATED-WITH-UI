import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createProjectSchema } from "@/lib/project-state";
import { createR2ReadUrl, getUserR2Prefix } from "@/lib/r2";
import { ensureGuestUser, getAuthenticatedUserId } from "@/lib/server-auth";
import { projectStorageConfigurationError } from "@/lib/project-storage";

export const runtime = "nodejs";

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Sign in to view your projects." }, { status: 401 });
    }
    const configurationError = projectStorageConfigurationError();
    if (configurationError) return configurationError;

    const projects = await db.project.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        sourceKey: true,
      },
    });

    const recentProjects = await Promise.all(projects.map(async (project) => ({
      id: project.id,
      name: project.name,
      createdAt: project.createdAt.getTime(),
      updatedAt: project.updatedAt.getTime(),
      previewUrl: await createR2ReadUrl(project.sourceKey),
    })));

    return NextResponse.json({ projects: recentProjects });
  } catch (error) {
    console.error("[Projects] Could not list projects:", error);
    return NextResponse.json({ error: "Could not load projects." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Sign in to save your project." }, { status: 401 });
    }
    const configurationError = projectStorageConfigurationError();
    if (configurationError) return configurationError;

    const payload = createProjectSchema.safeParse(await request.json());
    if (!payload.success) {
      return NextResponse.json({ error: "Project data is invalid." }, { status: 400 });
    }

    const prefix = `${getUserR2Prefix(userId)}source/`;
    if (!payload.data.sourceKey.startsWith(prefix) || payload.data.sourceKey.includes("..")) {
      return NextResponse.json({ error: "The project media does not belong to this account." }, { status: 403 });
    }
    const brollPrefix = `${getUserR2Prefix(userId)}broll/`;
    const brollKeys = payload.data.snapshot.brolls.flatMap((clip) =>
      [clip.sourceKey, clip.thumbnailKey].filter((key): key is string => Boolean(key)),
    );
    if (brollKeys.some((key) => !key.startsWith(brollPrefix) || key.includes(".."))) {
      return NextResponse.json({ error: "A B-roll file does not belong to this account." }, { status: 403 });
    }

    if (userId.startsWith("guest_")) await ensureGuestUser(userId);
    const project = await db.project.create({
      data: {
        userId,
        name: payload.data.name,
        sourceKey: payload.data.sourceKey,
        state: JSON.stringify(payload.data.snapshot),
      },
      select: { id: true, name: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json({
      project: {
        ...project,
        createdAt: project.createdAt.getTime(),
        updatedAt: project.updatedAt.getTime(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("[Projects] Could not create project:", error);
    return NextResponse.json({ error: "Could not save this project." }, { status: 500 });
  }
}
