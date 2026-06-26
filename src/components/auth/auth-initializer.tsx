"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/store/app-store";

export function AuthInitializer() {
  const { setAuth, finishInitialLoad, setCurrentView } = useAppStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return;

    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          return;
        }

        const data = await res.json().catch(() => null);
        if (data?.user) {
          setAuth(data.user);
          setCurrentView("dashboard");
        }
      } catch {
        // Ignore network errors during initial load so the app can still render.
      } finally {
        finishInitialLoad();
        setInitialized(true);
      }
    };

    checkAuth();
  }, [initialized, setAuth, finishInitialLoad, setCurrentView]);

  return null; // This component does not render anything
}