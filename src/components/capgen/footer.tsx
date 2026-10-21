import { CapGenLogo } from "./logo";
import { Instagram, Github, Twitter } from "lucide-react";

const FOOTER_COLUMNS = [
  {
    title: "Languages",
    links: ["Hindi", "Hinglish", "Telugu", "Tamil", "Marathi", "All 82 languages"],
  },
  {
    title: "Pricing",
    links: ["Free", "Creator", "Studio", "Compare plans"],
  },
  {
    title: "Plugin",
    links: ["Premiere Pro", "After Effects", "Install guide", "Changelog"],
  },
  {
    title: "Creators",
    links: ["Editor reviews", "Case studies", "Affiliate", "Brand kit"],
  },
  {
    title: "Version log",
    links: ["Latest release", "Roadmap", "Beta features", "Status"],
  },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[#2a2a2a] bg-[#0d0d0d] text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_3fr]">
          {/* Brand block */}
          <div>
            <div className="flex items-center gap-2">
              <div className="grid size-8 place-items-center rounded-lg bg-[#FF6B1A]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1z" fill="white" />
                  <rect x="7" y="9" width="3" height="3" rx="0.5" fill="#FF6B1A" />
                  <rect x="11.5" y="9" width="3" height="3" rx="0.5" fill="#FF6B1A" />
                  <rect x="16" y="9" width="3" height="3" rx="0.5" fill="#FF6B1A" />
                </svg>
              </div>
              <span className="text-xl font-extrabold tracking-tight">
                <span className="text-[#FF6B1A]">Cap</span>
                <span className="text-white">Gen</span>
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-white/60">
              Built to save editor&apos;s time. 82 languages, word-timed captions, auto trim — all in your browser.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <a
                href="#"
                aria-label="Instagram"
                className="grid size-9 place-items-center rounded-lg bg-white/10 text-white transition-colors hover:bg-[#FF6B1A]"
              >
                <Instagram className="size-4" />
              </a>
              <a
                href="#"
                aria-label="X"
                className="grid size-9 place-items-center rounded-lg bg-white/10 text-white transition-colors hover:bg-[#FF6B1A]"
              >
                <Twitter className="size-4" />
              </a>
              <a
                href="#"
                aria-label="GitHub"
                className="grid size-9 place-items-center rounded-lg bg-white/10 text-white transition-colors hover:bg-[#FF6B1A]"
              >
                <Github className="size-4" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#FF6B1A]">
                  {col.title}
                </h4>
                <ul className="mt-3 space-y-2">
                  {col.links.map((l) => (
                    <li key={l}>
                      <a
                        href="#"
                        className="text-sm text-white/70 transition-colors hover:text-white"
                      >
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4 text-xs text-white/50">
            <span>© 2026 CapGen</span>
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Privacy</a>
          </div>
          <p className="text-xs text-white/40">
            Made for editors, by editors. Orange since day one.
          </p>
        </div>
      </div>
    </footer>
  );
}

export { CapGenLogo };
