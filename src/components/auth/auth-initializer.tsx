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
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            setAuth(data.user);
            setCurrentView("dashboard");
          }
        }
      } finally {
        finishInitialLoad();
        setInitialized(true);
      }
    };

    checkAuth();
  }, [initialized, setAuth, finishInitialLoad, setCurrentView]);

  return null; // This component does not render anything
}