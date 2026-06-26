"use client";
import { classMap } from '@/styles/classMap';
import { useTranslation } from "@/lib/i18n";

import { useState } from "react";
import { Loader2, Mail, Lock, User as UserIcon, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAppStore } from "@/store/app-store";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

type Provider = "google" | "facebook";

/* ── OAuth button icon (Official SVGs) ── */
function OAuthIcon({ provider }: { provider: Provider }) {
  switch (provider) {
    case "google":
      return (
        <svg className="size-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      );
    case "facebook":
      return (
        <svg className="size-4" viewBox="0 0 24 24" fill="#1877F2" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      );
  }
}

/* ── Floating shape background decoration ── */
function FloatingShapes() {
  const { t } = useTranslation();
  return (
    <div className={classMap["k_absolute_inset_0_overflow_hidden_pointer_10"]}>
      <div className={classMap["k_absolute_top_8_right_8_w_24_h_24_bg_gold_11"]} />
      <div className={classMap["k_absolute_bottom_6_left_6_w_20_h_20_bg_go_12"]} style={{ animationDelay: "1s" }} />
      <div className={classMap["k_absolute_top_1_2_right_12_w_16_h_16_bg_p_13"]} style={{ animationDelay: "0.5s" }} />
    </div>
  );
}

/* ── Styled Input with icon and optional show/hide password ── */
interface StyledInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconClick?: () => void;
  error?: boolean;
  success?: boolean;
}

function StyledInput({
  className,
  leftIcon,
  rightIcon,
  onRightIconClick,
  error,
  success,
  ...props
}: StyledInputProps) {
  const { t } = useTranslation();
  return (
    <div className="relative">
      {leftIcon && (
        <div className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 z-10 transition-colors duration-200",
          error ? "text-destructive" : success ? "text-green-500" : "text-muted-foreground"
        )}>
          {leftIcon}
        </div>
      )}
      <Input
        className={cn(
          "h-11 pl-10 pr-10 bg-background/80 backdrop-blur-sm transition-all duration-200",
          "focus:bg-background focus:shadow-lg focus:shadow-gold/5",
          error 
            ? "border-destructive/50 focus-visible:border-destructive focus-visible:ring-destructive/20" 
            : success
            ? "border-green-500/50 focus-visible:border-green-500 focus-visible:ring-green-500/20"
            : "border-border hover:border-gold/30 focus-visible:border-gold/50 focus-visible:ring-gold/15",
          leftIcon && "pl-10",
          (rightIcon || success || error) && "pr-10",
          className
        )}
        {...props}
      />
      {(rightIcon || success || error) && (
        <button
          type="button"
          onClick={onRightIconClick}
          className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 z-10 transition-colors duration-200",
            onRightIconClick ? "cursor-pointer text-muted-foreground hover:text-foreground" : "cursor-default",
            error ? "text-destructive" : success ? "text-green-500" : "text-muted-foreground"
          )}
          disabled={!onRightIconClick}
        >
          {error ? (
            <>
              <AlertCircle className="size-4" />
              {t("auto.k_success_2")}
              <CheckCircle2 className="size-4" />
            </>
          ) : (
            rightIcon
          )}
        </button>
      )}
    </div>
  );
}

/* ── OAuth buttons row (reusable) ── */
interface OAuthButtonsProps {
  loading: boolean;
  onOAuth: (provider: Provider) => void;
}

function OAuthButtons({ loading, onOAuth }: OAuthButtonsProps) {
  const { t } = useTranslation();
  return (
    <>
      <div className={classMap["k_relative_my_5_flex_items_center_gap_3_14"]}>
        <Separator className={classMap["k_flex_1_bg_gradient_to_r_from_transparent_15"]} />
        <span className={classMap["k_text_muted_foreground_text_xs_font_mediu_16"]}>
          ou continuer avec
        </span>
        <Separator className={classMap["k_flex_1_bg_gradient_to_r_from_transparent_15"]} />
      </div>

      <div className={classMap["k_grid_grid_cols_2_gap_2_5_17"]}>
        {(["google", "facebook"] as Provider[]).map((provider) => (
          <Button
            key={provider}
            type="button"
            variant="secondary"
            className={cn(
              "flex items-center justify-center gap-2 h-10 rounded-lg",
              "bg-gradient-to-br from-background to-muted/30",
              "border border-border/60 hover:border-gold/40",
              "hover:shadow-md hover:shadow-gold/5 hover:-translate-y-0.5",
              "active:translate-y-0 active:shadow-sm",
              "transition-all duration-200"
            )}
            disabled={loading}
            onClick={() => onOAuth(provider)}
          >
            <OAuthIcon provider={provider} />
            <span className={classMap["k_truncate_text_10px_font_semibold_upperca_18"]}>
              {provider}
            </span>
          </Button>
        ))}
      </div>
    </>
  );
}

