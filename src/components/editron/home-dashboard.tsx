"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { ArrowUpRight, Captions, Clapperboard, Clock3, Scissors } from "lucide-react";
import { getRecentProjects } from "@/lib/recent-projects";
import type { ProjectSummary } from "@/lib/project-state";
import { LiquidMetalBorder } from "./liquid-metal-border";
import { useGuestSession } from "@/app/providers";

const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";

const FEATURES = [
  {
    title: "Auto-cut silence",
    description: "Detects and removes silent gaps from your video.",
    icon: Scissors,
  },
  {
    title: "Caption templates",
    description: "Turns speech into precisely timed captions with customizable templates.",
    icon: Captions,
  },
  {
    title: "Smart B-roll",
    description: "Finds key words in your speech and adds relevant B-roll clips.",
    icon: Clapperboard,
  },
];

function ProjectCard({
  project,
  onOpen,
}: {
  project: ProjectSummary;
  onOpen: () => void;
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Open ${project.name} in Studio`}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className="group cursor-pointer overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 transition-colors hover:border-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      <div className="relative aspect-video bg-zinc-900">
        {project.previewUrl && (
          <video
            src={project.previewUrl}
            className="pointer-events-none size-full object-cover"
            preload="metadata"
            muted
            playsInline
          />
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/70 px-2.5 py-1 text-[11px] font-medium text-zinc-200 backdrop-blur">
          <Clapperboard className="size-3" />
          Saved project
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium text-white">{project.name}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
            <Clock3 className="size-3" />
            {new Intl.DateTimeFormat(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(project.updatedAt)}
          </p>
        </div>
        <ArrowUpRight className="size-4 shrink-0 text-zinc-500 transition-colors group-hover:text-white" />
      </div>
    </article>
  );
}

export function HomeDashboard({
  onNewProject,
  onOpenProject,
  view = "home",
}: {
  onNewProject: () => void;
  onOpenProject: (projectId: string) => void;
  view?: "home" | "projects";
}) {
  const { data: session, status } = useSession();
  const guestSession = useGuestSession();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const workspaceId = AUTH_ENABLED ? session?.user?.id ?? null : "guest";
  const canLoadProjects = AUTH_ENABLED
    ? status === "authenticated" && Boolean(workspaceId)
    : guestSession.ready;
  const isLoading = canLoadProjects && loadedUserId !== workspaceId;

  useEffect(() => {
    if (!canLoadProjects || !workspaceId) return;

    let isMounted = true;
    getRecentProjects()
      .then((recentProjects) => {
        if (isMounted) {
          setProjects(recentProjects);
          setLoadError(null);
          setLoadedUserId(workspaceId);
        }
      })
      .catch((error: unknown) => {
        console.error("[HomeDashboard] Failed to load recent projects:", error);
        if (isMounted) {
          setLoadError("Recent projects could not be loaded from the server.");
          setLoadedUserId(workspaceId);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [canLoadProjects, workspaceId]);

  return (
    <div className="min-h-screen bg-black px-5 py-12 text-white sm:px-8 sm:py-16 lg:px-12">
      <div className="mx-auto max-w-6xl">
        {view === "home" ? (
          <>
            <div className="mb-8 max-w-4xl sm:mb-10">
              <p className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
                Your creative workspace
              </p>
              <h1 className="max-w-3xl font-serif text-4xl leading-[1.05] tracking-tight text-zinc-100 sm:text-6xl lg:text-7xl">
                Make something
                <br />
                remarkable.
              </h1>
              <p className="mt-7 text-xl font-medium tracking-tight text-zinc-300 sm:text-2xl">
                Edit videos in minutes, not hours.
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-500 sm:text-base">
                AI auto-cuts silence, creates animated captions, and adds relevant B-roll—all in one studio.
              </p>
            </div>

            <section aria-label="Editron features" className="mb-12 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {FEATURES.map(({ title, description, icon: Icon }) => (
                <article
                  key={title}
                  className="relative overflow-hidden rounded-xl border-2 border-transparent bg-zinc-950"
                >
                  <LiquidMetalBorder />
                  <div className="relative z-10 p-5">
                    <span className="mb-5 grid size-9 place-items-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p>
                  </div>
                </article>
              ))}
            </section>
          </>
        ) : (
          <div className="mb-12 border-b border-zinc-800 pb-6">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
              Library
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
              Projects
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              {AUTH_ENABLED
                ? "Your saved projects, synced to your account."
                : "Your saved projects in this browser workspace."}
            </p>
          </div>
        )}

        <section aria-labelledby="recent-projects-title">
          <div className="mb-5 flex items-end justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <h2 id="recent-projects-title" className="text-xl font-semibold tracking-tight">
                {view === "home" ? "Recent projects" : "Your videos"}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                {AUTH_ENABLED
                  ? view === "home" ? "Your saved projects, synced to your account." : "Your account's saved projects."
                  : "Projects saved in this browser workspace."}
              </p>
            </div>
            {canLoadProjects && projects.length > 0 && (
              <span className="shrink-0 text-xs text-zinc-600">
                {projects.length}
              </span>
            )}
          </div>

          {(AUTH_ENABLED && status === "loading") || isLoading || (!AUTH_ENABLED && !guestSession.ready && !guestSession.error) ? (
            <div role="status" className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-400">
              {guestSession.error || "Loading your projects…"}
            </div>
          ) : AUTH_ENABLED && !session ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
              <p className="text-sm text-zinc-300">Sign in to save and access projects from your account.</p>
              <button
                type="button"
                onClick={() => void signIn("google")}
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-white hover:text-zinc-300"
              >
                Sign in with Google
                <ArrowUpRight className="size-3.5" />
              </button>
            </div>
          ) : loadError ? (
            <div role="status" className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-5 text-sm text-amber-200">
              {loadError}
            </div>
          ) : projects.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onOpen={() => onOpenProject(project.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 px-6 py-10 text-center">
              <h3 className="text-sm font-medium text-zinc-200">
                {view === "home" ? "No recent projects yet" : "No projects yet"}
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                Your projects will appear here after your video has been processed.
              </p>
              <button
                type="button"
                onClick={onNewProject}
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-zinc-300 transition-colors hover:text-white"
              >
                Start your first project
                <ArrowUpRight className="size-3.5" />
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
