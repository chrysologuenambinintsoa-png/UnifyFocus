"use client";
import { useTranslation } from "@/lib/i18n";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  FileText,
  ImageIcon,
  Video,
  Coins,
  Inbox,
  Clock,
  TrendingUp,
  Activity,
  Camera,
  Type,
  Film,
  Upload,
  ArrowRight,
  Zap,
  Layers,
  Wand2,
  Code,
  MessageSquare,
} from "lucide-react";

import { useAppStore, type Generation } from "@/store/app-store";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/* ─── Animation Variants ───────────────────────────────────────────── */

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
};

/* ─── Helpers ──────────────────────────────────────────────────────── */

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  if (diffHr < 24) return `il y a ${diffHr} h`;
  return `il y a ${diffDay} j`;
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + "…";
}

function getTypeConfig(type: Generation["type"]): {
  label: string;
  Icon: typeof FileText;
  color: string;
  bg: string;
  gradient: string;
} {
  switch (type) {
    case "text":
      return {
        label: "Texte",
        Icon: FileText,
        color: "text-blue-500",
        bg: "bg-blue-500/10 border-blue-500/30",
        gradient: "from-blue-500/20 to-blue-600/5",
      };
    case "image":
      return {
        label: "Image",
        Icon: ImageIcon,
        color: "text-purple-500",
        bg: "bg-purple-500/10 border-purple-500/30",
        gradient: "from-purple-500/20 to-purple-600/5",
      };
    case "video":
      return {
        label: "Vidéo",
        Icon: Video,
        color: "text-rose-500",
        bg: "bg-rose-500/10 border-rose-500/30",
        gradient: "from-rose-500/20 to-rose-600/5",
      };
    case "code":
      return {
        label: "Code",
        Icon: Zap,
        color: "text-sky-500",
        bg: "bg-sky-500/10 border-sky-500/30",
        gradient: "from-sky-500/20 to-sky-600/5",
      };
    default:
      return {
        label: "Texte",
        Icon: FileText,
        color: "text-blue-500",
        bg: "bg-blue-500/10 border-blue-500/30",
        gradient: "from-blue-500/20 to-blue-600/5",
      };
  }
}

