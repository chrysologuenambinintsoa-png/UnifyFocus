"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Coins,
  TrendingUp,
  Calendar,
  Clock,
  FileText,
  ImageIcon,
  Video,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  PieChart,
  BarChart3,
  Inbox,
  Crown,
  Check,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { useAppStore, type Generation } from "@/store/app-store";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  PieChart as RechartsPieChart,
  Pie,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { acquireCheckout, isCheckoutPending, releaseCheckout } from '@/lib/checkoutLock';
import { useTranslation } from "@/lib/i18n";

/* ─── Animation Variants ───────────────────────────────────────────── */

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

/* ─── Helpers ──────────────────────────────────────────────────────── */

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

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
  if (diffDay < 30) return `il y a ${diffDay} j`;
  return formatDate(dateStr);
}

function getTypeConfig(type: Generation["type"]): {
  label: string;
  Icon: typeof FileText;
  color: string;
  bg: string;
} {
  switch (type) {
    case "text":
      return {
        label: "Texte",
        Icon: FileText,
        color: "text-blue-500",
        bg: "bg-blue-500/10",
      };
    case "image":
      return {
        label: "Image",
        Icon: ImageIcon,
        color: "text-purple-500",
        bg: "bg-purple-500/10",
      };
    case "video":
      return {
        label: "Vidéo",
        Icon: Video,
        color: "text-rose-500",
        bg: "bg-rose-500/10",
      };
    case "code":
      return {
        label: "Code",
        Icon: Zap,
        color: "text-sky-500",
        bg: "bg-sky-500/10",
      };
    default:
      return {
        label: "Texte",
        Icon: FileText,
        color: "text-blue-500",
        bg: "bg-blue-500/10",
      };
  }
}

/* ─── Sub-Components ───────────────────────────────────────────────── */

