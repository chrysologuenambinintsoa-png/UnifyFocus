"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useToast } from "@/hooks/use-toast";

export function OAuthCallback() {
  const searchParams = useSearchParams();
  const { setAuth } = useAppStore();
  const { toast } = useToast();

  useEffect(() => {
    async function handleCallback() {
      const provider = searchParams.get("provider");
      const accessToken = searchParams.get("accessToken");
      const idToken = searchParams.get("idToken");
      const error = searchParams.get("error");

      if (error) {
        toast({
          title: "Erreur d'authentification",
          description: error,
          variant: "destructive",
        });
        window.history.replaceState({}, document.title, "/");
        return;
      }

      if (!provider) return; // Not an OAuth callback

      if (!accessToken && !idToken) {
        console.warn("No tokens in callback, skipping OAuth finalization");
        return;
      }

      try {
        // Send token to backend
        const res = await fetch("/api/auth/oauth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider,
            accessToken: accessToken || undefined,
            idToken: idToken || undefined,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Authentification échouée");
        }

        const data = await res.json();
        setAuth(data.user);

        toast({
          title: "Connexion réussie",
          description: `Connecté avec ${provider.charAt(0).toUpperCase() + provider.slice(1)}`,
        });

        // Clear URL and redirect to root, dashboard will render from app state
        window.history.replaceState({}, document.title, "/");
        window.location.href = "/";
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur d'authentification";
        toast({
          title: "Erreur",
          description: message,
          variant: "destructive",
        });
        window.history.replaceState({}, document.title, "/");
      }
    }

    handleCallback();
  }, [searchParams, setAuth, toast]);

  return null;
}
