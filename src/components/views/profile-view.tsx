"use client";

import { classMap } from '@/styles/classMap';
import { useState, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Save,
  Trash2,
  CheckCircle2,
  Crown,
  Zap,
  Shield,
  Loader2,
  Check,
  Camera,
  X,
} from "lucide-react";

import { useAppStore, type User } from "@/store/app-store";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";
import { acquireCheckout, isCheckoutPending, releaseCheckout } from '@/lib/checkoutLock';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AvatarUploadModal } from "@/components/ui/avatar-upload-modal";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

/* ──────────── animation variants ──────────── */
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

/* ──────────── plan helpers ──────────── */
const PLAN_META: Record<
  User["plan"],
  { label: string; maxCredits: number; features: string[]; icon: typeof Zap }
> = {
  free: {
    label: "Gratuit",
    maxCredits: 50,
    features: [
      "50 crédits/mois",
      "Génération vocale uniquement",
      "1 création/jour",
    ],
    icon: Zap,
  },
  pro: {
    label: "Pro",
    maxCredits: 1000,
    features: [
      "1000 crédits/mois",
      "Tous types de génération",
      "Priorité IA",
      "Support prioritaire",
    ],
    icon: Crown,
  },
  enterprise: {
    label: "Enterprise",
    maxCredits: 5000,
    features: [
      "5000 crédits/mois",
      "API dédiée",
      "Personnalisation complète",
      "Account manager dédié",
    ],
    icon: Shield,
  },
};

