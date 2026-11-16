import {
  projectDetailsSchema,
  projectCreatedSchema,
  projectSummarySchema,
  type ProjectDetails,
  type ProjectSnapshot,
  type ProjectSummary,
} from "@/lib/project-state";

async function requestJson(url: string, init?: RequestInit): Promise<unknown> {
  const headers = new Headers(init?.headers);
  if (init?.body) headers.set("Content-Type", "application/json");
  const response = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload && typeof payload === "object" && "error" in payload &&
      typeof payload.error === "string"
      ? payload.error
      : `Project request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return payload;
}

export async function getRecentProjects(): Promise<ProjectSummary[]> {
  const payload = await requestJson("/api/projects");
  if (!payload || typeof payload !== "object" || !("projects" in payload)) {
    throw new Error("Project list response was invalid.");
  }

  const projects = projectSummarySchema.array().safeParse(payload.projects);
  if (!projects.success) {
    throw new Error("Project list response was invalid.");
  }
  return projects.data;
}

export async function getProject(id: string): Promise<ProjectDetails> {
  const payload = await requestJson(`/api/projects/${encodeURIComponent(id)}`);
  const project = projectDetailsSchema.safeParse(payload);
  if (!project.success) {
    throw new Error("Project response was invalid.");
  }
  return project.data;
}

export async function createProject(input: {
  name: string;
  sourceKey: string;
  snapshot: ProjectSnapshot;
}): Promise<{ id: string }> {
  const payload = await requestJson("/api/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });
  const project = projectCreatedSchema.safeParse(payload);
  if (!project.success) {
    throw new Error("Project creation response was invalid.");
  }
  return project.data.project;
}

export async function updateProject(
  id: string,
  input: { name: string; snapshot: ProjectSnapshot },
): Promise<void> {
  await requestJson(`/api/projects/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
