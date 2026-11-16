"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { SessionProvider } from "next-auth/react";

const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";
const GuestSessionContext = createContext({ ready: AUTH_ENABLED, error: "" });

export function Providers({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(AUTH_ENABLED);
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (AUTH_ENABLED || started.current) return;
    started.current = true;

    fetch("/api/guest-session", { method: "POST" })
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(
            payload && typeof payload.error === "string"
              ? payload.error
              : "Could not initialize the guest workspace.",
          );
        }
        setReady(true);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Could not initialize the guest workspace.");
      });
  }, []);

  return (
    <SessionProvider>
      <GuestSessionContext.Provider value={{ ready, error }}>
        {children}
      </GuestSessionContext.Provider>
    </SessionProvider>
  );
}

export function useGuestSession() {
  return useContext(GuestSessionContext);
}
