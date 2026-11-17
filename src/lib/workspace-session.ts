export type StudioPage = "home" | "editor" | "projects";

export function parseWorkspaceSession(value: string): { page: StudioPage; projectId: string | null } | null {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || !("page" in parsed) ||
    (parsed.page !== "home" && parsed.page !== "editor" && parsed.page !== "projects")) {
    return null;
  }
  const projectId = parsed.page === "editor" && "projectId" in parsed &&
    typeof parsed.projectId === "string" && parsed.projectId ? parsed.projectId : null;
  return { page: parsed.page, projectId };
}

export function hasUnsavedWorkspaceWork(
  stage: string,
  hasFile: boolean,
  hasSavedProject: boolean,
  saveState: string,
): boolean {
  return stage === "uploading" || stage === "queued" ||
    stage === "transcribing" || stage === "timing" ||
    (hasFile && !hasSavedProject) || saveState === "saving" || saveState === "error";
}
