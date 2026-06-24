 "use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Save,
  Loader2,
  Moon,
  Sun,
  Monitor,
  Globe,
  Bell,
  Database,
  Check,
} from "lucide-react";

import { useAppStore, type UserSettings } from "@/store/app-store";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/* ──────────── animation variants ──────────── */
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

/* ──────────── language options ──────────── */
const LANGUAGE_OPTIONS: { value: UserSettings["language"]; label: string }[] = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "de", label: "Deutsch" },
];

/* ──────────── theme options ──────────── */
const THEME_OPTIONS: { value: UserSettings["theme"]; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Clair", icon: Sun },
  { value: "dark", label: "Sombre", icon: Moon },
  { value: "system", label: "Système", icon: Monitor },
];

/* ──────────── component ──────────── */
export default function SettingsView() {
  const { user, setCurrentView, settings, setSettings, updateSettings } = useAppStore();
  const { toast } = useToast();
  const { theme: currentTheme, setTheme: setNextTheme } = useTheme();
  const { t } = useTranslation();

  // Local state for settings
  const [theme, setTheme] = useState<UserSettings["theme"]>("system");
  const [language, setLanguage] = useState<UserSettings["language"]>("fr");
  const [notifications, setNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch settings on mount (do NOT apply theme here - only display current value)
  useEffect(() => {
    async function fetchSettings() {
      if (!user) return;
      try {
        const res = await fetch(`/api/user/settings?userId=${encodeURIComponent(user.id)}`);
        if (!res.ok) throw new Error("Erreur lors de la récupération des paramètres");
        const data = await res.json();
        if (data.settings) {
          setTheme(data.settings.theme);
          setLanguage(data.settings.language);
          setNotifications(data.settings.notifications);
          setEmailAlerts(data.settings.emailAlerts);
          setAutoSave(data.settings.autoSave);
          setSettings(data.settings);
          // Only apply language to document, NOT theme
          // Theme should only be applied when user explicitly saves or selects a new theme
          try {
            if (typeof document !== "undefined") {
              document.documentElement.lang = data.settings.language || "fr";
            }
          } catch {}
        }
      } catch {
        toast({
          title: "Erreur",
          description: "Impossible de charger les paramètres.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, [user, setSettings, toast]);

  /* ── save settings ── */
  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      const res = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          theme,
          language,
          notifications,
          emailAlerts,
          autoSave,
        }),
      });
      if (!res.ok) throw new Error("Erreur lors de la sauvegarde");
      const data = await res.json();
      setSettings(data.settings);
      // Apply theme after successful save
      try {
        setNextTheme(theme as any);
      } catch {}
      toast({
        title: "Paramètres sauvegardés",
        description: "Vos paramètres ont été mis à jour avec succès.",
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  /* ── reset to defaults ── */
  function handleReset() {
    setTheme("system");
    setLanguage("fr");
    setNotifications(true);
    setEmailAlerts(true);
    setAutoSave(true);
    try {
      setNextTheme("system");
    } catch {}
    toast({
      title: "Paramètres réinitialisés",
      description: "Les paramètres ont été réinitialisés aux valeurs par défaut.",
    });
  }

  if (!user || loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 flex items-center justify-center h-full">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* ── Top Bar ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-center mb-8 relative"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentView("dashboard")}
          className="absolute left-0"
          aria-label="Retour au tableau de bord"
        >
          <ArrowLeft className="size-5" />
        </Button>

        <h1 className="text-2xl font-bold tracking-tight">{t("settings.title")}</h1>
      </motion.div>

      {/* ── Settings Grid ── */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {/* ── Appearance ── */}
        <motion.div variants={fadeInUp} transition={{ duration: 0.35 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sun className="size-5" />
                {t("settings.appearance.title")}
              </CardTitle>
              <CardDescription>
                {t("settings.appearance.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Theme */}
              <div className="space-y-3">
                <Label>{t("settings.appearance.theme")}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {THEME_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isActive = theme === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => {
                          setTheme(option.value);
                          try {
                            setNextTheme(option.value as any);
                          } catch {}
                        }}
                        className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                          isActive
                            ? "border-gold bg-gold/10 text-gold"
                            : "border-border hover:border-gold/50"
                        }`}
                      >
                        <Icon className="size-5" />
                        <span className="text-xs font-medium">{option.label}</span>
                        {isActive && (
                          <Badge className="absolute top-1 right-1 size-4 p-0 flex items-center justify-center">
                            <Check className="size-2.5" />
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Language */}
              <div className="space-y-2">
                <Label htmlFor="language">{t("settings.language")}</Label>
                <Select
                  value={language}
                  onValueChange={(v) => {
                    const val = v as UserSettings["language"];
                    setLanguage(val);
                    try {
                      if (typeof document !== "undefined") document.documentElement.lang = val;
                    } catch {}
                    // update in-memory store so UI can react if needed
                    updateSettings({ language: val });
                  }}
                >
                  <SelectTrigger id="language">
                    <SelectValue placeholder="Sélectionner une langue" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="flex items-center gap-2">
                          <Globe className="size-4" />
                          {option.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Notifications ── */}
        <motion.div variants={fadeInUp} transition={{ duration: 0.35, delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="size-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Gérez vos préférences de notification.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* In-app notifications */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notifications" className="text-base">
                      {t("settings.notifications.title")}
                    </Label>
                    <p className={t("auto.k_text_sm_text_muted_foreground_32")}>
                      {t("settings.notifications.description")}
                    </p>
                </div>
                <Switch
                  id="notifications"
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>

              <Separator />

              {/* Email alerts */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="emailAlerts" className="text-base">
                      {t("settings.notifications.title")}
                    </Label>
                    <p className={t("auto.k_text_sm_text_muted_foreground_32")}>
                      {t("settings.notifications.description")}
                    </p>
                </div>
                <Switch
                  id="emailAlerts"
                  checked={emailAlerts}
                  onCheckedChange={setEmailAlerts}
                />
              </div>

              <Separator />

              {/* Auto-save */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoSave" className="text-base">
                    Sauvegarde automatique
                  </Label>
                  <p className={t("auto.k_text_sm_text_muted_foreground_32")}>
                    Sauvegarder automatiquement les projets
                  </p>
                </div>
                <Switch
                  id="autoSave"
                  checked={autoSave}
                  onCheckedChange={setAutoSave}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Data & Privacy ── */}
        <motion.div variants={fadeInUp} transition={{ duration: 0.35, delay: 0.2 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="size-5" />
                {t("settings.dataPrivacy.title")}
              </CardTitle>
              <CardDescription>
                {t("settings.dataPrivacy.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <h4 className="text-sm font-medium mb-2">{t("auto.k_informations_du_compte_487")}</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Email: {user.email}</p>
                  <p>Plan: {user.plan === "free" ? "Gratuit" : user.plan === "pro" ? "Pro" : "Enterprise"}</p>
                  <p>Crédits: {user.credits}</p>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setCurrentView("profile")}
              >
                Gérer le profil et l'abonnement
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Actions ── */}
        <motion.div variants={fadeInUp} transition={{ duration: 0.35, delay: 0.3 }}>
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>
                Sauvegardez ou réinitialisez vos paramètres.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleSave}
                disabled={saving}
                className={t("auto.k_w_full_bg_gold_text_gold_foreground_hove_309")}
              >
                {saving ? (
                  <Loader2 className={t("auto.k_size_4_animate_spin_473")} />
                ) : (
                  <Save className="size-4" />
                )}
                {saving ? "Sauvegarde..." : t("settings.save")}
              </Button>

              <Button
                onClick={handleReset}
                variant="outline"
                className="w-full"
              >
                {t("settings.reset")}
              </Button>

              <Separator />

              <div className="text-xs text-muted-foreground text-center">
                <p>{t("settings.lastModified")}: {settings?.updatedAt ? new Date(settings.updatedAt).toLocaleString("fr-FR") : "Jamais"}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}