import { cn } from "@/lib/utils";

export function CapGenLogo({ className, showIcon = true }: { className?: string; showIcon?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 select-none", className)}>
      {showIcon && (
        <div className="relative grid size-8 place-items-center rounded-lg bg-[#FF6B1A] shadow-sm">
          {/* Caption speech bubble icon */}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1z"
              fill="white"
              opacity="0.95"
            />
            <rect x="7" y="9" width="3" height="3" rx="0.5" fill="#FF6B1A" />
            <rect x="11.5" y="9" width="3" height="3" rx="0.5" fill="#FF6B1A" />
            <rect x="16" y="9" width="3" height="3" rx="0.5" fill="#FF6B1A" />
          </svg>
        </div>
      )}
      <span className="text-xl font-extrabold tracking-tight">
        <span className="text-[#FF6B1A]">Cap</span>
        <span className="text-white">Gen</span>
      </span>
    </div>
  );
}
