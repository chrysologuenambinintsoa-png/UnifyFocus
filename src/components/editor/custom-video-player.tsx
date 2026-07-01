"use client";
import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  src: string;
  className?: string;
  poster?: string;
};

export default function CustomVideoPlayer({ src, className, poster }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useProxy, setUseProxy] = useState(false);

  useEffect(() => {
    let mounted = true;
    setError(null);
    setLoading(true);
    setResolvedSrc(null);

    const trimmed = String(src ?? "").trim();
    if (!trimmed) {
      setError("Source vidéo vide");
      setLoading(false);
      return;
    }

    // If it's a data URL, use directly
    if (trimmed.startsWith("data:video/")) {
      setResolvedSrc(trimmed);
      setLoading(false);
      return;
    }

    // If user chose proxy, use proxy URL
    if (useProxy) {
      setResolvedSrc(`/api/proxy?url=${encodeURIComponent(trimmed)}`);
      setLoading(false);
      return;
    }

    // Attempt to fetch HEAD to verify CORS and content-type
    (async () => {
      try {
        // Try a lightweight fetch to ensure CORS allows playback
        const res = await fetch(trimmed, { method: "HEAD" });
        const ct = res.headers.get("content-type") || "";
        if (!res.ok || !ct.startsWith("video/")) {
          // fallback to using the original URL (may still play) but warn
          setResolvedSrc(trimmed);
          if (!res.ok) setError(`Requête distante répond ${res.status}`);
          else setError("Type de contenu inattendu");
        } else {
          setResolvedSrc(trimmed);
        }
      } catch (err) {
        // HEAD may fail due to CORS — fall back to original URL but surface error
        setResolvedSrc(trimmed);
        setError("Accès direct bloqué par CORS. Essayez le proxy si la lecture échoue.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [src, useProxy]);

  const togglePlay = async () => {
    if (!videoRef.current) return;
    try {
      if (videoRef.current.paused) {
        await videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, [videoRef.current]);

  return (
    <div className={`relative ${className ?? ""}`}>
      <div className="relative rounded-2xl overflow-hidden bg-black">
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center text-white">Chargement...</div>
        )}

        {resolvedSrc ? (
          <video
            ref={videoRef}
            src={resolvedSrc}
            controls
            playsInline
            preload="metadata"
            poster={poster}
            className="w-full max-h-[520px] bg-black object-contain"
          />
        ) : (
          <div className="w-full h-56 flex items-center justify-center text-sm text-slate-400 bg-black">Aucune source</div>
        )}

        <div className="absolute left-3 bottom-3 z-30 flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={togglePlay}>
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => window.open(resolvedSrc || src, "_blank") }>
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>

        {error && (
          <div className="absolute right-3 top-3 z-30 flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-md bg-red-700/10 px-3 py-1 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-300" />
              <span>{error}</span>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setUseProxy(true)}>Utiliser le proxy</Button>
          </div>
        )}
      </div>
    </div>
  );
}