/* ── Password strength indicator ── */
function PasswordStrength({ password }: { password: string }) {
  const { t } = useTranslation();
  if (!password) return null;
  
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const isLong8 = password.length >= 8;
  const isLong12 = password.length >= 12;
  
  // Calculate strength score (0-5)
  let strength = 0;
  if (hasLower) strength++;
  if (hasUpper) strength++;
  if (hasNumber) strength++;
  if (hasSpecial) strength++;
  if (isLong8) strength++;
  if (isLong12) strength++;
  
  // Adjust for max 5 criteria display
  const maxCriteria = 5;
  const displayStrength = Math.min(strength, maxCriteria);
  
  const getStrengthLabel = () => {
    if (strength <= 2) return { label: "Faible", color: "bg-destructive" };
    if (strength <= 3) return { label: "Moyen", color: "bg-yellow-500" };
    return { label: "Fort", color: "bg-green-500" };
  };
  
  const { label, color } = getStrengthLabel();
  
  return (
    <div className={classMap["k_space_y_2_mt_1_19"]}>
      <div className={classMap["k_flex_items_center_justify_between_text_x_20"]}>
        <span className="text-muted-foreground">{t("auto.k_force_du_mot_de_passe_3")}</span>
        <span className={cn("font-medium", color.replace("bg-", "text-"))}>{label}</span>
      </div>
      <div className={classMap["k_h_1_5_w_full_bg_muted_rounded_full_overf_21"]}>
        <div 
          className={cn("h-full transition-all duration-300 rounded-full", color)}
          style={{ width: `${(displayStrength / maxCriteria) * 100}%` }}
        />
      </div>
      <div className={classMap["k_flex_flex_wrap_gap_1_5_text_10px_22"]}>
        <span className={cn("px-1.5 py-0.5 rounded", hasLower ? "bg-green-500/20 text-green-600" : "bg-muted text-muted-foreground")}>
          minuscule
        </span>
        <span className={cn("px-1.5 py-0.5 rounded", hasUpper ? "bg-green-500/20 text-green-600" : "bg-muted text-muted-foreground")}>
          majuscule
        </span>
        <span className={cn("px-1.5 py-0.5 rounded", hasNumber ? "bg-green-500/20 text-green-600" : "bg-muted text-muted-foreground")}>
          chiffre
        </span>
        <span className={cn("px-1.5 py-0.5 rounded", hasSpecial ? "bg-green-500/20 text-green-600" : "bg-muted text-muted-foreground")}>
          spécial
        </span>
        <span className={cn("px-1.5 py-0.5 rounded", isLong12 ? "bg-green-500/20 text-green-600" : "bg-muted text-muted-foreground")}>
          12+ caractères
        </span>
      </div>
    </div>
  );
}