function getStatusConfig(status: Generation["status"]): {
  label: string;
  className: string;
} {
  switch (status) {
    case "completed":
      return { label: "Terminé", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" };
    case "pending":
      return { label: "En cours", className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" };
    case "failed":
      return { label: "Échoué", className: "bg-red-500/15 text-red-600 border-red-500/30" };
  }
}

/* ─── Feature Cards Data ───────────────────────────────────────────── */

const TEXT_FEATURES = [
  {
    id: "text-generation",
    label: "Texte",
    description: "Génération de contenu texte",
    icon: Type,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    credits: 1,
  },
];

const IMAGE_FEATURES = [
  {
    id: "text-to-image",
    label: "Texte → Image",
    description: "Créez des images depuis du texte",
    icon: Wand2,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    credits: 3,
  },
  {
    id: "image-to-image",
    label: "Image → Image",
    description: "Transformez vos images",
    icon: Camera,
    color: "text-purple-600",
    bgColor: "bg-purple-600/10",
    credits: 3,
  },
  {
    id: "image-to-text",
    label: "Image → Texte",
    description: "Extrayez du texte d'images",
    icon: Type,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
    credits: 2,
  },
];

const VIDEO_FEATURES = [
  {
    id: "text-to-video",
    label: "Texte → Vidéo",
    description: "Générez des vidéos depuis du texte",
    icon: Film,
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
    credits: 5,
  },
  {
    id: "video-to-video",
    label: "Vidéo → Vidéo",
    description: "Transformez vos vidéos",
    icon: Video,
    color: "text-rose-600",
    bgColor: "bg-rose-600/10",
    credits: 5,
  },
  {
    id: "video-to-text",
    label: "Vidéo → Texte",
    description: "Transcription de vidéos",
    icon: FileText,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    credits: 4,
  },
];

const CODE_FEATURES = [
  {
    id: "code-generation",
    label: "Génération de codes",
    description: "Générez du code source",
    icon: Code,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    credits: 2,
  },
];

const CHAT_FEATURES = [
  {
    id: "chat",
    label: "Chat IA",
    description: "Discutez avec l'IA",
    icon: MessageSquare,
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
    credits: 1,
  },
];

/* ─── Feature Category Component ───────────────────────────────────── */

interface FeatureCardProps {
  feature: {
    id: string;
    label: string;
    description: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    credits: number;
  };
  onClick: () => void;
}

function FeatureCard({ feature, onClick }: FeatureCardProps) {
  const Icon = feature.icon;
  
  return (
    <motion.button
      onClick={onClick}
      className="group relative flex flex-col items-start gap-3 p-4 rounded-xl border border-border bg-card hover:border-gold/30 transition-all duration-300 text-left"
      whileHover={{ y: -2, boxShadow: "0 8px 30px oklch(0.78 0.155 75 / 10%)" }}
      whileTap={{ scale: 0.98 }}
    >
      <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${feature.bgColor} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      <div className="relative flex items-center gap-3 w-full">
        <div className={`flex size-10 items-center justify-center rounded-lg ${feature.bgColor} group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`size-5 ${feature.color}`} />
        </div>
        <ArrowRight className="ml-auto size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300 -translate-x-2 group-hover:translate-x-0" />
      </div>
      <div className="relative">
        <h4 className="font-semibold text-sm">{feature.label}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">{feature.description}</p>
        <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
          <Coins className="size-3 text-gold" />
          <span>{feature.credits} crédit{feature.credits > 1 ? "s" : ""}</span>
        </div>
      </div>
    </motion.button>
  );
}

/* ─── Component ────────────────────────────────────────────────────── */

export function DashboardView() {
  const user = useAppStore((s) => s.user);
  const isAdmin = user?.role === "admin";
  const generations = useAppStore((s) => s.generations);
  const setGenerations = useAppStore((s) => s.setGenerations);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setEditorTab = useAppStore((s) => s.setEditorTab);
  const { t } = useTranslation();

  /* ── Fetch generations on mount ───────────────────────────────── */
  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    let cancelled = false;

    async function fetchGenerations() {
      try {
        const res = await fetch(
          `/api/user/generations?userId=${encodeURIComponent(userId)}`
        );
        if (!res.ok) return;
        const data: { generations: Generation[] } = await res.json();
        if (!cancelled) {
          setGenerations(data.generations);
        }
      } catch {
        // Silently fail – generations will remain empty
      }
    }

    fetchGenerations();

    return () => {
      cancelled = true;
    };
  }, [user, setGenerations]);

  /* ── Computed stats ───────────────────────────────────────────── */
  const textCount = useMemo(
    () => generations.filter((g) => g.type === "text").length,
    [generations]
  );
  const imageCount = useMemo(
    () => generations.filter((g) => g.type === "image").length,
    [generations]
  );
  const videoCount = useMemo(
    () => generations.filter((g) => g.type === "video").length,
    [generations]
  );
  const audioCount = useMemo(
    () => generations.filter((g) => g.type === "audio").length,
    [generations]
  );

  // Generate chart data from generations
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date;
    });

    return last7Days.map((date) => {
      const dateStr = date.toLocaleDateString("fr-FR", { weekday: "short" });
      const dayGenerations = generations.filter((g) => {
        const genDate = new Date(g.createdAt);
        return genDate.toDateString() === date.toDateString();
      });
      return {
        name: dateStr,
        generations: dayGenerations.length,
        credits: dayGenerations.reduce((sum, g) => sum + g.credits, 0),
      };
    });
  }, [generations]);

  // Type distribution data
  const typeDistribution = useMemo(() => [
    { name: "Texte", value: textCount, color: "#3b82f6" },
    { name: "Musique", value: audioCount, color: "#22c55e" },
    { name: "Image", value: imageCount, color: "#a855f7" },
    { name: "Vidéo", value: videoCount, color: "#f43f5e" },
  ].filter(d => d.value > 0), [textCount, audioCount, imageCount, videoCount]);

  /* ── Handlers ─────────────────────────────────────────────────── */
  function handleNavigateToEditor(type: "text" | "image" | "video") {
    setEditorTab(type);
    setCurrentView("editor");
  }

  function handleFeatureClick(featureId: string, type: "text" | "image" | "video") {
    setEditorTab(type);
    setCurrentView("editor");
    // Store the specific feature mode if needed
    localStorage.setItem('selectedFeature', featureId);
  }

  function handleChatClick() {
    setCurrentView("chat");
  }



  /* ── Early guard (shouldn't normally render without user) ─────── */
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Hero Section ────────────────────────────────────────── */}
      <motion.section 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl mx-4 mt-4 mb-6"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-purple-500/5 to-blue-500/10" />
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="relative px-6 py-8 sm:px-10 sm:py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <motion.h1 
                className="text-2xl sm:text-3xl font-bold tracking-tight"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                Bienvenue sur{" "}
                <span className="gradient-text">UnifyFocus</span>
              </motion.h1>
              <motion.p 
                className="text-muted-foreground mt-2 max-w-lg"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                Créez du contenu professionnel avec l'IA générative. Texte, images et vidéos en quelques clics.
              </motion.p>
            </div>
            {!isAdmin && (
              <motion.div 
                className="flex items-center gap-4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-4 py-2 border border-border/50">
                  <Coins className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Crédits</p>
                    <p className="text-sm font-semibold text-foreground tabular-nums">{user.credits}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.section>

      {/* ─── Main Content ────────────────────────────────────────── */}
      <main className="px-4 pb-8">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-7xl space-y-8"
        >
          {/* ─── Quick Stats Row ─────────────────────────────────── */}
          <motion.section variants={fadeInUp} transition={{ duration: 0.45 }}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Total generations */}
              <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-gold/10">
                      <Sparkles className="size-5 text-gold" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{generations.length}</p>
                      <p className="text-xs text-muted-foreground">Total générations</p>
                    </div>
                  </div>
                </CardContent>
                <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-transparent" />
              </Card>

              {/* Text generations */}
              <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10">
                      <FileText className="size-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{textCount}</p>
                      <p className="text-xs text-muted-foreground">Textes générés</p>
                    </div>
                  </div>
                </CardContent>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
              </Card>

              {/* Image generations */}
              <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-purple-500/10">
                      <ImageIcon className="size-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{imageCount}</p>
                      <p className="text-xs text-muted-foreground">Images créées</p>
                    </div>
                  </div>
                </CardContent>
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent" />
              </Card>

              {/* Video generations */}
              <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-rose-500/10">
                      <Video className="size-5 text-rose-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{videoCount}</p>
                      <p className="text-xs text-muted-foreground">Vidéos produites</p>
                    </div>
                  </div>
                </CardContent>
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent" />
              </Card>
            </div>
          </motion.section>

          {/* ─── Generation Categories ───────────────────────────── */}
          <motion.section variants={fadeInUp} transition={{ duration: 0.45, delay: 0.1 }}>
            <div className="mb-4 flex items-center gap-2">
              <Layers className="size-5 text-gold" />
              <h2 className="text-lg font-semibold">Outils de génération</h2>
            </div>
            
            <div className="space-y-6">
              {/* Text Generation Features */}
              <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-5">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10">
                    <FileText className="size-4 text-blue-500" />
                  </div>
                  <h3 className="font-medium">Génération de texte</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {TEXT_FEATURES.map((feature) => (
                    <FeatureCard 
                      key={feature.id} 
                      feature={feature} 
                      onClick={() => handleFeatureClick(feature.id, "text")}
                    />
                  ))}
                </div>
              </div>

              {/* Image Generation Features */}
              <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-5">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-purple-500/10">
                    <ImageIcon className="size-4 text-purple-500" />
                  </div>
                  <h3 className="font-medium">Génération d'images</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {IMAGE_FEATURES.map((feature) => (
                    <FeatureCard 
                      key={feature.id} 
                      feature={feature} 
                      onClick={() => handleFeatureClick(feature.id, "image")}
                    />
                  ))}
                </div>
              </div>

              {/* Video Generation Features */}
              <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-5">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-rose-500/10">
                    <Video className="size-4 text-rose-500" />
                  </div>
                  <h3 className="font-medium">Génération de vidéos</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {VIDEO_FEATURES.map((feature) => (
                    <FeatureCard 
                      key={feature.id} 
                      feature={feature} 
                      onClick={() => handleFeatureClick(feature.id, "video")}
                    />
                  ))}
                </div>
              </div>

              {/* Code Generation Features */}
              <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-5">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-green-500/10">
                    <Code className="size-4 text-green-500" />
                  </div>
                  <h3 className="font-medium">Génération de codes</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {CODE_FEATURES.map((feature) => (
                    <FeatureCard 
                      key={feature.id} 
                      feature={feature} 
                      onClick={() => handleFeatureClick(feature.id, "text")}
                    />
                  ))}
                </div>
              </div>

              {/* Chat IA Features */}
              <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-5">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10">
                    <MessageSquare className="size-4 text-violet-500" />
                  </div>
                  <h3 className="font-medium">Chat IA</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {CHAT_FEATURES.map((feature) => (
                    <FeatureCard 
                      key={feature.id} 
                      feature={feature} 
                      onClick={handleChatClick}
                    />
                  ))}
                </div>
              </div>

            </div>
          </motion.section>

          <Separator />

          {/* ─── Charts Section ─────────────────────────────────── */}
          {generations.length > 0 && (
            <motion.section variants={fadeInUp} transition={{ duration: 0.45, delay: 0.15 }}>
              <div className="mb-4 flex items-center gap-2">
                <Activity className="size-5 text-gold" />
                <h2 className="text-lg font-semibold">Statistiques</h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Activity Chart */}
                <motion.div 
                  className="rounded-xl border border-border bg-card p-5"
                  whileHover={{ y: -2, boxShadow: "0 8px 30px oklch(0.78 0.155 75 / 10%)" }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-gold/10">
                      <Activity className="size-4 text-gold" />
                    </div>
                    <div>
                      <h3 className="font-medium">Activité (7 jours)</h3>
                      <p className="text-xs text-muted-foreground">Générations par jour</p>
                    </div>
                  </div>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorGenerations" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="oklch(0.78 0.155 75)" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="oklch(0.78 0.155 75)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.7 0.02 50 / 10%)" vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          stroke="oklch(0.5 0.01 50)" 
                          fontSize={12} 
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            background: "var(--card)", 
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                            fontSize: "12px"
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="generations" 
                          stroke="oklch(0.78 0.155 75)" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorGenerations)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                {/* Type Distribution */}
                <motion.div 
                  className="rounded-xl border border-border bg-card p-5"
                  whileHover={{ y: -2, boxShadow: "0 8px 30px oklch(0.78 0.155 75 / 10%)" }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-gold/10">
                      <TrendingUp className="size-4 text-gold" />
                    </div>
                    <div>
                      <h3 className="font-medium">Répartition</h3>
                      <p className="text-xs text-muted-foreground">Par type de contenu</p>
                    </div>
                  </div>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={typeDistribution} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          stroke="oklch(0.5 0.01 50)" 
                          fontSize={12} 
                          tickLine={false}
                          axisLine={false}
                          width={60}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            background: "var(--card)", 
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                            fontSize: "12px"
                          }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {typeDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              </div>
            </motion.section>
          )}

          <Separator />

          {/* ─── Recent Generations ─────────────────────────────── */}
          <motion.section variants={fadeInUp} transition={{ duration: 0.45, delay: 0.2 }}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="size-5 text-gold" />
                <h2 className="text-lg font-semibold">Générations récentes</h2>
              </div>
              {generations.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {generations.length} élément{generations.length > 1 ? "s" : ""}
                </Badge>
              )}
            </div>

            {generations.length === 0 ? (
              <motion.div
                variants={fadeIn}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/30 p-12"
              >
                <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
                  <Inbox className="size-8 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">Aucune génération</h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-sm text-center">
                  Commencez à créer du contenu en sélectionnant un outil ci-dessus.
                </p>
                <Button 
                  className="mt-4"
                  onClick={() => handleNavigateToEditor("text")}
                >
                  <Zap className="size-4 mr-2" />
                  Première création
                </Button>
              </motion.div>
            ) : (
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-3 pr-4">
                  {generations.slice(0, 10).map((gen, idx) => (
                    <GenerationCard key={gen.id} generation={gen} index={idx} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </motion.section>
        </motion.div>
      </main>
    </div>
  );
}

/* ─── Generation Card ─────────────────────────────────────────────── */

function GenerationCard({
  generation: gen,
  index,
}: {
  generation: Generation;
  index: number;
}) {
  const user = useAppStore((s) => s.user);
  const isAdmin = user?.role === "admin";
  const { t } = useTranslation();
  const typeConfig = getTypeConfig(gen.type);
  const statusConfig = getStatusConfig(gen.status);
  const TypeIcon = typeConfig.Icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all duration-300 hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5"
    >
      {/* Type badge */}
      <div className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${typeConfig.bg} ${typeConfig.color}`}>
        <TypeIcon className="size-4" />
        {typeConfig.label}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium line-clamp-1">
          {truncate(gen.prompt, 60)}
        </p>
        
        {/* Preview */}
        {gen.type === "text" && gen.result && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
            {truncate(gen.result, 80)}
          </p>
        )}
        
        {gen.type === "image" && gen.result && (
          <div className="mt-2 flex items-center gap-2">
            <div className="size-8 rounded overflow-hidden border border-border">
              <img src={gen.result} alt="" className="size-full object-cover" />
            </div>
            <span className="text-xs text-muted-foreground">Image générée</span>
          </div>
        )}
        
        {gen.type === "video" && gen.result && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded bg-rose-500/10">
              <Video className="size-4 text-rose-500" />
            </div>
            <span className="text-xs text-muted-foreground">Vidéo générée</span>
          </div>
        )}
      </div>

      {/* Meta */}
        <div className="flex items-center gap-3 shrink-0">
        {!isAdmin && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Coins className="size-3" />
            {gen.credits}
          </div>
        )}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3" />
          {getRelativeTime(gen.createdAt)}
        </div>
        
        {/* Status */}
        <Badge
          variant="outline"
          className={`text-[10px] font-medium ${statusConfig.className}`}
        >
          {statusConfig.label}
        </Badge>
      </div>
    </motion.div>
  );
}