/* ──────────── component ──────────── */
export default function ProfileView() {
  const { user, setAuth, setCurrentView, logout } = useAppStore();
  const { toast } = useToast();
  const { t } = useTranslation();

  // Profile form
  const [name, setName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);

  // Plan switching - use a ref to prevent double clicks
  const [switchingPlan, setSwitchingPlan] = useState<User["plan"] | null>(null);
  const isProcessingRef = useRef(false);

  // Avatar upload
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  // Compute initials
  const email = user?.email ?? "";
  const initials = useMemo(() => {
    if (!name) return email.charAt(0).toUpperCase() ?? "?";
    return name
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");
  }, [name, email]);

  // Credits progress
  const planMeta = PLAN_META[user?.plan ?? "free"];
  const isAdmin = user?.role === "admin";
  const creditsUsed = isAdmin ? 0 : planMeta.maxCredits - (user?.credits ?? 0);
  const creditsPercent = isAdmin
    ? 0
    : Math.min(100, Math.max(0, (creditsUsed / planMeta.maxCredits) * 100));
  const displayPlanLabel = isAdmin ? "Administrateur" : planMeta.label;

  /* ── save profile ── */
  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, name }),
      });
      if (!res.ok) throw new Error("Erreur lors de la sauvegarde");
      const updatedUser = (await res.json()) as User;
      setAuth(updatedUser);
      toast({ title: "Profil mis à jour", description: "Vos informations ont été sauvegardées." });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le profil. Réessayez.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  /* ── switch plan ── */
  async function handleSwitchPlan(newPlan: User["plan"]) {
    if (!user || newPlan === user.plan || user.role === "admin") return;
    const lockKey = user.id;
    if (isProcessingRef.current) return;
    if (isCheckoutPending(lockKey)) return;
    if (!acquireCheckout(lockKey)) return;
    // Prevent double clicks - check and set processing flag atomically
    isProcessingRef.current = true;
    setSwitchingPlan(newPlan);
    try {
      if (newPlan === "free") {
        const res = await fetch("/api/user/subscription/upgrade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, newPlan }),
        });
        const data = await res.json();
        if (!res.ok || !data.user) {
          throw new Error(data.error || "Erreur lors du changement de plan");
        }
        setAuth(data.user);
      } else {
        const res = await fetch("/api/user/subscription/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, newPlan }),
        });
        const data = await res.json();
        // If server reports a concurrent checkout for a different plan, show a friendly toast
        if (res.status === 409) {
          toast({
            title: "Session en cours",
            description:
              "Une session de paiement est déjà en cours. Patientez quelques instants et réessayez.",
          });
          // reset processing state and release lock
          isProcessingRef.current = false;
          setSwitchingPlan(null);
          releaseCheckout(lockKey);
          return;
        }

        if (!res.ok || !data.url) {
          throw new Error(data.error || "Erreur lors du paiement");
        }
        // Prevent opening multiple checkout tabs from rapid clicks
        try {
          if ((window as any).__checkoutOpened) return;
          (window as any).__checkoutOpened = true;
          // Clear the flag after a short timeout in case the new tab blocked or failed
          setTimeout(() => { try { (window as any).__checkoutOpened = false } catch {} }, 10000);

          // Open Stripe Checkout in a new tab to avoid blank page issues in some environments
          const opened = window.open(data.url, "_blank", "noopener,noreferrer");
          // Release lock after attempting to open the new tab
          isProcessingRef.current = false;
          setSwitchingPlan(null);
          releaseCheckout(lockKey);
          if (!opened) {
            // fallback to navigate in the same tab
            (window as any).__checkoutOpened = false;
            window.location.href = data.url;
          }
        } catch (err) {
          try { (window as any).__checkoutOpened = false } catch {}
        }
        return;
      }

      toast({
        title: "Plan mis à jour",
        description: `Vous êtes maintenant sur le plan ${PLAN_META[newPlan].label}.`,
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de changer de plan. Réessayez.",
        variant: "destructive",
      });
      isProcessingRef.current = false;
      setSwitchingPlan(null);
      releaseCheckout(lockKey);
    }
  }

  /* ── handle avatar upload from modal ── */
  async function handleAvatarUpload(file: File): Promise<void> {
    if (!user) return;

    setUploadingAvatar(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      // Upload to server
      const res = await fetch("/api/user/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          avatar: base64,
        }),
      });

      if (!res.ok) throw new Error("Erreur lors de l'upload");

      const { user: updatedUser } = await res.json();
      setAuth(updatedUser);

      toast({
        title: "Avatar mis à jour",
        description: "Votre photo de profil a été mise à jour avec succès.",
      });
    } catch {
      throw new Error("Upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  }

  /* ── remove avatar ── */
  async function handleRemoveAvatar() {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const res = await fetch("/api/user/avatar", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!res.ok) throw new Error("Erreur");
      const { user: updatedUser } = await res.json();
      setAuth(updatedUser);
      toast({
        title: "Avatar supprimé",
        description: "Votre photo de profil a été supprimée.",
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'avatar.",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
    }
  }

  // Only allow editing avatar if account was created via local signup
  const canEditAvatar = (user?.provider ?? "") === "email";

  /* ── delete account ── */
  function handleDeleteAccount() {
    logout();
    toast({ title: "Compte supprimé", description: "Votre compte a été supprimé avec succès." });
  }

  if (!user) return null;

  const PlanIcon = planMeta.icon;
  const isPro = user.plan === "pro";
  const isEnterprise = user.plan === "enterprise";

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
          aria-label={t("auto.k_retour_au_tableau_de_bord_108")}
        >
          <ArrowLeft className="size-5" />
        </Button>

        <h1 className="text-2xl font-bold tracking-tight">{t("profile.title")}</h1>
      </motion.div>

      {/* ── Two-column layout ── */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* ═══════════════ LEFT COLUMN ═══════════════ */}
        <div className="flex flex-col gap-6">
          {/* ── Profile Settings Card ── */}
          <motion.div variants={fadeInUp} transition={{ duration: 0.35 }}>
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-6">{t("profile.personalInfo")}</h2>

              {/* Avatar */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative group">
                  <Avatar className="size-24 ring-2 ring-gold/30 ring-offset-4 ring-offset-card">
                    {user.avatar ? (
                      <AvatarImage src={user.avatar} alt={name} />
                    ) : null}
                    <AvatarFallback className="text-2xl font-semibold bg-gold/10 text-gold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  {/* Upload overlay on hover */}
                  {canEditAvatar ? (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setAvatarModalOpen(true)}
                      disabled={uploadingAvatar}
                      className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {uploadingAvatar ? (
                        <Loader2 className="size-8 text-white animate-spin" />
                      ) : (
                        <Camera className="size-8 text-white" />
                      )}
                    </motion.button>
                  ) : null}

                  {/* Remove button (only show if avatar exists) */}
                  {user.avatar && !uploadingAvatar && canEditAvatar && (
                    <motion.button
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveAvatar();
                      }}
                      className="absolute top-1 right-1 size-6 rounded-full bg-card/80 text-card-foreground hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center"
                    >
                      <X className="size-3" />
                    </motion.button>
                  )}
                </div>

                {/* Helper text */}
                <p className="text-xs text-muted-foreground mt-3">
                  {canEditAvatar ? t("profile.avatar.editable") : t("profile.avatar.readonly")}
                </p>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-name">{t("auto.k_nom_complet_455")}</Label>
                  <Input
                    id="profile-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("auto.k_votre_nom_44")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-email">Email</Label>
                  <Input
                    id="profile-email"
                    value={user.email ?? ""}
                    disabled
                    className="opacity-60 cursor-not-allowed"
                  />
                </div>

                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-gold text-gold-foreground hover:bg-gold/90 flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 className={classMap["k_size_4_animate_spin_473"]} />
                  ) : (
                    <Save className="size-4" />
                  )}
                  {saving ? "Sauvegarde..." : "Sauvegarder"}
                </Button>
              </div>
            </div>
          </motion.div>

          {/* ── Danger Zone ── */}
          <motion.div variants={fadeInUp} transition={{ duration: 0.35 }}>
            <div className="bg-card border border-destructive/40 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-destructive mb-2">Zone dangereuse</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Cette action est irréversible. Toutes vos données et générations
                seront supprimées définitivement.
              </p>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="size-4" />
                    Supprimer mon compte
                  </Button>
                </AlertDialogTrigger>

                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Êtes-vous absolument sûr ?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action ne peut pas être annulée. Cela supprimera
                      définitivement votre compte et toutes vos données de nos
                      serveurs.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className={classMap["k_bg_destructive_text_white_hover_bg_destr_477"]}
                    >
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </motion.div>
        </div>

        {/* ═══════════════ RIGHT COLUMN ═══════════════ */}
        <div className="flex flex-col gap-6">
          {/* ── Subscription Card ── */}
          <motion.div variants={fadeInUp} transition={{ duration: 0.35 }}>
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-6">Abonnement actuel</h2>

              {/* Current plan badge + name */}
              <div className="flex items-center gap-3 mb-6">
                <div
                  className={`flex items-center justify-center size-12 rounded-lg ${
                    isPro
                      ? "bg-gold/10"
                      : isEnterprise
                        ? "bg-gold/10"
                        : "bg-muted"
                  }`}
                >
                  <PlanIcon
                    className={`size-6 ${
                      isPro || isEnterprise ? "text-gold" : "text-muted-foreground"
                    }`}
                  />
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight">
                    <span
                      className={
                        isPro || isEnterprise ? "text-gold" : "text-foreground"
                      }
                    >
                      {displayPlanLabel}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isAdmin
                      ? "Accès administrateur"
                      : user.plan === "free"
                        ? "Plan gratuit"
                        : user.plan === "pro"
                          ? "29€/mois"
                          : "99€/mois"}
                  </p>
                </div>
              </div>

              {!isAdmin ? (
                <div className="space-y-2 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Renouvellement
                    </span>
                    <span className="font-medium tabular-nums">
                      21 de chaque mois
                    </span>
                  </div>
                  <Progress
                    value={creditsPercent}
                    className="h-2.5"
                  />
                  <p className="text-xs text-muted-foreground">
                    {creditsUsed} crédits utilisés ce mois-ci
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-border/50 bg-muted/30 p-4 mb-6 text-sm text-muted-foreground">
                  Les administrateurs ne disposent pas d'un suivi de crédits personnel dans cette interface.
                </div>
              )}

              <Separator className="my-5" />

              {/* Plan features */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Inclut dans votre plan
                </h3>
                <ul className="space-y-2">
                  {(isAdmin
                    ? [
                        "Accès administrateur",
                        "Aucune limite de crédits",
                        "Gestion complète des comptes",
                        "Pas de facturation personnelle",
                      ]
                    : planMeta.features
                  ).map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="size-4 text-gold shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Separator className="my-5" />

              {!isAdmin && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Changer de plan</h3>

                  {user.plan === "free" && (
                  <>
                    <Button
                      onClick={() => handleSwitchPlan("pro")}
                      disabled={switchingPlan !== null}
                      className="w-full bg-gold text-gold-foreground hover:bg-gold/90 flex items-center gap-2"
                    >
                      {switchingPlan === "pro" ? (
                        <Loader2 className={classMap["k_size_4_animate_spin_473"]} />
                      ) : (
                        <Crown className="size-4" />
                      )}
                      Passer au plan Pro — 29€/mois
                    </Button>
                    <Button
                      onClick={() => handleSwitchPlan("enterprise")}
                      disabled={switchingPlan !== null}
                      variant="outline"
                      className="w-full"
                    >
                      {switchingPlan === "enterprise" ? (
                        <Loader2 className={classMap["k_size_4_animate_spin_473"]} />
                      ) : (
                        <Shield className="size-4" />
                      )}
                      Passer à Enterprise — 99€/mois
                    </Button>
                  </>
                )}

                {user.plan === "pro" && (
                  <>
                    <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-gold/10 border border-gold/20">
                      <Badge className="bg-gold/10 text-gold border-gold/30 hover:bg-gold/20">
                        <CheckCircle2 className="size-3.5" />
                        Votre plan est actif
                      </Badge>
                    </div>
                    <Button
                      onClick={() => handleSwitchPlan("enterprise")}
                      disabled={switchingPlan !== null}
                      variant="outline"
                      className="w-full"
                    >
                      {switchingPlan === "enterprise" ? (
                        <Loader2 className={classMap["k_size_4_animate_spin_473"]} />
                      ) : (
                        <Shield className="size-4" />
                      )}
                      Passer à Enterprise — 99€/mois
                    </Button>
                    <Button
                      onClick={() => handleSwitchPlan("free")}
                      disabled={switchingPlan !== null}
                      variant="ghost"
                      className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      {switchingPlan === "free" ? (
                        <Loader2 className={classMap["k_size_4_animate_spin_473"]} />
                      ) : (
                        <ArrowLeft className="size-4" />
                      )}
                      Rétrograder vers Gratuit
                    </Button>
                  </>
                )}

                {user.plan === "enterprise" && (
                  <>
                    <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-gold/10 border border-gold/20">
                      <Badge className="bg-gold/10 text-gold border-gold/30 hover:bg-gold/20">
                        <Shield className="size-3.5" />
                        Plan Enterprise actif
                      </Badge>
                    </div>
                    <Button
                      onClick={() => handleSwitchPlan("pro")}
                      disabled={switchingPlan !== null}
                      variant="outline"
                      className="w-full"
                    >
                      {switchingPlan === "pro" ? (
                        <Loader2 className={classMap["k_size_4_animate_spin_473"]} />
                      ) : (
                        <ArrowLeft className="size-4" />
                      )}
                      Rétrograder vers Pro
                    </Button>
                  </>
                )}
              </div>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Avatar Upload Modal */}
      <AvatarUploadModal
        open={avatarModalOpen}
        onOpenChange={setAvatarModalOpen}
        onUpload={handleAvatarUpload}
        uploading={uploadingAvatar}
        currentAvatar={user.avatar}
        userName={name}
      />
    </div>
  );
}
