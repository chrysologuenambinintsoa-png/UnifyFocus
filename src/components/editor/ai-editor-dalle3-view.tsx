"use client";
import { useTranslation } from "@/lib/i18n";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ImageIcon,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Download,
  RefreshCw,
  Plus,
  Maximize2,
  Wand2,
  Camera,
  Type,
  X,
  Paperclip,
  Send,
  Menu,
  ChevronRight,
  MessageSquare,
  Coins,
  Bot,
  Settings2,
  Palette,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { useAppStore, Conversation, AVAILABLE_MODELS } from "@/store/app-store";
import { useToast } from "@/hooks/use-toast";
import { notifyGenerationFailure, notifyConnectionFailure, notifyInsufficientCredits } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConversationSidebar } from "@/components/ui/conversation-sidebar";

// ---------------------------------------------------------------------------
// Constants - Style DALL-E 3 (simplifié et épuré)
// ---------------------------------------------------------------------------

const MODES = [
  { 
    key: "text-to-image", 
    label: "Créer", 
    icon: Wand2, 
    credits: 3,
    description: "Générez des images à partir de descriptions textuelles"
  },
  { 
    key: "image-to-image", 
    label: "Transformer", 
    icon: Camera, 
    credits: 3,
    description: "Transformez vos images avec l'IA"
  },
  { 
    key: "image-to-text", 
    label: "Analyser", 
    icon: Type, 
    credits: 2,
    description: "Extrayez du texte et décrivez le contenu d'images"
  },
] as const;

const STYLES = [
  { label: "Naturel", value: "naturel", description: "Style photographique réaliste" },
  { label: "Vif", value: "vif", description: "Couleurs saturées et style artistique" },
  { label: "Épuré", value: "epure", description: "Design minimaliste et moderne" },
];

const QUALITIES = [
  { label: "Standard", value: "standard" },
  { label: "HD", value: "hd" },
];

const SIZES = [
  { label: "Carré (1024×1024)", value: "1024x1024" },
  { label: "Paysage (1792×1024)", value: "1792x1024" },
  { label: "Portrait (1024×1792)", value: "1024x1792" },
];

const MAX_CHARS = 4000;
const MAX_FILES = 1;

interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  file: File;
}

type ResultPayload = {
  type: "text" | "image" | "video" | "code" | "audio";
  subtype: string;
  result: string;
};

const PLACEHOLDERS: Record<string, string> = {
  "text-to-image": "Décrivez l'image que vous souhaitez créer en détail...",
  "image-to-image": "Décrivez les modifications souhaitées pour votre image...",
  "image-to-text": "Que souhaitez-vous savoir sur cette image ?",
};

const API_ENDPOINTS: Record<string, string> = {
  "text-to-image": "/api/generate/image",
  "image-to-image": "/api/generate/image",
  "image-to-text": "/api/generate/text",
};

// ---------------------------------------------------------------------------
// Custom Hooks
// ---------------------------------------------------------------------------

