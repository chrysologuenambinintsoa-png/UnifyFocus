"use client";

import React from "react";
import {
  Check,
  Clock,
  AlertCircle,
  Loader2,
  Zap,
  Wifi,
  WifiOff,
  Download,
  Upload,
  Users,
  Activity,
} from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface StatusBarProps {
  className?: string;
}

export function StatusBar({ className }: StatusBarProps) {
  const { t } = useTranslation();
  const { user, generations, currentView, editorTab } = useAppStore();
  const [isOnline, setIsOnline] = React.useState(true);
  const [currentTask, setCurrentTask] = React.useState<{
    label: string;
    progress: number;
    status: "idle" | "processing" | "completed" | "error";
  }>({ label: "Prêt", progress: 0, status: "idle" });

  // Check online status
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Track active generations
  React.useEffect(() => {
    const pendingGens = generations.filter((g) => g.status === "pending");
    const completedGens = generations.filter((g) => g.status === "completed");
    const failedGens = generations.filter((g) => g.status === "failed");

    if (pendingGens.length > 0) {
      setCurrentTask({
        label: `${pendingGens.length} génération(s) en cours...`,
        progress: 65,
        status: "processing",
      });
    } else if (failedGens.length > 0) {
      setCurrentTask({
        label: `${failedGens.length} échec(s) récent(s)`,
        progress: 0,
        status: "error",
      });
    } else if (completedGens.length > 0) {
      setCurrentTask({
        label: `${completedGens.length} génération(s) terminée(s)`,
        progress: 100,
        status: "completed",
      });
    } else {
      setCurrentTask({ label: "Prêt", progress: 0, status: "idle" });
    }
  }, [generations]);

  const getStatusIcon = () => {
    switch (currentTask.status) {
      case "processing":
        return <Loader2 className="size-3 animate-spin text-yellow-500" />;
      case "completed":
        return <Check className="size-3 text-emerald-500" />;
      case "error":
        return <AlertCircle className="size-3 text-red-500" />;
      default:
        return <Check className="size-3 text-muted-foreground" />;
    }
  };

  const getRelativeTime = (dateStr: string) => {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return "à l'instant";
    if (diffMin < 60) return `il y a ${diffMin} min`;
    if (diffHr < 24) return `il y a ${diffHr} h`;
    return `il y a ${diffDay} j`;
  };

  const lastActivity = generations.length > 0 
    ? getRelativeTime(generations[0].createdAt) 
    : null;

  return (
    <TooltipProvider>
      <footer
        className={cn(
          "h-6 bg-surface-1 border-t border-border flex items-center justify-between px-3 text-[10px] text-muted-foreground shrink-0",
          className
        )}
      >
        {/* Left Section - Status */}
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                {isOnline ? (
                  <Wifi className="size-3 text-emerald-500" />
                ) : (
                  <WifiOff className="size-3 text-red-500" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {isOnline ? "Connecté" : "Déconnecté"}
            </TooltipContent>
          </Tooltip>

          {/* Current Task */}
          <div className="flex items-center gap-1.5">
            {getStatusIcon()}
            <span>{currentTask.label}</span>
          </div>

          {/* Progress Bar (when processing) */}
          {currentTask.status === "processing" && (
            <div className="w-20">
              <Progress value={currentTask.progress} className="h-1" />
            </div>
          )}
        </div>

        {/* Center Section - Info */}
        <div className="flex items-center gap-3">
          {/* Generations Count */}
          {generations.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <Zap className="size-3" />
                  <span>{generations.length} générations</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Total des générations</TooltipContent>
            </Tooltip>
          )}

          {/* Last Activity */}
          {lastActivity && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <Activity className="size-3" />
                  <span>{lastActivity}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Dernière activité</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Right Section - Actions & Info */}
        <div className="flex items-center gap-3">
          {/* View Info */}
          <span className="hidden sm:inline">
            {currentView === "dashboard" && "Tableau de bord"}
            {currentView === "editor" && `Éditeur - ${editorTab || "musique"}`}
            {currentView === "chat" && "Chat IA"}
            {currentView === "profile" && "Profil"}
            {currentView === "settings" && "Paramètres"}
            {currentView === "usage" && "Statistiques"}
            {currentView === "landing" && "Accueil"}
          </span>

          {/* Quick Actions */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="p-0.5 rounded hover:bg-muted/50 transition-colors">
                  <Download className="size-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Exporter</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button className="p-0.5 rounded hover:bg-muted/50 transition-colors">
                  <Upload className="size-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Importer</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button className="p-0.5 rounded hover:bg-muted/50 transition-colors">
                  <Users className="size-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Communauté</TooltipContent>
            </Tooltip>
          </div>

          {/* Version */}
          <span className="hidden lg:inline text-[9px]">v1.0.0</span>
        </div>
      </footer>
    </TooltipProvider>
  );
}