interface UsageStatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function UsageStatCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor,
  iconBg,
  trend,
}: UsageStatCardProps) {
  return (
    <motion.div
      variants={fadeInUp}
      whileHover={{ y: -2, boxShadow: "0 8px 30px oklch(0.78 0.155 75 / 10%)" }}
      transition={{ duration: 0.2 }}
    >
      <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-3xl font-bold tracking-tight">{value}</p>
              {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
              {trend && (
                <div className={`flex items-center gap-1 text-xs ${trend.isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                  {trend.isPositive ? (
                    <ArrowUpRight className="size-3" />
                  ) : (
                    <ArrowDownRight className="size-3" />
                  )}
                  <span>{Math.abs(trend.value)}% vs mois dernier</span>
                </div>
              )}
            </div>
            <div className={`flex size-12 items-center justify-center rounded-xl ${iconBg}`}>
              <Icon className={`size-6 ${iconColor}`} />
            </div>
          </div>
        </CardContent>
        <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-transparent" />
      </Card>
    </motion.div>
  );
}

interface UsageHistoryItemProps {
  generation: Generation;
}

function UsageHistoryItem({ generation }: UsageHistoryItemProps) {
  const typeConfig = getTypeConfig(generation.type);
  const TypeIcon = typeConfig.Icon;

  return (
    <motion.div
      className="flex items-center gap-4 rounded-lg border border-border/50 bg-card/30 p-3 transition-colors hover:bg-accent/50"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className={`flex size-10 items-center justify-center rounded-lg ${typeConfig.bg}`}>
        <TypeIcon className={`size-4 ${typeConfig.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{generation.prompt}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-[10px] h-5">
            {typeConfig.label}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {getRelativeTime(generation.createdAt)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Coins className="size-3 text-gold" />
        <span className="font-medium">{generation.credits}</span>
      </div>
    </motion.div>
  );
}

/* ─── Main Component ───────────────────────────────────────────────── */

export function UsageView() {
  const user = useAppStore((s) => s.user);
  const setAuth = useAppStore((s) => s.setAuth);
  const generations = useAppStore((s) => s.generations);
  const setGenerations = useAppStore((s) => s.setGenerations);
  const { t } = useTranslation();
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState<"7days" | "30days" | "90days">("30days");
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<"free" | "pro" | "enterprise" | null>(null);
  const pendingCheckoutRef = useRef<string | null>(null);

  // Fetch generations on mount
  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    async function fetchGenerations() {
      try {
        const res = await fetch(
          `/api/user/generations?userId=${encodeURIComponent(userId)}`
        );
        if (!res.ok) return;
        const data: { generations: Generation[] } = await res.json();
        setGenerations(data.generations);
      } catch {
        // Silently fail
      }
    }

    fetchGenerations();
  }, [user, setGenerations]);

  // Filter generations by time range
  const filteredGenerations = useMemo(() => {
    const now = new Date();
    const days = timeRange === "7days" ? 7 : timeRange === "30days" ? 30 : 90;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return generations.filter((g) => new Date(g.createdAt) >= cutoff);
  }, [generations, timeRange]);

  // Compute stats
  const stats = useMemo(() => {
    const totalGenerations = filteredGenerations.length;
    const totalCredits = filteredGenerations.reduce((sum, g) => sum + g.credits, 0);
    const textCount = filteredGenerations.filter((g) => g.type === "text").length;
    const imageCount = filteredGenerations.filter((g) => g.type === "image").length;
    const videoCount = filteredGenerations.filter((g) => g.type === "video").length;
    const codeCount = filteredGenerations.filter((g) => g.type === "code").length;
    const completedCount = filteredGenerations.filter((g) => g.status === "completed").length;
    const successRate = totalGenerations > 0 ? Math.round((completedCount / totalGenerations) * 100) : 0;

    return {
      totalGenerations,
      totalCredits,
      textCount,
      imageCount,
      videoCount,
      codeCount,
      successRate,
    };
  }, [filteredGenerations]);

  // Chart data - daily activity
  const chartData = useMemo(() => {
    const days = timeRange === "7days" ? 7 : timeRange === "30days" ? 30 : 90;
    const dates = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      return date;
    });

    return dates.map((date) => {
      const dateStr = date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
      const dayGenerations = filteredGenerations.filter((g) => {
        const genDate = new Date(g.createdAt);
        return genDate.toDateString() === date.toDateString();
      });
      return {
        name: dateStr,
        generations: dayGenerations.length,
        credits: dayGenerations.reduce((sum, g) => sum + g.credits, 0),
        text: dayGenerations.filter((g) => g.type === "text").length,
        image: dayGenerations.filter((g) => g.type === "image").length,
        video: dayGenerations.filter((g) => g.type === "video").length,
      };
    });
  }, [filteredGenerations, timeRange]);

  // Type distribution data
  const typeDistribution = useMemo(() => [
    { name: "Texte", value: stats.textCount, color: "#3b82f6" },
    { name: "Image", value: stats.imageCount, color: "#a855f7" },
    { name: "Vidéo", value: stats.videoCount, color: "#f43f5e" },
    { name: "Code", value: stats.codeCount, color: "#06b6d4" },
  ].filter(d => d.value > 0), [stats]);

  // Daily average
  const dailyAverage = useMemo(() => {
    const days = timeRange === "7days" ? 7 : timeRange === "30days" ? 30 : 90;
    return stats.totalGenerations > 0 ? (stats.totalGenerations / days).toFixed(1) : "0";
  }, [stats.totalGenerations, timeRange]);

  // Available plans for upgrade
  const availablePlans = useMemo(() => [
    {
      id: "free",
      name: "Gratuit",
      price: "Gratuit",
      credits: 100,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30",
      features: ["100 crédits/mois", "Générations standard", "Support communautaire"],
      popular: false,
    },
    {
      id: "pro",
      name: "Pro",
      price: "29€",
      credits: 1000,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/30",
      features: ["1000 crédits/mois", "Générations prioritaires", "Support prioritaire", "API access"],
      popular: true,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: "99€",
      credits: 5000,
      color: "text-gold",
      bgColor: "bg-gold/10",
      borderColor: "border-gold/30",
      features: ["5000 crédits/mois", "Générations illimitées", "Support 24/7", "API access", "Custom models"],
      popular: false,
    },
  ], []);

  // Plan configuration
  const planConfig = useMemo(() => {
    if (!user) return {
      name: "Gratuit",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30",
      credits: 100,
      price: "Gratuit",
      features: ["100 crédits/mois", "Générations standard", "Support communautaire"],
    };
    switch (user.plan) {
      case "pro":
        return {
          name: "Pro",
          color: "text-purple-500",
          bgColor: "bg-purple-500/10",
          borderColor: "border-purple-500/30",
          credits: 1000,
          price: "29€",
          features: ["1000 crédits/mois", "Générations prioritaires", "Support prioritaire", "API access"],
        };
      case "enterprise":
        return {
          name: "Enterprise",
          color: "text-gold",
          bgColor: "bg-gold/10",
          borderColor: "border-gold/30",
          credits: 5000,
          price: "99€",
          features: ["5000 crédits/mois", "Générations illimitées", "Support 24/7", "API access", "Custom models"],
        };
      default:
        return {
          name: "Gratuit",
          color: "text-blue-500",
          bgColor: "bg-blue-500/10",
          borderColor: "border-blue-500/30",
          credits: 100,
          price: "Gratuit",
          features: ["100 crédits/mois", "Générations standard", "Support communautaire"],
        };
    }
  }, [user?.plan]);

  // Calculate usage percentage
  const usagePercentage = useMemo(() => {
    if (!user) return 0;
    return Math.min(100, Math.round((stats.totalCredits / planConfig.credits) * 100));
  }, [stats.totalCredits, planConfig.credits, user]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Header ────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl mx-4 mt-4 mb-6"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-purple-500/5 to-blue-500/10" />
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="relative px-6 py-8 sm:px-10 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <motion.h1
                className="text-2xl sm:text-3xl font-bold tracking-tight"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                Utilisation
              </motion.h1>
              <motion.p
                className="text-muted-foreground mt-2 max-w-lg"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                Suivez votre consommation de crédits et vos générations.
              </motion.p>
            </div>
            <motion.div
              className="flex items-center gap-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center gap-3 rounded-xl border border-gold/20 bg-gold/5 px-5 py-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-gold/20">
                  <Coins className="size-5 text-gold" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Crédits disponibles</p>
                  <p className="text-xl font-bold text-gold">{user.credits}</p>
                </div>
              </div>
              <Select
                value={timeRange}
                onValueChange={(v) => setTimeRange(v as typeof timeRange)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">7 jours</SelectItem>
                  <SelectItem value="30days">30 jours</SelectItem>
                  <SelectItem value="90days">90 jours</SelectItem>
                </SelectContent>
              </Select>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* ─── Main Content ──────────────────────────────────────────── */}
      <main className="px-4 pb-8">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-7xl space-y-6"
        >
          {/* ─── Subscription Plan Card ────────────────────────────── */}
          <motion.section variants={fadeInUp} transition={{ duration: 0.45 }}>
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`flex size-8 items-center justify-center rounded-lg ${planConfig.bgColor}`}>
                      <Crown className={`size-4 ${planConfig.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Plan {planConfig.name}</CardTitle>
                      <CardDescription>{planConfig.price}/mois</CardDescription>
                    </div>
                  </div>
                  {user.plan !== "enterprise" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => setUpgradeDialogOpen(true)}
                    >
                      <Sparkles className="size-4" />
                      Changer de plan
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Usage Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Crédits utilisés</span>
                    <span className="font-medium">{stats.totalCredits} / {planConfig.credits}</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${usagePercentage > 80 ? 'bg-rose-500' : 'bg-gold'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${usagePercentage}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                  {usagePercentage > 80 && (
                    <p className="text-xs text-rose-500 flex items-center gap-1">
                      <ArrowUpRight className="size-3" />
                      Bientôt à court de crédits
                    </p>
                  )}
                </div>

                {/* Features List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {planConfig.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <Check className={`size-4 ${planConfig.color}`} />
                      <span className="text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Renewal Date */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50">
                  <Calendar className="size-3" />
                  <span>Renouvellement le 21 de chaque mois</span>
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {/* ─── Stats Cards ───────────────────────────────────────── */}
          <motion.section variants={fadeInUp} transition={{ duration: 0.45 }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <UsageStatCard
                title="Générations totales"
                value={stats.totalGenerations}
                description={`Moy. ${dailyAverage}/jour`}
                icon={Activity}
                iconColor="text-gold"
                iconBg="bg-gold/10"
                trend={{ value: 12, isPositive: true }}
              />
              <UsageStatCard
                title="Crédits consommés"
                value={stats.totalCredits}
                description={`Solde: ${user.credits}`}
                icon={Coins}
                iconColor="text-emerald-500"
                iconBg="bg-emerald-500/10"
              />
              <UsageStatCard
                title="Taux de réussite"
                value={`${stats.successRate}%`}
                description={`${stats.totalGenerations - Math.round(stats.totalGenerations * stats.successRate / 100)} échecs`}
                icon={TrendingUp}
                iconColor="text-blue-500"
                iconBg="bg-blue-500/10"
                trend={{ value: 5, isPositive: true }}
              />
              <UsageStatCard
                title="Types utilisés"
                value={[stats.textCount > 0, stats.imageCount > 0, stats.videoCount > 0, stats.codeCount > 0].filter(Boolean).length}
                description="sur 4 disponibles"
                icon={PieChart}
                iconColor="text-purple-500"
                iconBg="bg-purple-500/10"
              />
            </div>
          </motion.section>

          {/* ─── Charts ────────────────────────────────────────────── */}
          {stats.totalGenerations > 0 ? (
            <>
              <motion.section variants={fadeInUp} transition={{ duration: 0.45, delay: 0.1 }}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Activity Chart */}
                  <Card className="lg:col-span-2 border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-gold/10">
                          <BarChart3 className="size-4 text-gold" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold">Activité</CardTitle>
                          <CardDescription>Générations par jour</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                            <defs>
                              <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
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
                                fontSize: "12px",
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="generations"
                              stroke="oklch(0.78 0.155 75)"
                              strokeWidth={2}
                              fillOpacity={1}
                              fill="url(#colorActivity)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Type Distribution */}
                  <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-purple-500/10">
                          <PieChart className="size-4 text-purple-500" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold">Répartition</CardTitle>
                          <CardDescription>Par type de contenu</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={typeDistribution}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={2}
                              dataKey="value"
                              nameKey="name"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              labelLine={{ stroke: "oklch(0.5 0.01 50)", strokeWidth: 1 }}
                            >
                              {typeDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                background: "var(--card)",
                                border: "1px solid var(--border)",
                                borderRadius: "8px",
                                fontSize: "12px",
                              }}
                            />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.section>

              {/* ─── Type Breakdown ────────────────────────────────── */}
              <motion.section variants={fadeInUp} transition={{ duration: 0.45, delay: 0.15 }}>
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-gold/10">
                        <Calendar className="size-4 text-gold" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold">Détail par type</CardTitle>
                        <CardDescription>Répartition des générations</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { type: "text", count: stats.textCount, color: "blue", label: "Texte" },
                        { type: "image", count: stats.imageCount, color: "purple", label: "Image" },
                        { type: "video", count: stats.videoCount, color: "rose", label: "Vidéo" },
                        { type: "code", count: stats.codeCount, color: "sky", label: "Code" },
                      ].map((item) => {
                        const percentage = stats.totalGenerations > 0
                          ? Math.round((item.count / stats.totalGenerations) * 100)
                          : 0;
                        const colorMap: Record<string, string> = {
                          blue: "text-blue-500 bg-blue-500/10 border-blue-500/30",
                          purple: "text-purple-500 bg-purple-500/10 border-purple-500/30",
                          rose: "text-rose-500 bg-rose-500/10 border-rose-500/30",
                          sky: "text-sky-500 bg-sky-500/10 border-sky-500/30",
                        };
                        return (
                          <div
                            key={item.type}
                            className={`rounded-xl border p-4 ${colorMap[item.color]}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{item.label}</span>
                              <span className="text-xs text-muted-foreground">{percentage}%</span>
                            </div>
                            <p className="text-2xl font-bold mt-2">{item.count}</p>
                            <p className="text-xs text-muted-foreground mt-1">générations</p>
                            <div className="mt-3 h-1.5 rounded-full bg-current opacity-20">
                              <div
                                className="h-full rounded-full bg-current"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.section>

              {/* ─── Recent Activity ───────────────────────────────── */}
              <motion.section variants={fadeInUp} transition={{ duration: 0.45, delay: 0.2 }}>
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-gold/10">
                          <Clock className="size-4 text-gold" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold">Activité récente</CardTitle>
                          <CardDescription>
                            {filteredGenerations.length} générations sur la période
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {filteredGenerations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Inbox className="size-12 text-muted-foreground mb-4" />
                        <p className="text-sm text-muted-foreground">Aucune activité sur cette période</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {filteredGenerations
                          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                          .slice(0, 15)
                          .map((gen) => (
                            <UsageHistoryItem key={gen.id} generation={gen} />
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.section>
            </>
          ) : (
            /* ─── Empty State ──────────────────────────────────────── */
            <motion.section
              variants={fadeInUp}
              transition={{ duration: 0.5 }}
            >
              <Card className="border-dashed border-border/50 bg-card/30">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-muted mb-4">
                    <BarChart3 className="size-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold">Aucune donnée d'utilisation</h3>
                  <p className="mt-1 text-sm text-muted-foreground max-w-sm text-center">
                    Commencez à générer du contenu pour voir vos statistiques d'utilisation apparaître ici.
                  </p>
                  <Button className="mt-6" onClick={() => window.location.href = "/"}>
                    Commencer à créer
                  </Button>
                </CardContent>
              </Card>
            </motion.section>
          )}
        </motion.div>

        {/* ─── Upgrade Dialog ──────────────────────────────────────── */}
        <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-0 gap-0">
            {/* Dialog Header with gradient background */}
            <div className="relative bg-gradient-to-r from-gold/20 via-purple-500/10 to-blue-500/10 px-6 py-6 sm:px-8">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-gold/20">
                      <Crown className="size-5 text-gold" />
                    </div>
                    <DialogTitle className="text-xl font-bold">
                      Changer de plan
                    </DialogTitle>
                  </div>
                  <DialogDescription className="text-base">
                    Choisissez le plan qui correspond le mieux à vos besoins. 
                    <br className="hidden sm:block" />
                    Vous pouvez changer de plan à tout moment.
                  </DialogDescription>
                </div>
              </div>
            </div>

            {/* Plan Cards */}
            <div className="px-4 sm:px-6 py-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                {availablePlans.map((plan) => {
                  const isCurrentPlan = user?.plan === plan.id;
                  const isUpgrade = availablePlans.findIndex(p => p.id === user?.plan) < availablePlans.findIndex(p => p.id === plan.id);

                  return (
                    <div
                      key={plan.id}
                      className={`relative rounded-2xl border p-5 transition-all duration-200 ${
                        isCurrentPlan
                          ? `${plan.borderColor} ${plan.bgColor} ring-2 ring-offset-2 ring-gold/30`
                          : plan.popular
                          ? "border-gold/40 bg-gold/5 hover:border-gold/60"
                          : "border-border/50 hover:border-gold/30 hover:bg-accent/30"
                      }`}
                    >
                      {/* Popular Badge */}
                      {plan.popular && !isCurrentPlan && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge className="bg-gradient-to-r from-gold to-gold/80 text-white text-xs shadow-lg shadow-gold/25">
                            <Sparkles className="size-3 mr-1" />
                            Plus populaire
                          </Badge>
                        </div>
                      )}

                      {/* Plan Header */}
                      <div className="text-center mb-4 pb-4 border-b border-border/30">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <h4 className={`font-bold text-lg ${plan.color}`}>{plan.name}</h4>
                          {isCurrentPlan && (
                            <Badge variant="outline" className="text-xs bg-gold/10 text-gold border-gold/30">
                              Actuel
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-3xl font-bold">{plan.price}</span>
                          <span className="text-sm text-muted-foreground">/mois</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {plan.credits.toLocaleString()} crédits inclus
                        </p>
                      </div>

                      {/* Features List */}
                      <ul className="space-y-2.5 mb-5">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-sm">
                            <div className={`mt-0.5 flex size-5 items-center justify-center rounded-full ${plan.bgColor} shrink-0`}>
                              <Check className={`size-3 ${plan.color}`} />
                            </div>
                            <span className="text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Action Button */}
                      {!isCurrentPlan && (
                                        <Button
                          className="w-full"
                          size={plan.popular ? "default" : "sm"}
                          variant={plan.popular ? "default" : "outline"}
                          {...(plan.popular && {
                            className: "w-full bg-gradient-to-r from-gold to-gold/80 hover:from-gold/90 hover:to-gold/70 text-white shadow-lg shadow-gold/20"
                          })}
                          onClick={() => handleUpgrade(plan.id as "free" | "pro" | "enterprise")}
                          disabled={loadingPlan !== null && loadingPlan !== plan.id}
                        >
                          {loadingPlan === plan.id ? (
                            <>
                              <div className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                              Traitement...
                            </>
                          ) : (
                            <>
                              {isUpgrade ? "Surclasser" : "Choisir ce plan"}
                            </>
                          )}
                        </Button>
                      )}
                      {isCurrentPlan && (
                        <Button
                          className="w-full"
                          variant="secondary"
                          disabled
                        >
                          Plan actuel
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dialog Footer */}
            <div className="px-4 sm:px-6 py-4 border-t border-border/50 bg-muted/30">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  * Les crédits non utilisés ne sont pas reportés
                </p>
                <Button variant="outline" size="sm" onClick={() => setUpgradeDialogOpen(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );

  async function handleUpgrade(newPlan: "free" | "pro" | "enterprise") {
    if (!user) return;
    const key = `${user.id}:${newPlan}`;
    if (pendingCheckoutRef.current === key) return;
    if (isCheckoutPending(key)) return;
    if (!acquireCheckout(key)) return;
    pendingCheckoutRef.current = key;

    setLoadingPlan(newPlan);
    try {
      if (newPlan === "free") {
        const response = await fetch("/api/user/subscription/upgrade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, newPlan }),
        });

        const data = await response.json();
        if (!response.ok || !data.user) {
          throw new Error(data.error || "Failed to downgrade");
        }
        setAuth(data.user);
      } else {
        const response = await fetch("/api/user/subscription/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, newPlan }),
        });

        const data = await response.json();
        if (response.status === 409) {
          toast({
            title: "Session en cours",
            description: "Une session de paiement est déjà en cours. Patientez quelques instants et réessayez.",
          });
          setLoadingPlan(null);
          pendingCheckoutRef.current = null;
          releaseCheckout(key);
          return;
        }

        if (!response.ok || !data.url) {
          throw new Error(data.error || "Failed to create payment session");
        }
        pendingCheckoutRef.current = null;
        releaseCheckout(key);
        window.location.href = data.url;
        return;
      }

      toast({
        title: "Plan mis à jour",
        description: `Votre plan a été changé pour ${newPlan}.`,
      });

      setUpgradeDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de changer de plan. Veuillez réessayer.",
        variant: "destructive",
      });
      setLoadingPlan(null);
      pendingCheckoutRef.current = null;
      releaseCheckout(key);
    }
  }
}