function useFileAttachments() {
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

  const handleFilesSelected = useCallback(
    (files: FileList | File[]) => {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      const newFiles: AttachedFile[] = [];

      for (let i = 0; i < Math.min(files.length, MAX_FILES); i++) {
        const candidate = files[i];
        if (!(candidate instanceof File)) continue;

        if (!allowedTypes.includes(candidate.type)) continue;
        if (candidate.size > 10 * 1024 * 1024) continue;

        newFiles.push({
          id: `${Date.now()}-${i}-${candidate.name}`,
          name: candidate.name,
          size: candidate.size,
          type: candidate.type,
          url: URL.createObjectURL(candidate),
          file: candidate,
        });
      }

      if (newFiles.length > 0) {
        setAttachedFiles((prev) => [...prev, ...newFiles]);
        return { success: true, count: newFiles.length };
      }

      return { success: false, message: "Aucun fichier valide ajouté." };
    },
    []
  );

  const handleRemoveFile = useCallback((id: string) => {
    setAttachedFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) {
        URL.revokeObjectURL(file.url);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const clearFiles = useCallback(() => {
    setAttachedFiles((prev) => {
      prev.forEach((file) => URL.revokeObjectURL(file.url));
      return [];
    });
  }, []);

  return { attachedFiles, handleFilesSelected, handleRemoveFile, clearFiles };
}

// ---------------------------------------------------------------------------
// UI Components - Style DALL-E 3
// ---------------------------------------------------------------------------

function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Mesh gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-cyan-500/5" />
      
      {/* Animated orbs */}
      <motion.div
        animate={{
          x: [0, 100, 0],
          y: [0, -50, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute -top-40 -right-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl"
      />
      <motion.div
        animate={{
          x: [0, -80, 0],
          y: [0, 60, 0],
          scale: [1, 1.3, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl"
      />
    </div>
  );
}

function GlassCard({
  children,
  className = "",
  variant = "default",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "input" | "output" | "elevated";
}) {
  const variants = {
    default: "bg-card/40 backdrop-blur-xl border border-white/10",
    input: "bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-transparent backdrop-blur-xl border border-white/15",
    output: "bg-card/60 backdrop-blur-xl border border-white/10",
    elevated: "bg-card/50 backdrop-blur-2xl border border-white/20 shadow-2xl",
  };

  return (
    <motion.div
      className={`
        relative overflow-hidden rounded-2xl
        ${variants[variant]}
        ${className}
      `}
    >
      {/* Subtle shine effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      {children}
    </motion.div>
  );
}

function ModeSelector({
  modes,
  activeMode,
  onSelect,
}: {
  modes: typeof MODES;
  activeMode: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2 flex-wrap">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = activeMode === mode.key;
        
        return (
          <motion.button
            key={mode.key}
            onClick={() => onSelect(mode.key)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              relative px-5 py-2.5 rounded-xl font-medium transition-all duration-300
              flex items-center gap-2 text-sm
              ${
                isActive
                  ? "bg-gradient-to-r from-violet-600 via-purple-500 to-violet-600 text-white shadow-lg shadow-violet-500/30"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10 border border-white/10"
              }
            `}
          >
            {isActive && (
              <motion.div
                layoutId="activeModeGlow"
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-600 via-purple-500 to-violet-600 opacity-20 blur-md"
              />
            )}
            <Icon className={`w-4 h-4 relative z-10 ${isActive ? "" : "opacity-70"}`} />
            <span className="relative z-10">{mode.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

function StyleSelector({
  style,
  setStyle,
  quality,
  setQuality,
  size,
  setSize,
}: {
  style: string;
  setStyle: (v: string) => void;
  quality: string;
  setQuality: (v: string) => void;
  size: string;
  setSize: (v: string) => void;
}) {
  return (
    <GlassCard variant="default" className="p-4">
      <div className="space-y-4">
        {/* Style */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Palette className="w-3.5 h-3.5" />
            Style
          </label>
          <div className="flex flex-wrap gap-2">
            {STYLES.map((s) => {
              const isActive = style === s.value;
              return (
                <motion.button
                  key={s.value}
                  onClick={() => setStyle(s.value)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`
                    px-4 py-2 rounded-lg text-sm transition-all duration-200
                    ${isActive ? "bg-violet-500 text-white shadow-md shadow-violet-500/25" : "bg-white/5 text-muted-foreground hover:bg-white/10 border border-white/10"}
                  `}
                  title={s.description}
                >
                  {s.label}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Quality & Size */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Qualité
            </label>
            <Select value={quality} onValueChange={setQuality}>
              <SelectTrigger className="bg-white/5 border-white/10 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card/90 backdrop-blur-xl border-white/10 rounded-xl">
                {QUALITIES.map((q) => (
                  <SelectItem key={q.value} value={q.value} className="rounded-lg">
                    {q.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Format
            </label>
            <Select value={size} onValueChange={setSize}>
              <SelectTrigger className="bg-white/5 border-white/10 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card/90 backdrop-blur-xl border-white/10 rounded-xl">
                {SIZES.map((s) => (
                  <SelectItem key={s.value} value={s.value} className="rounded-lg">
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function EmptyState({ mode }: { mode: string }) {
  const modeConfig = MODES.find((m) => m.key === mode);
  const Icon = modeConfig?.icon || Sparkles;

  return (
    <motion.div
      key="empty"
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -20 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col items-center justify-center py-20 px-4"
    >
      <motion.div
        animate={{
          y: [0, -15, 0],
          rotate: [0, 8, -8, 0],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="
          relative w-32 h-32 rounded-3xl flex items-center justify-center mb-8
          bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent
          border border-violet-500/20
        "
      >
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-violet-600 via-purple-500 to-violet-600 opacity-20 blur-xl" />
        <Icon className="w-14 h-14 text-violet-400 relative z-10" />
      </motion.div>
      
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-bold text-foreground mb-3"
      >
        Prêt à créer
      </motion.h3>
      
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-muted-foreground text-center max-w-md"
      >
        {modeConfig?.description || "Décrivez ce que vous souhaitez générer et laissez l'IA faire le reste."}
      </motion.p>

      {/* Feature hints */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex gap-4 mt-8"
      >
        {[
          { icon: Sparkles, label: "IA Puissante" },
          { icon: Palette, label: "Styles variés" },
          { icon: Zap, label: "Rapide" },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + i * 0.1 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10"
          >
            <item.icon className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{item.label}</span>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

function GeneratingAnimation({ mode, streamingContent }: { mode: string; streamingContent?: string }) {
  const modeConfig = MODES.find((m) => m.key === mode);
  const Icon = modeConfig?.icon || Sparkles;

  const statusMessages = [
    "Analyse de votre demande...",
    "Génération en cours...",
    "Optimisation des résultats...",
    "Finalisation...",
  ];

  const [currentStatus, setCurrentStatus] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStatus((prev) => (prev + 1) % statusMessages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      key="generating"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center border border-violet-500/30"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-500 to-violet-600 opacity-30 blur-lg" />
          <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
        </motion.div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-base font-semibold text-foreground"
            >
              Génération en cours
            </motion.p>
            {streamingContent && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-emerald-400 font-medium">Streaming</span>
              </motion.div>
            )}
          </div>
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-sm text-muted-foreground"
          >
            {statusMessages[currentStatus]}
          </motion.p>
        </div>
      </div>

      {/* Main card */}
      <GlassCard variant="output" className="p-0 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-violet-600 via-purple-500 to-violet-600 opacity-80" />
        
        <div className="p-5 pt-6">
          {streamingContent ? (
            <div className="relative overflow-hidden rounded-xl bg-slate-950/50 border border-white/5">
              <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-white/10">
                <div className="p-4">
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {streamingContent}
                    <span className="inline-block w-2 h-4 bg-violet-500 animate-pulse ml-1 align-middle rounded-full" />
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-xl">
              <div className="relative bg-gradient-to-br from-slate-900/50 to-slate-800/50 rounded-xl overflow-hidden min-h-[250px]">
                {/* Shimmer effect */}
                <motion.div
                  animate={{
                    x: ["-100%", "200%"],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                />
                
                {/* Pulsing glow */}
                <motion.div
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.2, 0.5, 0.2],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-transparent"
                />

                {/* Central animated orb */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    {/* Outer rings */}
                    <motion.div
                      animate={{
                        scale: [0.6, 1.8],
                        opacity: [0.6, 0],
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeOut",
                      }}
                      className="absolute inset-0 rounded-full border-2 border-violet-500/20"
                    />
                    <motion.div
                      animate={{
                        scale: [0.6, 1.8],
                        opacity: [0.6, 0],
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeOut",
                        delay: 0.8,
                      }}
                      className="absolute inset-0 rounded-full border-2 border-violet-500/15"
                    />
                    
                    {/* Main orb */}
                    <motion.div
                      animate={{
                        scale: [1, 1.15, 1],
                        rotate: [0, 180, 360],
                      }}
                      transition={{
                        duration: 6,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="relative w-28 h-28 rounded-full flex items-center justify-center"
                    >
                      <div className="w-20 h-20">
                        <img src="/logo.svg" alt="UnifyFocus" className="w-full h-full" />
                      </div>
                    </motion.div>
                  </div>
                </div>

                {/* Status text */}
                <div className="absolute bottom-6 left-6 right-6">
                  <motion.p
                    key={currentStatus}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-sm text-muted-foreground text-center mb-4"
                  >
                    {statusMessages[currentStatus]}
                  </motion.p>
                  
                  {/* Progress bar */}
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ x: "-100%" }}
                      animate={{ x: "100%" }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="h-full w-1/2 rounded-full bg-gradient-to-r from-violet-600 via-purple-500 to-violet-600"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}

function ImageResult({
  result,
  onRegenerate,
  onNew,
}: {
  result: string;
  onRegenerate: () => void;
  onNew: () => void;
}) {
  const { toast } = useToast();
  const userPlan = useAppStore((state) => state.user?.plan);
  const showWatermark = userPlan === "free";
  const [isRevealed, setIsRevealed] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const imageSrcIsValid = useMemo(() => {
    if (!result) return false;
    const trimmed = result.trim();
    if (trimmed.startsWith("data:image/")) return true;
    try {
      new URL(trimmed);
      return true;
    } catch {
      return false;
    }
  }, [result]);

  useEffect(() => {
    const timer = setTimeout(() => setIsRevealed(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleDownload = useCallback(async () => {
    if (!imageSrcIsValid) {
      toast({
        title: "Erreur",
        description: "Aucune image valide à télécharger.",
        variant: "destructive",
      });
      return;
    }

    if (!showWatermark) {
      try {
        downloadHref(result, `unifyfocus-image-${Date.now()}.png`);
        toast({ title: "Téléchargé !", description: "Image téléchargée avec succès." });
      } catch {
        toast({
          title: "Erreur",
          description: "Impossible de télécharger l'image.",
          variant: "destructive",
        });
      }
      return;
    }

    setIsDownloading(true);
    try {
      const watermarkedDataUrl = await createWatermarkedImageDataUrl(result);
      downloadHref(watermarkedDataUrl, `unifyfocus-image-${Date.now()}.png`);
      toast({ title: "Téléchargé !", description: "Image brandée téléchargée avec succès." });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de générer l'image watermarkée.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  }, [result, toast, imageSrcIsValid, showWatermark]);

  return (
    <motion.div
      key="result-image"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      className="w-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="relative w-12 h-12 rounded-xl bg-gradient-to-r from-violet-600 via-purple-500 to-violet-600 flex items-center justify-center shadow-lg"
          >
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-600 via-purple-500 to-violet-600 opacity-40 blur-md" />
            <ImageIcon className="w-5 h-5 text-white relative z-10" />
          </motion.div>
          <div>
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-base font-semibold text-foreground"
            >
              Image générée
            </motion.p>
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xs text-muted-foreground flex items-center gap-1"
            >
              <Bot className="w-3 h-3" />
              Généré par UnifyFocus AI
            </motion.p>
          </div>
        </div>
        {imageSrcIsValid && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading}
              className="h-10 w-10 p-0 rounded-xl hover:bg-white/10 transition-colors"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
          </motion.div>
        )}
      </div>

      {/* Result card - Style DALL-E 3 grille */}
      <GlassCard variant="output" className="overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-violet-600 via-purple-500 to-violet-600 opacity-80" />
        
        <div className="p-6">
          {imageSrcIsValid ? (
            <motion.div 
              className="relative overflow-hidden rounded-xl cursor-pointer group bg-slate-950/50"
              onClick={() => setIsViewerOpen(true)}
              whileHover={{ scale: 1.01 }}
            >
              <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/30 rounded-xl backdrop-blur-sm">
                <div className="px-5 py-2.5 rounded-xl bg-white/20 backdrop-blur-md text-white text-sm flex items-center gap-2 border border-white/30">
                  <Maximize2 className="w-4 h-4" />
                  <span>Agrandir</span>
                </div>
              </div>
              <motion.img
                initial={{ scale: 1.05, opacity: 0.8 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                src={result}
                alt="Image générée par IA"
                className="w-full max-h-[600px] rounded-xl object-contain group-hover:scale-105 transition-transform duration-500"
              />
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center p-10">
              <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
                <ImageIcon className="w-8 h-8 text-destructive" />
              </div>
              <p className="text-sm text-destructive text-center">
                Erreur : l'image n'a pas pu être générée.
              </p>
              <p className="text-xs text-muted-foreground mt-2 break-all text-center">{result}</p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex items-center gap-3 mt-5"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRegenerate}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium
            bg-white/5 text-foreground border border-white/10 hover:bg-white/10 hover:border-white/20
            transition-all duration-300 backdrop-blur-md"
        >
          <RefreshCw className="w-4 h-4" />
          Régénérer
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNew}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium
            bg-white/5 text-foreground border border-white/10 hover:bg-white/10 hover:border-white/20
            transition-all duration-300 backdrop-blur-md"
        >
          <Plus className="w-4 h-4" />
          Nouveau
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {isViewerOpen && imageSrcIsValid && (
          <MediaViewer
            src={result}
            type="image"
            isOpen={isViewerOpen}
            onClose={() => setIsViewerOpen(false)}
            title="Image générée"
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function TextResult({
  result,
  onRegenerate,
  onNew,
}: {
  result: string;
  onRegenerate: () => void;
  onNew: () => void;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      toast({ title: "Copié !", description: "Texte copié dans le presse-papiers." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de copier le texte.",
        variant: "destructive",
      });
    }
  }, [result, toast]);

  return (
    <motion.div
      key="result-text"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      className="w-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="relative w-12 h-12 rounded-xl bg-gradient-to-r from-violet-600 via-purple-500 to-violet-600 flex items-center justify-center shadow-lg"
          >
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-600 via-purple-500 to-violet-600 opacity-40 blur-md" />
            <Type className="w-5 h-5 text-white relative z-10" />
          </motion.div>
          <div>
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-base font-semibold text-foreground"
            >
              Texte extrait
            </motion.p>
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xs text-muted-foreground flex items-center gap-1"
            >
              <Bot className="w-3 h-3" />
              Généré par UnifyFocus AI
            </motion.p>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-10 w-10 p-0 rounded-xl hover:bg-white/10 transition-colors"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground" />
            )}
          </Button>
        </motion.div>
      </div>

      {/* Result card */}
      <GlassCard variant="output" className="overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-violet-600 via-purple-500 to-violet-600 opacity-80" />
        
        <div className="p-5">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="text-foreground leading-relaxed whitespace-pre-wrap break-words text-base">
              {result}
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex items-center gap-3 mt-5"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRegenerate}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium
            bg-white/5 text-foreground border border-white/10 hover:bg-white/10 hover:border-white/20
            transition-all duration-300 backdrop-blur-md"
        >
          <RefreshCw className="w-4 h-4" />
          Régénérer
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNew}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium
            bg-white/5 text-foreground border border-white/10 hover:bg-white/10 hover:border-white/20
            transition-all duration-300 backdrop-blur-md"
        >
          <Plus className="w-4 h-4" />
          Nouveau
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

function MediaViewer({
  src,
  type,
  isOpen,
  onClose,
  title,
}: {
  src: string;
  type: "image" | "video";
  isOpen: boolean;
  onClose: () => void;
  title: string;
}) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" />
      
      <motion.button
        onClick={onClose}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="absolute top-6 right-6 z-50 w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all duration-300 shadow-lg shadow-red-500/40 hover:shadow-red-500/60"
        style={{ boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)' }}
      >
        <X className="w-7 h-7 text-white" strokeWidth={3} />
      </motion.button>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative z-40 max-w-[90vw] max-h-[90vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {type === "image" ? (
          <img
            src={src}
            alt={title}
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
          />
        ) : (
          <video
            src={src}
            controls
            autoPlay
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
          />
        )}
      </motion.div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40">
        <div className="px-5 py-2.5 rounded-xl bg-white/10 backdrop-blur-md text-white text-sm border border-white/10">
          {title}
        </div>
      </div>
    </motion.div>
  );
}

// Watermark functions
function downloadHref(href: string, filename: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
  }, 100);
}

let watermarkImagePromise: Promise<HTMLImageElement> | null = null;

function loadWatermarkIcon() {
  if (!watermarkImagePromise) {
    watermarkImagePromise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Impossible de charger le watermark."));
      img.src = "/watermark.png";
    });
  }
  return watermarkImagePromise;
}

async function createWatermarkedImageDataUrl(src: string): Promise<string> {
  const imageSrc = src.startsWith("http") ? `/api/proxy?url=${encodeURIComponent(src)}` : src;
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Impossible de charger l'image."));
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Impossible de créer le canvas");

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  drawWatermark(ctx, canvas.width, canvas.height);

  return canvas.toDataURL("image/png");
}

function drawWatermark(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const padding = Math.max(16, Math.round(width * 0.03));
  const iconSize = Math.min(100, Math.round(width * 0.14));
  const iconX = width - iconSize - padding;
  const iconY = height - iconSize - padding;

  try {
    const watermarkIcon = loadWatermarkIcon();
    watermarkIcon.then((icon) => {
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.drawImage(icon, iconX, iconY, iconSize, iconSize);
      ctx.restore();
    });
  } catch {
    // fallback to text-only watermark
  }

  const fontSize = Math.max(18, Math.round(width * 0.04));
  const textY = iconY + iconSize / 2;
  const textPadding = Math.round(padding * 0.5);
  const unify = "Unify";
  const focus = "Focus";

  ctx.font = `800 ${fontSize}px Inter, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0, 0, 0, 0.18)";
  ctx.shadowBlur = 2;
  ctx.shadowOffsetY = 1;

  const unifyWidth = ctx.measureText(unify).width;
  const focusWidth = ctx.measureText(focus).width;
  const totalTextWidth = unifyWidth + focusWidth + textPadding;
  const textX = iconX - totalTextWidth - padding;

  const unifyGradient = ctx.createLinearGradient(textX, 0, textX + unifyWidth, 0);
  unifyGradient.addColorStop(0, "#94a3b8");
  unifyGradient.addColorStop(1, "#cbd5e1");
  ctx.fillStyle = unifyGradient;
  ctx.fillText(unify, textX, textY);

  const focusGradient = ctx.createLinearGradient(textX + unifyWidth + textPadding, 0, textX + unifyWidth + textPadding + focusWidth, 0);
  focusGradient.addColorStop(0, "#38bdf8");
  focusGradient.addColorStop(1, "#7c3aed");
  ctx.fillStyle = focusGradient;
  ctx.fillText(focus, textX + unifyWidth + textPadding, textY);
}

// ---------------------------------------------------------------------------
// Main Component - Style DALL-E 3
// ---------------------------------------------------------------------------

export function AiEditorDalle3View() {
  const {
    user,
    setEditorTab,
    isGenerating,
    setIsGenerating,
    addGeneration,
    setAuth,
    setCurrentView,
    selectedModel,
    setSelectedModel,
    currentConversation,
    setCurrentConversation,
    addConversation,
    conversations,
    setConversations,
  } = useAppStore();

  const { toast } = useToast();
  const { t } = useTranslation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mode, setMode] = useState("text-to-image");
  const [prompt, setPrompt] = useState("");
  const [lastResult, setLastResult] = useState<ResultPayload | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  
  // Options
  const [style, setStyle] = useState("naturel");
  const [quality, setQuality] = useState("standard");
  const [size, setSize] = useState("1024x1024");
  
  const { attachedFiles, handleFilesSelected, handleRemoveFile, clearFiles } = useFileAttachments();

  const activeModeConfig = useMemo(() => MODES.find((m) => m.key === mode), [mode]);
  const currentCredits = activeModeConfig?.credits || 3;

  const hasSourceFile = useMemo(() => {
    if (attachedFiles.length === 0) return false;
    return attachedFiles[0].type.startsWith("image/");
  }, [attachedFiles]);

  const requiresSourceFile = useMemo(
    () => ["image-to-image", "image-to-text"].includes(mode),
    [mode]
  );

  const canGenerate = useMemo(
    () =>
      prompt.trim().length > 0 &&
      !isGenerating &&
      (user?.role === "admin" || (user?.credits ?? 0) >= currentCredits) &&
      (!requiresSourceFile || hasSourceFile),
    [prompt, isGenerating, user, currentCredits, requiresSourceFile, hasSourceFile]
  );

  const generateButtonLabel = useMemo(() => {
    switch (mode) {
      case "text-to-image":
        return "Générer";
      case "image-to-image":
        return "Transformer";
      case "image-to-text":
        return "Analyser";
      default:
        return "Générer";
    }
  }, [mode]);

  const readFileAsDataUrl = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Impossible de lire le fichier source."));
        }
      };
      reader.onerror = () => reject(reader.error ?? new Error("Erreur de lecture du fichier."));
      reader.readAsDataURL(file);
    });
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!user || !canGenerate) return;

    setIsGenerating(true);
    setLastResult(null);
    setStreamingContent("");

    try {
      const endpoint = API_ENDPOINTS[mode];
      const options: any = { style, quality, size };

      if (attachedFiles.length > 0) {
        const sourceFile = attachedFiles[0];
        if (sourceFile.type.startsWith("image/")) {
          options.sourceImage = await readFileAsDataUrl(sourceFile.file);
        }
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          prompt: prompt.trim(),
          options,
          model: selectedModel,
          subtype: mode,
          conversationId: currentConversation?.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          notifyInsufficientCredits();
          setIsGenerating(false);
          return;
        }
        if ([502, 503, 504].includes(res.status)) {
          notifyConnectionFailure(undefined, data.error || res.statusText);
          setIsGenerating(false);
          return;
        }
        notifyGenerationFailure(data.error || "Erreur de génération");
        setIsGenerating(false);
        return;
      }

      const trimmedPrompt = prompt.trim();

      addGeneration(data.generation);
      setAuth({ ...user, credits: data.credits });

      setLastResult({
        type: data.generation.type,
        subtype: mode,
        result: data.generation.result,
      });

      setPrompt("");
      clearFiles();

      toast({
        title: "Génération terminée !",
        description: `Votre image a été générée avec succès.`,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erreur inattendue lors de la génération";
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setStreamingContent("");
    }
  }, [user, canGenerate, mode, prompt, style, quality, size, selectedModel, currentConversation, setIsGenerating, addGeneration, setAuth, toast, attachedFiles, readFileAsDataUrl, clearFiles]);

  const handleRegenerate = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  const handleNew = useCallback(() => {
    setPrompt("");
    setLastResult(null);
    setStreamingContent("");
  }, []);

  const handleNewConversation = useCallback(async () => {
    if (!user) return;

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          title: `Nouvelle conversation ${new Date().toLocaleDateString("fr-FR")}`,
          model: selectedModel,
          type: "image",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        addConversation(data.conversation);
        setCurrentConversation(data.conversation);
        setPrompt("");
        setLastResult(null);
      }
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  }, [user, selectedModel, addConversation, setCurrentConversation]);

  const handleSelectConversation = useCallback(async (conversation: Conversation) => {
    setCurrentConversation(conversation);
    setSelectedModel(conversation.model);

    try {
      const res = await fetch(`/api/conversations/${conversation.id}`);
      const data = await res.json();
      if (res.ok) {
        // Load messages if needed
      }
    } catch (error) {
      console.error("Failed to load conversation:", error);
    }
  }, [setCurrentConversation, setSelectedModel]);

  const getModelName = (modelId: string) => {
    const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
    return model?.name || modelId;
  };

  const handleFilesSelectedWrapper = useCallback(
    (files: FileList | File[]) => {
      const result = handleFilesSelected(files);
      if (result && !result.success) {
        toast({
          title: "Erreur",
          description: result.message || "Impossible d'ajouter les fichiers.",
          variant: "destructive",
        });
      } else if (result && result.success && result.count) {
        toast({
          title: "Fichier ajouté",
          description: `${result.count} fichier ajouté avec succès.`,
        });
      }
    },
    [handleFilesSelected, toast]
  );

  const getAcceptString = "image/jpeg,image/png,image/webp,image/gif";

  const renderOutput = () => {
    if (isGenerating) {
      return <GeneratingAnimation mode={mode} streamingContent={streamingContent} />;
    }

    if (lastResult && lastResult.type === "image" && lastResult.result) {
      return (
        <ImageResult
          result={lastResult.result}
          onRegenerate={handleRegenerate}
          onNew={handleNew}
        />
      );
    }

    if (lastResult && lastResult.type === "text" && lastResult.result) {
      return (
        <TextResult
          result={lastResult.result}
          onRegenerate={handleRegenerate}
          onNew={handleNew}
        />
      );
    }

    return <EmptyState mode={mode} />;
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-background relative overflow-hidden">
      {/* Animated Background */}
      <AnimatedBackground />
      
      {/* Conversation Sidebar */}
      <ConversationSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
      />

      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 shrink-0 relative z-10">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
            className={`rounded-xl ${sidebarOpen ? "bg-white/10" : ""}`}
          >
            {sidebarOpen ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentView("dashboard")}
            aria-label="Retour au tableau de bord"
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {currentConversation && (
            <Badge variant="outline" className="rounded-xl text-xs px-3 py-1.5 bg-white/5 border-white/10">
              <MessageSquare className="w-3 h-3 mr-1" />
              {currentConversation.title}
            </Badge>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 rounded-xl max-w-[180px] bg-white/5 border-white/10">
                <Sparkles className="w-4 h-4 text-gold" />
                <span className="truncate">{getModelName(selectedModel)}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[250px] rounded-xl bg-card/90 backdrop-blur-xl border-white/10">
              {AVAILABLE_MODELS.map((model) => (
                <DropdownMenuItem
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={selectedModel === model.id ? "bg-white/10 rounded-lg" : ""}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{model.name}</span>
                    <span className="text-xs text-muted-foreground">{model.description}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
            <Coins className="w-4 h-4 text-gold" />
            <span className="text-sm font-medium">{user?.credits ?? 0}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-4xl mx-auto py-6">
          {/* Mode Selection */}
          <div className="mb-6">
            <ModeSelector
              modes={MODES}
              activeMode={mode}
              onSelect={setMode}
            />
          </div>

          {/* Style Options */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <StyleSelector
              style={style}
              setStyle={setStyle}
              quality={quality}
              setQuality={setQuality}
              size={size}
              setSize={setSize}
            />
          </motion.div>

          {/* Result Area */}
          <div className="mb-6">
            <AnimatePresence mode="wait">{renderOutput()}</AnimatePresence>
          </div>

          {/* Input Area - Style DALL-E 3 */}
          <GlassCard variant="input" className="p-0 overflow-hidden">
            {attachedFiles.length > 0 && (
              <div className="p-4 border-b border-white/10">
                <div className="flex flex-wrap gap-3">
                  {attachedFiles.map((file) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-3 px-3 py-2.5 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 max-w-[320px]"
                    >
                      <div className="w-14 h-14 rounded-lg bg-white/5 overflow-hidden flex items-center justify-center shrink-0 border border-white/10">
                        <img
                          src={file.url}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-xs font-medium truncate text-foreground">{file.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 rounded-lg hover:bg-white/10"
                        onClick={() => handleRemoveFile(file.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4">
              <Textarea
                value={prompt}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_CHARS) {
                    setPrompt(e.target.value);
                  }
                }}
                placeholder={PLACEHOLDERS[mode] || "Décrivez ce que vous souhaitez créer..."}
                className="min-h-[120px] bg-transparent border-0 resize-none focus:ring-0 text-foreground text-base p-0 placeholder:text-muted-foreground/50"
                disabled={isGenerating}
              />
            </div>

            <div className="flex items-center justify-between px-4 pb-4">
              <div className="flex items-center gap-2">
                {attachedFiles.length < MAX_FILES && requiresSourceFile && (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept={getAcceptString}
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleFilesSelectedWrapper(e.target.files);
                        }
                      }}
                      className="hidden"
                      disabled={isGenerating}
                    />
                    <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors border border-white/10">
                      <Paperclip className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </label>
                )}
                <span className="text-xs text-muted-foreground">
                  {prompt.length} / {MAX_CHARS}
                </span>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleGenerate}
                disabled={!canGenerate}
                className={`
                  flex items-center gap-2.5 px-6 py-3 rounded-xl font-semibold
                  shadow-lg transition-all duration-300
                  ${
                    canGenerate
                      ? "bg-gradient-to-r from-violet-600 via-purple-500 to-violet-600 text-white shadow-violet-500/30 shadow-xl hover:shadow-2xl"
                      : 'bg-white/5 text-muted-foreground cursor-not-allowed border border-white/10'
                  }
                `}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Génération...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>{generateButtonLabel}</span>
                  </>
                )}
              </motion.button>
            </div>

            {user?.role !== "admin" && (user?.credits ?? 0) < currentCredits && (
              <div className="px-4 pb-4">
                <div className="flex items-center gap-2 text-xs text-destructive">
                  <Coins className="w-3 h-3" />
                  <span>Crédits insuffisants pour cette action</span>
                </div>
              </div>
            )}
            {requiresSourceFile && !hasSourceFile && (
              <div className="px-4 pb-4">
                <div className="flex items-center gap-2 text-xs text-amber-600">
                  <Paperclip className="w-3 h-3" />
                  <span>Ajoutez une image source pour cette action.</span>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

// Import missing components
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";