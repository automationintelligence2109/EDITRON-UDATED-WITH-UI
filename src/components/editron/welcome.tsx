"use client";

import React, { useEffect, useState } from "react";
import {
  CircleUserRound,
  Folder,
  House,
  Menu,
  LogIn,
  LogOut,
  Plus,
  Settings,
  X,
} from "lucide-react";

import { HomeDashboard } from "./home-dashboard";
import { LiquidMetalButton } from "./liquid-metal-button";
import { LiquidMetalText } from "./liquid-metal-text";
import { ReactionFront } from "./reaction-front";
import { CaptionStudio } from "./caption-studio";
import { motion, AnimatePresence } from "framer-motion";
import { signIn, signOut, useSession } from "next-auth/react";
import { useGuestSession } from "@/app/providers";
import { parseWorkspaceSession, type StudioPage } from "@/lib/workspace-session";
import { toast } from "@/hooks/use-toast";
const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";
const WORKSPACE_KEY = "editron-workspace";

function StudioSidebar({
  onHome,
  onNewProject,
  onProjects,
  onSignIn,
  onSignOut,
  userName,
  userEmail,
  isAuthenticated,
  authEnabled,
  activePage,
}: {
  onHome: () => void;
  onNewProject: () => void;
  onProjects: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  userName: string | null;
  userEmail: string | null;
  isAuthenticated: boolean;
  authEnabled: boolean;
  activePage: "home" | "editor" | "projects";
}) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const navItemClass = (active = false) =>
    `flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors md:min-h-0 ${
      active
        ? "bg-zinc-900 text-white"
        : "text-zinc-400 hover:bg-zinc-900/70 hover:text-white"
    }`;

  return (
    <aside className="relative z-30 w-full shrink-0 border-b border-zinc-800 bg-black md:fixed md:inset-y-0 md:left-0 md:flex md:w-[220px] md:flex-col md:overflow-y-auto md:border-b-0 md:border-r md:border-zinc-800 md:px-3 md:py-5">
      <div className="flex h-[68px] items-center justify-between px-4 md:h-auto md:px-1 md:pb-7 md:pt-1">
        <button
          type="button"
          onClick={onHome}
          className="flex items-center gap-1.5"
          aria-label="Editron home"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 306 204"
            className="h-5 w-[30px] shrink-0"
          >
            <defs>
              <linearGradient id="editron-logo-metal" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="48%" stopColor="#a1a1aa" />
                <stop offset="72%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#71717a" />
              </linearGradient>
            </defs>
            <path
              fill="url(#editron-logo-metal)"
              d="M80 0h184l-59 64H17L80 0Zm-42 70h248l-59 64H39C17 134 0 117 0 98c0-16 13-28 30-28h8Zm43 71h225l-62 63H82c-22 0-39-16-39-37 0-14 11-26 25-26h13Z"
            />
          </svg>
          <LiquidMetalText text="Editron" fontSize={23} />
        </button>

        <button
          type="button"
          onClick={() => setIsMobileNavOpen((open) => !open)}
          className="grid size-11 place-items-center rounded-lg text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-white md:hidden"
          aria-label={isMobileNavOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={isMobileNavOpen}
        >
          {isMobileNavOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <div
        className={`${isMobileNavOpen ? "flex" : "hidden md:flex"} absolute inset-x-0 top-full max-h-[calc(100vh-68px)] flex-col overflow-y-auto border-b border-zinc-800 bg-black px-3 pb-5 md:static md:max-h-none md:flex-1 md:border-0 md:px-0 md:pb-0`}
      >
        <nav aria-label="Studio navigation" className="space-y-6">
          <button
            type="button"
            onClick={() => {
              setIsMobileNavOpen(false);
              onHome();
            }}
            className={navItemClass(activePage === "home")}
            aria-current={activePage === "home" ? "page" : undefined}
          >
            <House className="size-[18px]" />
            <span>Home</span>
          </button>

          <div className="space-y-1.5">
            <p className="px-2.5 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500">
              Create
            </p>
            <button
              type="button"
              onClick={() => {
                setIsMobileNavOpen(false);
                onNewProject();
              }}
              className="flex min-h-11 w-full items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-left text-[13px] font-medium text-white transition-colors hover:bg-zinc-800 md:min-h-0"
            >
              <Plus className="size-4" />
              <span>New project</span>
            </button>
          </div>

          <div className="space-y-1.5">
            <p className="px-2.5 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500">
              Library
            </p>
            <button
              type="button"
              onClick={() => {
                setIsMobileNavOpen(false);
                onProjects();
              }}
              className={navItemClass(activePage === "projects")}
              aria-current={activePage === "projects" ? "page" : undefined}
            >
              <Folder className="size-4" />
              <span>Projects</span>
            </button>
          </div>
        </nav>

        <div className="mt-8 border-t border-zinc-800 pt-4 md:mt-auto">
          <button
            type="button"
            disabled
            title="Settings are not available yet"
            className={`${navItemClass()} cursor-not-allowed opacity-45`}
          >
            <Settings className="size-[18px]" />
            <span>Settings</span>
          </button>
          <div className="mt-5 flex items-center gap-2.5 px-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-full border border-zinc-600 bg-zinc-200 text-sm font-semibold text-zinc-900">
              <CircleUserRound className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-zinc-200">
                {userName || (authEnabled ? "Guest" : "Guest workspace")}
              </span>
              <span className="block truncate text-xs text-zinc-500">
                {userEmail || (authEnabled ? "Sign in to sync projects" : "Login is temporarily off")}
              </span>
            </span>
            {authEnabled && (
              <button
                type="button"
                onClick={isAuthenticated ? onSignOut : onSignIn}
                className="grid size-8 shrink-0 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-white"
                aria-label={isAuthenticated ? "Sign out" : "Sign in with Google"}
                title={isAuthenticated ? "Sign out" : "Sign in with Google"}
              >
                {isAuthenticated ? <LogOut className="size-4" /> : <LogIn className="size-4" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

export function Welcome() {
  const { data: session, status } = useSession();
  const guestSession = useGuestSession();
  const [showStudio, setShowStudio] = useState(false);
  const [studioPage, setStudioPage] = useState<StudioPage>("editor");
  const [initialFile, setInitialFile] = useState<File | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);
  const [editorSession, setEditorSession] = useState(0);
  const [workspaceRestored, setWorkspaceRestored] = useState(false);
  const [hasUnsavedWork, setHasUnsavedWork] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(WORKSPACE_KEY);
      if (stored) {
        const workspace = parseWorkspaceSession(stored);
        if (workspace) {
          setShowStudio(true);
          setStudioPage(workspace.page);
          if (workspace.projectId) {
            setActiveProjectId(workspace.projectId);
            setSavedProjectId(workspace.projectId);
          }
        }
      }
    } catch (error) {
      console.error("[Welcome] Could not restore the workspace:", error);
      toast({
        title: "Workspace could not be restored",
        description: "Open your saved project from the Projects page.",
        variant: "destructive",
      });
    }
    setWorkspaceRestored(true);
  }, []);

  useEffect(() => {
    if (!workspaceRestored) return;
    try {
      if (showStudio) {
        sessionStorage.setItem(WORKSPACE_KEY, JSON.stringify({
          page: studioPage,
          projectId: studioPage === "editor" ? savedProjectId : null,
        }));
      } else {
        sessionStorage.removeItem(WORKSPACE_KEY);
      }
    } catch (error) {
      console.error("[Welcome] Could not remember the workspace:", error);
      toast({
        title: "Workspace position could not be remembered",
        description: "Your saved projects remain available from the Projects page.",
        variant: "destructive",
      });
    }
  }, [workspaceRestored, showStudio, studioPage, savedProjectId]);

  const handleUpload = () => {
    if (AUTH_ENABLED && status === "loading") return;
    if (!AUTH_ENABLED && !guestSession.ready) return;
    if (AUTH_ENABLED && !session) {
      void signIn("google");
      return;
    }

    const input = document.getElementById("video-upload-input") as HTMLInputElement;
    if (input) input.click();
  };

  const canLeaveEditor = () => studioPage !== "editor" || !hasUnsavedWork ||
    window.confirm("Your current work is not saved. Leave the editor and discard it?");

  const startNewProject = () => {
    if (!canLeaveEditor()) return;
    setHasUnsavedWork(false);
    setInitialFile(null);
    setActiveProjectId(null);
    setSavedProjectId(null);
    setEditorSession((session) => session + 1);
    setStudioPage("editor");
  };

  const openProject = (projectId: string) => {
    if (!canLeaveEditor()) return;
    setHasUnsavedWork(false);
    setInitialFile(null);
    setActiveProjectId(projectId);
    setSavedProjectId(projectId);
    setEditorSession((session) => session + 1);
    setStudioPage("editor");
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInitialFile(file);
      setActiveProjectId(null);
      setSavedProjectId(null);
      setStudioPage("editor");
      setShowStudio(true);
    }
    e.currentTarget.value = "";
  };

  if (!workspaceRestored) {
    return <div className="min-h-screen bg-black" aria-busy="true" />;
  }

  return (
    <div className="relative min-h-screen w-full bg-black">
      <input
        id="video-upload-input"
        type="file"
        className="hidden"
        accept=".mp4,.mp3,.wav,.m4a,.webm,.mov,.ogg,.aac,.mkv"
        onChange={onFileSelect}
      />
      <AnimatePresence mode="wait">
        {!showStudio ? (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
            transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-12 overflow-hidden"
          >
            {/* Reaction-Diffusion Background */}
            <div className="absolute inset-0 z-[-1] opacity-40 pointer-events-none">
              <ReactionFront cellSize={12} className="text-zinc-700" />
            </div>

            {/* Branding */}
            <div className="flex flex-col items-center gap-4">
              <LiquidMetalText text="EDITRON" fontSize="clamp(48px, 14vw, 120px)" />
              <p className="text-zinc-500 font-light tracking-widest text-sm uppercase">
                The New Standard of Editing
              </p>
            </div>

            {/* Minimal Upload Action */}
            <div className="flex flex-col items-center gap-6 z-10">
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
                <LiquidMetalButton
                  label="Upload Video"
                  onClick={handleUpload}
                  disabled={!AUTH_ENABLED && !guestSession.ready}
                />
                <LiquidMetalButton
                  label="Explore"
                  onClick={() => {
                    setStudioPage("home");
                    setShowStudio(true);
                  }}
                />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="studio"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 min-h-screen w-full bg-black md:pl-[220px]"
          >
            <StudioSidebar
              onHome={() => {
                if (canLeaveEditor()) {
                  setHasUnsavedWork(false);
                  setStudioPage("home");
                }
              }}
              onNewProject={startNewProject}
              onProjects={() => {
                if (canLeaveEditor()) {
                  setHasUnsavedWork(false);
                  setStudioPage("projects");
                }
              }}
              onSignIn={() => void signIn("google")}
              onSignOut={() => void signOut({ callbackUrl: "/" })}
              userName={session?.user?.name ?? null}
              userEmail={session?.user?.email ?? null}
              isAuthenticated={status === "authenticated"}
              authEnabled={AUTH_ENABLED}
              activePage={studioPage}
            />
            <main className="min-w-0">
              {studioPage !== "editor" ? (
                <HomeDashboard
                  onNewProject={handleUpload}
                  onOpenProject={openProject}
                  view={studioPage}
                />
              ) : ((AUTH_ENABLED && status === "loading") || (!AUTH_ENABLED && !guestSession.ready && !guestSession.error)) ? (
                <div className="min-h-screen bg-black" role="status">Loading workspace…</div>
              ) : (
                <CaptionStudio
                  key={editorSession}
                  initialFile={initialFile}
                  projectId={activeProjectId}
                  onSavedProjectChange={setSavedProjectId}
                  onUnsavedWorkChange={setHasUnsavedWork}
                />
              )}
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      {!showStudio && (
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute left-1/4 top-1/4 size-96 rounded-full bg-zinc-900/20 blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 size-96 rounded-full bg-zinc-800/10 blur-[120px]" />
        </div>
      )}
    </div>
  );
}