export function AuthModal() {
  const { authModalOpen, authModalTab, closeAuthModal, setAuth, setCurrentView } =
    useAppStore();
  const { toast } = useToast();

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const { t } = useTranslation();
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginEmailValid, setLoginEmailValid] = useState(false);
  const [loginPasswordValid, setLoginPasswordValid] = useState(false);

  // Signup form state
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [signupEmailValid, setSignupEmailValid] = useState(false);
  const [signupPasswordValid, setSignupPasswordValid] = useState(false);
  const [confirmPasswordValid, setConfirmPasswordValid] = useState(false);

  // Email validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Reset forms when modal opens/closes
  function resetForms() {
    setLoginEmail("");
    setLoginPassword("");
    setLoginLoading(false);
    setLoginError("");
    setShowLoginPassword(false);
    setLoginEmailValid(false);
    setLoginPasswordValid(false);
    setSignupName("");
    setSignupEmail("");
    setSignupPassword("");
    setSignupConfirmPassword("");
    setSignupLoading(false);
    setSignupError("");
    setShowSignupPassword(false);
    setShowSignupConfirmPassword(false);
    setSignupEmailValid(false);
    setSignupPasswordValid(false);
    setConfirmPasswordValid(false);
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      resetForms();
      closeAuthModal();
    }
  }

  // ── Login submit ──
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Identifiants invalides");
      }

      const data = await res.json();
      setAuth(data.user);
      setCurrentView("dashboard");
      closeAuthModal();
      toast({
        title: "Connexion réussie",
        description: `Bienvenue${data.user.name ? `, ${data.user.name}` : ""} !`,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Une erreur est survenue";
      setLoginError(message);
    } finally {
      setLoginLoading(false);
    }
  }

  // ── Signup submit ──
  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setSignupError("");
    setSignupLoading(true);

    try {
      if (!signupEmailValid) {
        throw new Error("Veuillez entrer une adresse email valide");
      }
      if (!signupPasswordValid) {
        throw new Error(
          "Le mot de passe doit contenir 12 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial"
        );
      }
      if (signupPassword !== signupConfirmPassword) {
        throw new Error("Les mots de passe ne correspondent pas");
      }

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: signupEmail,
          name: signupName,
          password: signupPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Impossible de créer le compte");
      }

      const data = await res.json();
      setAuth(data.user);
      setCurrentView("dashboard");
      closeAuthModal();
      toast({
        title: "Compte créé",
        description: `Bienvenue${data.user.name ? `, ${data.user.name}` : ""} ! Votre compte est prêt.`,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Une erreur est survenue";
      setSignupError(message);
    } finally {
      setSignupLoading(false);
    }
  }

  // ── OAuth helper ──
  async function handleOAuth(provider: Provider, isSignup: boolean) {
    const setLoading = isSignup ? setSignupLoading : setLoginLoading;
    const setError = isSignup ? setSignupError : setLoginError;
    setError("");
    setLoading(true);

    const redirectBaseRaw = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const redirectBase = redirectBaseRaw.replace(/(^["']|["']$)/g, "").replace(/\/$/, "");
    const redirectUri = `${redirectBase}/api/auth/callback`;

    try {
      // Encode provider and a random string into the state parameter for security and context
      const statePayload = {
        random: Math.random().toString(36).substring(2),
        provider: provider,
      };
      const encodedState = btoa(JSON.stringify(statePayload)); // Base64 encode for URL safety
      sessionStorage.setItem(`oauth_state_${provider}`, encodedState);

      let authUrl: URL | null = null;
      if (provider === "google") {
        authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        authUrl.searchParams.set("client_id", process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "");
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("scope", "openid email profile");
        authUrl.searchParams.set("state", encodedState);
      } else if (provider === "facebook") {
        authUrl = new URL("https://www.facebook.com/v20.0/dialog/oauth");
        authUrl.searchParams.set("client_id", process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "");
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("scope", "email,public_profile");
        authUrl.searchParams.set("state", encodedState);
      }

      // If OAuth credentials are not configured, fall back to demo mode
      if (!authUrl || !authUrl.searchParams.get("client_id")) {
        console.warn(`${provider} OAuth not configured, using demo mode`);
        const res = await fetch("/api/auth/oauth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider,
            email: `${provider.toLowerCase()}@demo.com`,
            name: `${provider} User`,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Erreur lors de la connexion avec ${provider}`);
        }

        const data = await res.json();
        if (!data?.user) {
          throw new Error(data?.error || `Erreur lors de la connexion avec ${provider}`);
        }
        setAuth(data.user);
        setCurrentView("dashboard");
        closeAuthModal();
        toast({
          title: "Connexion réussie (mode démo)",
          description: `Connecté avec ${provider.charAt(0).toUpperCase() + provider.slice(1)}`,
        });
      } else {
        // Redirect to OAuth provider
        // Debug: log the full auth URL to inspect redirect_uri mismatches
        try {
          console.info("OAuth redirect URL:", authUrl.toString());
        } catch {}
        window.location.href = authUrl.toString();
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Une erreur est survenue";
      setError(message);
      setLoading(false);
    }
  }

  // Handle email validation
  const handleLoginEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLoginEmail(value);
    setLoginEmailValid(value ? validateEmail(value) : false);
  };

  const handleSignupEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSignupEmail(value);
    setSignupEmailValid(value ? validateEmail(value) : false);
  };

  const handleLoginPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLoginPassword(value);
    setLoginPasswordValid(value.length >= 6);
  };

  const handleSignupPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSignupPassword(value);
    const hasLower = /[a-z]/.test(value);
    const hasUpper = /[A-Z]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);
    const isLongEnough = value.length >= 12;
    setSignupPasswordValid(hasLower && hasUpper && hasNumber && hasSpecial && isLongEnough);

    if (signupConfirmPassword) {
      setConfirmPasswordValid(value === signupConfirmPassword);
    }
  };

  const handleSignupConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSignupConfirmPassword(value);
    setConfirmPasswordValid(value === signupPassword && value.length > 0);
  };

  return (
    <Dialog open={authModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent 
        className={cn(
          "w-full p-0 gap-0 flex flex-col",
          "max-w-[92vw] sm:max-w-md md:max-w-lg",
          "max-h-[90vh]",
          "bg-card/98 dark:bg-card/95 backdrop-blur-xl",
          "border border-border dark:border-white/10",
          "shadow-2xl shadow-black/10 dark:shadow-gold/10",
          "rounded-2xl overflow-hidden"
        )}
      >
        {/* Header with gradient border top */}
        <div className={classMap["k_relative_flex_shrink_0_23"]}>
          <div className={classMap["k_absolute_top_0_left_0_right_0_h_0_5_bg_g_24"]} />
          <FloatingShapes />
          
          <div className={classMap["k_relative_flex_flex_col_items_center_just_25"]}>
            <div className={classMap["k_mb_3_p_2_rounded_xl_bg_gradient_to_br_fr_26"]}>
              <Logo markSize={32} textClassName={classMap["k_text_sm_font_bold_27"]} className="opacity-90" />
            </div>
          </div>
        </div>
        
        {/* Scrollable content area */}
        <div className={classMap["k_flex_1_overflow_y_auto_px_4_sm_px_6_pb_8_28"]}>
          <Tabs
            value={authModalTab}
            onValueChange={(v) => {
              useAppStore.getState().openAuthModal(v as "login" | "signup");
              resetForms();
            }}
          >
            {/* Modern pill-style tabs */}
            <TabsList className={classMap["k_mx_auto_flex_w_full_max_w_sm_bg_muted_30_29"]}>
              <TabsTrigger
                value="login"
                className={cn(
                  "rounded-full flex-1 transition-all duration-300 font-semibold text-sm",
                  "data-[state=active]:bg-gradient-to-br data-[state=active]:from-gold data-[state=active]:to-gold/90",
                  "data-[state=active]:text-gold-foreground",
                  "data-[state=active]:shadow-lg data-[state=active]:shadow-gold/25",
                  "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
                )}
              >
                Connexion
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className={cn(
                  "rounded-full flex-1 transition-all duration-300 font-semibold text-sm",
                  "data-[state=active]:bg-gradient-to-br data-[state=active]:from-gold data-[state=active]:to-gold/90",
                  "data-[state=active]:text-gold-foreground",
                  "data-[state=active]:shadow-lg data-[state=active]:shadow-gold/25",
                  "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
                )}
              >
                Inscription
              </TabsTrigger>
            </TabsList>

            {/* ──────── LOGIN TAB ──────── */}
            <TabsContent value="login" className="mt-0">
              <div className={classMap["k_text_center_mb_4_30"]}>
                <DialogTitle className={classMap["k_text_xl_font_bold_tracking_tight_mb_1_5_31"]}>
                  Bon retour parmi nous
                </DialogTitle>
                <DialogDescription className={classMap["k_text_sm_text_muted_foreground_32"]}>
                  Connectez-vous pour accéder à vos créations
                </DialogDescription>
              </div>

              <form onSubmit={handleLogin} className={classMap["k_flex_flex_col_gap_3_33"]}>
                {/* Email */}
                <div className={classMap["k_flex_flex_col_gap_1_5_34"]}>
                  <Label htmlFor="login-email" className={classMap["k_text_sm_font_medium_35"]}>
                    Adresse email
                  </Label>
                  <StyledInput
                    id="login-email"
                    type="email"
                    placeholder="votre@email.com"
                    required
                    value={loginEmail}
                    onChange={handleLoginEmailChange}
                    leftIcon={<Mail />}
                    success={loginEmailValid && loginEmail.length > 0}
                    error={loginEmail.length > 0 && !loginEmailValid}
                    disabled={loginLoading}
                    autoComplete="email"
                  />
                </div>

                {/* Password */}
                <div className={classMap["k_flex_flex_col_gap_1_5_34"]}>
                  <div className={classMap["k_flex_items_center_justify_between_36"]}>
                    <Label htmlFor="login-password" className={classMap["k_text_sm_font_medium_35"]}>
                      Mot de passe
                    </Label>
                    <button 
                      type="button" 
                      className={classMap["k_text_xs_text_gold_hover_text_gold_80_fon_37"]}
                    >
                      Oublié ?
                    </button>
                  </div>
                  <StyledInput
                    id="login-password"
                    type={showLoginPassword ? "text" : "password"}
                    placeholder={t("auto.k_votre_mot_de_passe_38")}
                    required
                    value={loginPassword}
                    onChange={handleLoginPasswordChange}
                    leftIcon={<Lock />}
                    rightIcon={showLoginPassword ? <EyeOff /> : <Eye />}
                    onRightIconClick={() => setShowLoginPassword(!showLoginPassword)}
                    success={loginPasswordValid && loginPassword.length > 0}
                    disabled={loginLoading}
                    autoComplete="current-password"
                  />
                </div>

                {/* Error */}
                {loginError && (
                  <div className={classMap["k_flex_items_center_gap_2_p_3_rounded_lg_b_39"]}>
                    <AlertCircle className={classMap["k_size_4_flex_shrink_0_40"]} />
                    <span>{loginError}</span>
                  </div>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  className={cn(
                    "w-full h-11 mt-2 font-bold text-sm tracking-wide",
                    "bg-gradient-to-br from-gold to-gold/90 text-gold-foreground",
                    "hover:shadow-lg hover:shadow-gold/25 hover:-translate-y-0.5",
                    "active:translate-y-0 active:shadow-md",
                    "transition-all duration-200"
                  )}
                  disabled={loginLoading}
                >
                  {loginLoading ? (
                    <>
                      <Loader2 className={classMap["k_mr_2_animate_spin_41"]} />
                      Connexion...
                    </>
                  ) : (
                    "Se connecter"
                  )}
                </Button>

                {/* OAuth */}
                <OAuthButtons 
                  loading={loginLoading} 
                  onOAuth={(p) => handleOAuth(p, false)} 
                />

                {/* Switch to signup */}
                <p className={classMap["k_text_muted_foreground_text_center_text_s_42"]}>
                  Pas de compte ?{" "}
                  <button
                    type="button"
                    className={classMap["k_text_gold_hover_text_gold_80_font_semibo_43"]}
                    onClick={() => {
                      resetForms();
                      useAppStore.getState().openAuthModal("signup");
                    }}
                  >
                    S'inscrire gratuitement
                  </button>
                </p>
              </form>
            </TabsContent>

            {/* ──────── SIGNUP TAB ──────── */}
            <TabsContent value="signup" className="mt-0">
              <div className={classMap["k_text_center_mb_4_30"]}>
                <DialogTitle className={classMap["k_text_xl_font_bold_tracking_tight_mb_1_5_31"]}>
                  Créez votre compte
                </DialogTitle>
                <DialogDescription className={classMap["k_text_sm_text_muted_foreground_32"]}>
                  Rejoignez UnifyFocus et commencez à créer
                </DialogDescription>
              </div>

              <form onSubmit={handleSignup} className={classMap["k_flex_flex_col_gap_3_33"]}>
                {/* Name */}
                <div className={classMap["k_flex_flex_col_gap_1_5_34"]}>
                  <Label htmlFor="signup-name" className={classMap["k_text_sm_font_medium_35"]}>
                    Nom complet
                  </Label>
                  <StyledInput
                    id="signup-name"
                    placeholder={t("auto.k_votre_nom_44")}
                    required
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    leftIcon={<UserIcon />}
                    disabled={signupLoading}
                    autoComplete="name"
                    minLength={2}
                  />
                </div>

                {/* Email */}
                <div className={classMap["k_flex_flex_col_gap_1_5_34"]}>
                  <Label htmlFor="signup-email" className={classMap["k_text_sm_font_medium_35"]}>
                    Adresse email
                  </Label>
                  <StyledInput
                    id="signup-email"
                    type="email"
                    placeholder="votre@email.com"
                    required
                    value={signupEmail}
                    onChange={handleSignupEmailChange}
                    leftIcon={<Mail />}
                    success={signupEmailValid && signupEmail.length > 0}
                    error={signupEmail.length > 0 && !signupEmailValid}
                    disabled={signupLoading}
                    autoComplete="email"
                  />
                </div>

                {/* Password */}
                <div className={classMap["k_flex_flex_col_gap_1_5_34"]}>
                  <Label htmlFor="signup-password" className={classMap["k_text_sm_font_medium_35"]}>
                    Mot de passe
                  </Label>
                  <StyledInput
                    id="signup-password"
                    type={showSignupPassword ? "text" : "password"}
                    placeholder={t("auto.k_choisir_un_mot_de_passe_45")}
                    required
                    value={signupPassword}
                    onChange={handleSignupPasswordChange}
                    leftIcon={<Lock />}
                    rightIcon={showSignupPassword ? <EyeOff /> : <Eye />}
                    onRightIconClick={() => setShowSignupPassword(!showSignupPassword)}
                    success={signupPasswordValid && signupPassword.length > 0}
                    error={signupPassword.length > 0 && !signupPasswordValid}
                    disabled={signupLoading}
                    autoComplete="new-password"
                  />
                  <PasswordStrength password={signupPassword} />
                </div>

                {/* Confirm Password */}
                <div className={classMap["k_flex_flex_col_gap_1_5_34"]}>
                  <Label htmlFor="signup-confirm-password" className={classMap["k_text_sm_font_medium_35"]}>
                    Confirmer le mot de passe
                  </Label>
                  <StyledInput
                    id="signup-confirm-password"
                    type={showSignupConfirmPassword ? "text" : "password"}
                    placeholder={t("auto.k_confirmer_votre_mot_de_passe_46")}
                    required
                    value={signupConfirmPassword}
                    onChange={handleSignupConfirmPasswordChange}
                    leftIcon={<Lock />}
                    rightIcon={showSignupConfirmPassword ? <EyeOff /> : <Eye />}
                    onRightIconClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                    success={confirmPasswordValid && signupConfirmPassword.length > 0}
                    error={signupConfirmPassword.length > 0 && !confirmPasswordValid}
                    disabled={signupLoading}
                    autoComplete="new-password"
                  />
                  {signupConfirmPassword.length > 0 && !confirmPasswordValid && (
                    <p className={classMap["k_text_xs_text_destructive_mt_0_5_47"]}>
                      Les mots de passe ne correspondent pas
                    </p>
                  )}
                  {confirmPasswordValid && signupConfirmPassword.length > 0 && (
                    <p className={classMap["k_text_xs_text_green_600_mt_0_5_48"]}>
                      Les mots de passe correspondent
                    </p>
                  )}
                </div>

                {/* Password requirements */}
                <div className={classMap["k_text_10px_text_muted_foreground_leading__49"]}>
                  Le mot de passe doit contenir au moins 12 caractères avec : une majuscule, une minuscule, un chiffre et un caractère spécial.
                </div>

                {/* Error */}
                {signupError && (
                  <div className={classMap["k_flex_items_center_gap_2_p_3_rounded_lg_b_39"]}>
                    <AlertCircle className={classMap["k_size_4_flex_shrink_0_40"]} />
                    <span>{signupError}</span>
                  </div>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  className={cn(
                    "w-full h-11 mt-2 font-bold text-sm tracking-wide",
                    "bg-gradient-to-br from-gold to-gold/90 text-gold-foreground",
                    "hover:shadow-lg hover:shadow-gold/25 hover:-translate-y-0.5",
                    "active:translate-y-0 active:shadow-md",
                    "transition-all duration-200"
                  )}
                  disabled={signupLoading}
                >
                  {signupLoading ? (
                    <>
                      <Loader2 className={classMap["k_mr_2_animate_spin_41"]} />
                      Création en cours...
                    </>
                  ) : (
                    "Créer mon compte"
                  )}
                </Button>

                {/* OAuth */}
                <OAuthButtons 
                  loading={signupLoading} 
                  onOAuth={(p) => handleOAuth(p, true)} 
                />

                {/* Switch to login */}
                <p className={classMap["k_text_muted_foreground_text_center_text_s_42"]}>
                  Déjà un compte ?{" "}
                  <button
                    type="button"
                    className={classMap["k_text_gold_hover_text_gold_80_font_semibo_43"]}
                    onClick={() => {
                      resetForms();
                      useAppStore.getState().openAuthModal("login");
                    }}
                  >
                    Se connecter
                  </button>
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}