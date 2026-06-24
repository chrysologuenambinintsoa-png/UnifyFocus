"use client";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";

import { useState, useEffect, useRef } from "react";
import { acquireCheckout, isCheckoutPending, releaseCheckout } from '@/lib/checkoutLock';
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AnimatePresence } from "framer-motion"; // Add this import
import { useTheme } from "next-themes";
import {
  Sparkles,
  FileText,
  ImageIcon,
  Video,
  BarChart3,
  Cpu,
  ShieldCheck,
  MessageSquare,
  Download,
  Menu,
  Sun,
  Moon,
  Twitter,
  LayoutDashboard,
  PenTool,
  User,
  LogOut,
  Check,
  ArrowRight,
  Play,
  Monitor,
  HelpCircle,
  Link as LinkIcon,
  Type,
  Zap,
  MousePointer2,
} from "lucide-react";

import { Logo } from "@/components/ui/logo";

import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const scaleOnHover = {
  rest: { scale: 1 },
  hover: { scale: 1.03, transition: { duration: 0.2 } },
};

const features = [
  {
    icon: FileText,
    title: "Génération de Texte",
    description:
      "Créez du contenu captivant, articles, scripts et plus encore avec nos modèles de langage avancés.",
  },
  {
    icon: ImageIcon,
    title: "Création d'Images",
    description:
      "Transformez vos idées en visuels époustouflants grâce à l'IA générative d'images.",
  },
  {
    icon: Video,
    title: "Production Vidéo",
    description:
      "Générez des clips vidéo courts et des animations directement à partir de descriptions textuelles.",
  },
  {
    icon: BarChart3,
    title: "Analyse de Données",
    description:
      "Analysez et visualisez des ensembles de données complexes avec des insights actionnables.",
  },
  {
    icon: Cpu,
    title: "Multi-Modèles IA",
    description:
      "Accédez à GPT, Claude, Stable Diffusion et Runway depuis une interface unifiée.",
  },
  {
    icon: ShieldCheck,
    title: "Sécurité RGPD",
    description:
      "Vos données sont protégées et conformes aux réglementations européennes.",
  },
];

const steps = [
  {
    icon: MessageSquare,
    title: "Décrivez votre idée",
    description: "Entrez votre prompt et sélectionnez le type de contenu souhaité.",
  },
  {
    icon: Sparkles,
    title: "L'IA crée pour vous",
    description: "Nos modèles IA travaillent en arrière-plan pour générer votre contenu.",
  },
  {
    icon: Download,
    title: "Téléchargez et partagez",
    description: "Récupérez vos créations en un clic et partagez-les avec le monde.",
  },
];

const pricingPlans = [
  {
    id: "free",
    name: "Gratuit",
    price: "0€",
    period: "/mois",
    features: ["50 crédits", "Génération texte", "1 image/jour", "Support basique"],
    buttonLabel: "Commencer",
    buttonVariant: "outline" as const,
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "29€",
    period: "/mois",
    features: [
      "500 crédits",
      "Tout type de génération",
      "Priorité IA",
      "Support prioritaire",
    ],
    buttonLabel: "Choisir Pro",
    buttonVariant: "default" as const,
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "99€",
    period: "/mois",
    features: [
      "5000 crédits",
      "API dédiée",
      "Personnalisation",
      "Account manager",
    ],
    buttonLabel: "Passer à Enterprise",
    buttonVariant: "outline" as const,
    highlighted: false,
  },
];

export default function LandingView() {
  const { theme, setTheme } = useTheme();
  const {
    setCurrentView,
    openAuthModal,
    isAuthenticated,
    user,
    logout,
    setAuth,
    setMobileMenuOpen,
    mobileMenuOpen,
  } = useAppStore();
  const [upgradingPlan, setUpgradingPlan] = useState(false);
  const pendingCheckoutRef = useRef<string | null>(null);
  const { t } = useTranslation();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoTab, setDemoTab] = useState(0);
  const [demoSlideIndex, setDemoSlideIndex] = useState(0);

  useEffect(() => {
    const checkoutState = searchParams.get("checkout");
    if (!checkoutState) return;

    const handleStripeReturn = async () => {
      if (checkoutState === "success") {
        try {
          // Wait for webhook to process (Stripe can take 1-3 seconds)
          await new Promise((r) => setTimeout(r, 2000));

          const res = await fetch("/api/auth/me");
          if (res.ok) {
            const data = await res.json();
            if (data?.user) {
              console.log(
                "[Checkout] User data after success:",
                JSON.stringify({ plan: data.user.plan, credits: data.user.credits }, null, 2)
              );
              setAuth(data.user);
              setCurrentView("dashboard");
            }
          }
        } catch (err) {
          console.error("Unable to refresh user after checkout:", err);
        }

        toast({
          title: "Paiement réussi",
          description: "Votre abonnement est activé.",
        });
      }

      if (checkoutState === "cancel") {
        toast({
          title: "Paiement annulé",
          description: "Le paiement a été annulé. Vous pouvez réessayer.",
        });
      }

      window.history.replaceState({}, document.title, window.location.pathname);
    };

    handleStripeReturn();
  }, [searchParams, setAuth, setCurrentView, toast]);

  // Demo slides data for video-like rotation
  const textSlides = [
    {
      prompt: '"Écris un article de blog sur les avantages de l\'IA générative pour les créateurs de contenu..."',
      result: "L'IA générative révolutionne la façon dont les créateurs de contenu travaillent. En automatisant les tâches répétitives et en offrant des suggestions créatives, ces outils permettent aux professionnels de se concentrer sur ce qui compte vraiment : leur vision artistique."
    },
    {
      prompt: '"Rédige une description produit pour des écouteurs sans fil..."',
      result: "Découvrez une expérience audio immersive avec nos écouteurs sans fil de dernière génération. Design ergonomique, réduction de bruit active et 24h d'autonomie pour vous accompagner partout."
    },
    {
      prompt: '"Écris un email professionnel pour proposer un partenariat..."',
      result: "Bonjour, Notre entreprise souhaite explorer une collaboration stratégique avec votre organisation. Nos solutions complémentaires pourraient créer une valeur significative pour nos clients respectifs."
    },
    {
      prompt: '"Rédige un post LinkedIn sur l\'innovation technologique..."',
      result: "🚀 L'innovation ne se limite pas à créer de nouvelles technologies. Il s'agit de repenser la façon dont nous résolvons les problèmes quotidiens. Chez UnifyFocus, nous croyons que l'IA est un catalyseur qui amplifie la créativité humaine plutôt que de la remplacer."
    },
    {
      prompt: '"Écris une fiche produit pour une application de méditation..."',
      result: "ZenMind vous accompagne dans votre voyage vers la sérénité intérieure. Avec plus de 500 séances guidées, des programmes personnalisés et un suivi de progression, trouvez l'équilibre parfait entre corps et esprit en seulement 10 minutes par jour."
    },
    {
      prompt: '"Génère un script pour une vidéo YouTube sur la productivité..."',
      result: "Intro : Savez-vous que nous prenons plus de 35 000 décisions par jour ? Dans cette vidéo, je vous révèle 5 techniques scientifiquement prouvées pour optimiser votre productivité sans tomber dans le burn-out. Restez jusqu'à la fin pour le bonus exclusif !"
    }
  ];

  const imageSlides = [
    {
      prompt: '"Un paysage de montagne au coucher du soleil, style peinture numérique, couleurs chaudes..."',
      gradient: "from-orange-400 via-pink-500 to-purple-600"
    },
    {
      prompt: '"Un portrait futuriste avec des éléments cybernétiques, néons bleus et violets..."',
      gradient: "from-cyan-400 via-blue-500 to-purple-600"
    },
    {
      prompt: '"Une forêt enchantée avec des champignons luminescents, style conte de fées..."',
      gradient: "from-emerald-400 via-green-500 to-teal-600"
    },
    {
      prompt: '"Une station spatiale orbitale avec vue sur la Terre, style science-fiction..."',
      gradient: "from-slate-800 via-blue-900 to-indigo-950"
    },
    {
      prompt: '"Un café parisien vintage, ambiance années 1920, lumière tamisée..."',
      gradient: "from-amber-700 via-orange-800 to-red-900"
    },
    {
      prompt: '"Un jardin japonais avec cerisiers en fleurs, style aquarelle..."',
      gradient: "from-pink-300 via-rose-400 to-sakura-500"
    },
    {
      prompt: '"Une voiture de sport électrique futuriste, design aérodynamique..."',
      gradient: "from-gray-800 via-slate-700 to-silver-600"
    }
  ];

  const videoSlides = [
    {
      prompt: '"Une animation montrant la croissance d\'une plante, accéléré, style documentaire nature..."',
      progress: 88
    },
    {
      prompt: '"Un logo animé qui tourne en 3D avec effet de particules..."',
      progress: 65
    },
    {
      prompt: '"Une transition fluide entre jour et nuit sur un paysage urbain..."',
      progress: 92
    },
    {
      prompt: '"Une présentation animée de produit avec effet de zoom dynamique..."',
      progress: 78
    },
    {
      prompt: '"Une infographie animée montrant des statistiques en temps réel..."',
      progress: 95
    },
    {
      prompt: '"Un tutoriel animé expliquant le fonctionnement d\'une application..."',
      progress: 56
    }
  ];

  // Seed photos data - sample generated images
  const seedPhotos = [
    { title: "Portrait Cyberpunk", gradient: "from-cyan-400 via-blue-500 to-purple-600", seed: "seed_42891" },
    { title: "Paysage Alpin", gradient: "from-orange-400 via-pink-500 to-purple-600", seed: "seed_78234" },
    { title: "Forêt Enchantée", gradient: "from-emerald-400 via-green-500 to-teal-600", seed: "seed_15672" },
    { title: "Station Spatiale", gradient: "from-slate-800 via-blue-900 to-indigo-950", seed: "seed_93401" },
    { title: "Café Parisien", gradient: "from-amber-700 via-orange-800 to-red-900", seed: "seed_56128" },
    { title: "Jardin Zen", gradient: "from-pink-300 via-rose-400 to-sakura-500", seed: "seed_82947" },
    { title: "Voiture Futuriste", gradient: "from-gray-800 via-slate-700 to-silver-600", seed: "seed_31056" },
    { title: "Océan Tropical", gradient: "from-cyan-500 via-blue-600 to-indigo-700", seed: "seed_67823" },
  ];

  // Seed videos data - sample generated videos
  const seedVideos = [
    { title: "Animation Logo 3D", progress: 100, duration: "0:15", seed: "seed_v42891" },
    { title: "Timelapse Nature", progress: 100, duration: "0:30", seed: "seed_v78234" },
    { title: "Transition Urbaine", progress: 100, duration: "0:12", seed: "seed_v15672" },
    { title: "Présentation Produit", progress: 100, duration: "0:45", seed: "seed_v93401" },
    { title: "Infographie Animée", progress: 100, duration: "0:20", seed: "seed_v56128" },
    { title: "Tutoriel App", progress: 100, duration: "1:30", seed: "seed_v82947" },
  ];

  // Auto-rotate slides when demo modal is open
  useEffect(() => {
    if (!showDemoModal) return;
    const interval = setInterval(() => {
      setDemoSlideIndex((prev) => prev + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, [showDemoModal]);

  // Mockup internal state for animated demo
  const [activeMockTab, setActiveMockTab] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveMockTab((prev) => (prev + 1) % 3);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const handlePrimaryAction = () => {
    if (isAuthenticated) {
      setCurrentView("dashboard");
    } else {
      openAuthModal("signup");
    }
  };

  const handleLoginClick = () => {
    if (isAuthenticated) {
      setCurrentView("dashboard");
    } else {
      openAuthModal("login");
    }
  };

  const handleSelectPlan = async (plan: string) => {
    if (plan === "free") {
      handlePrimaryAction();
      return;
    }

    if (!isAuthenticated) {
      openAuthModal("signup");
      return;
    }

    if (!user) {
      openAuthModal("login");
      return;
    }

    const key = `${user?.id}:${plan}`;
    if (pendingCheckoutRef.current === key) return;
    if (isCheckoutPending(key)) return;
    if (!acquireCheckout(key)) return;
    pendingCheckoutRef.current = key;
    setUpgradingPlan(true);
    try {
      const res = await fetch("/api/user/subscription/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, newPlan: plan }),
      });
      const data = await res.json();
      if (res.status === 409) {
        toast({
          title: "Session en cours",
          description: "Une session de paiement est déjà en cours. Patientez quelques instants et réessayez.",
        });
        setUpgradingPlan(false);
        pendingCheckoutRef.current = null;
        releaseCheckout(key);
        return;
      }

      if (!res.ok || !data.url) {
        throw new Error(data.error || "Impossible de créer la session de paiement");
      }

      // Release lock just before navigating away
      pendingCheckoutRef.current = null;
      releaseCheckout(key);
      window.location.assign(data.url);
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de démarrer le paiement.",
        variant: "destructive",
      });
      setUpgradingPlan(false);
      pendingCheckoutRef.current = null;
      releaseCheckout(key);
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <>
      <main className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/40">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Logo
            markSize={44}
            textClassName="text-lg sm:text-xl"
            onClick={() => setCurrentView("landing")}
            className="transition-transform duration-200 hover:scale-105"
          />

          {/* Center Nav Links (desktop) */}
          <nav className="hidden md:flex items-center gap-8">
            {[
              { id: "features", label: "Fonctionnalités" },
              { id: "pricing", label: "Tarifs" },
              { id: "how-it-works", label: "À propos" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground px-3 py-2"
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="hidden sm:flex items-center gap-4 mr-2">
               <Button
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={handleLoginClick}
                >
                  Connexion
                </Button>
            </div>

            <Separator orientation="vertical" className="h-6 mx-2 hidden sm:block" />

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Changer le thème"
            >
              <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>

            {isAuthenticated && user ? (
              /* Authenticated: Avatar + Dropdown */
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative size-9 rounded-full">
                    <Avatar className="size-8">
                      {user.avatar && <AvatarImage src={user.avatar} alt={user.name ?? ""} />}
                      <AvatarFallback className="bg-gold/20 text-gold text-xs font-semibold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium">{user.name ?? "Utilisateur"}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link href="/" passHref>
                    <DropdownMenuItem>
                      <LayoutDashboard className="mr-2 size-4" />
                      Dashboard
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/editor" passHref>
                    <DropdownMenuItem>
                      <PenTool className="mr-2 size-4" />
                      Éditeur IA
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/profile" passHref>
                    <DropdownMenuItem>
                      <User className="mr-2 size-4" />
                      Profil
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/help" passHref>
                    <DropdownMenuItem>
                      <HelpCircle className="mr-2 size-4" />
                      Aide & Documentation
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => logout()}
                  >
                    <LogOut className="mr-2 size-4" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              /* Unauthenticated: Login + CTA */
              <>
                 <Button className="hidden sm:inline-flex bg-gold text-gold-foreground hover:bg-gold/90" onClick={handlePrimaryAction}>
                    Commencer
                  </Button>
              </>
            )}

            {/* Mobile Hamburger */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="size-5" />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
              <SheetHeader className="pb-4 border-b border-border/50 mb-4">
                <div className="flex items-center justify-center">
                  <Logo markSize={40} textClassName="text-lg font-bold" />
                </div>
              </SheetHeader>
                <nav className="flex flex-col gap-1 px-4 pt-4">
                  <button
                    onClick={() => {
                      scrollToSection("features");
                      setMobileMenuOpen(false);
                    }}
                    className="rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground text-left"
                  >
                    Fonctionnalités
                  </button>
                  <button
                    onClick={() => {
                      scrollToSection("pricing");
                      setMobileMenuOpen(false);
                    }}
                    className="rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground text-left"
                  >
                    Tarifs
                  </button>
                  <button
                    onClick={() => {
                      scrollToSection("how-it-works");
                      setMobileMenuOpen(false);
                    }}
                    className="rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground text-left"
                  >
                    À propos
                  </button>
                  <Separator className="my-3" />
                  {isAuthenticated && user ? (
                    <>
                      <Link href="/" passHref>
                        <button
                          onClick={() => setMobileMenuOpen(false)}
                          className="rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground text-left w-full"
                        >
                          Dashboard
                        </button>
                      </Link>
                      <Link href="/editor" passHref>
                        <button
                          onClick={() => setMobileMenuOpen(false)}
                          className="rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground text-left w-full"
                        >
                          Éditeur IA
                        </button>
                      </Link>
                      <Link href="/profile" passHref>
                        <button
                          onClick={() => setMobileMenuOpen(false)}
                          className="rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground text-left w-full"
                        >
                          Profil
                        </button>
                      </Link>
                      <Link href="/help" passHref>
                        <button
                          onClick={() => setMobileMenuOpen(false)}
                          className="rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground text-left w-full"
                        >
                          Aide & Documentation
                        </button>
                      </Link>
                      <Separator className="my-3" />
                      <button
                        onClick={() => {
                          logout();
                          setMobileMenuOpen(false);
                        }}
                        className="rounded-md px-3 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10 text-left"
                      >
                        Déconnexion
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2 pt-1">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          openAuthModal("login");
                          setMobileMenuOpen(false);
                        }}
                      >
                        Connexion
                      </Button>
                      <Button
                        className="w-full bg-gold text-gold-foreground hover:bg-gold/90"
                        onClick={() => {
                          handlePrimaryAction();
                          setMobileMenuOpen(false);
                        }}
                      >
                        Commencer
                      </Button>
                    </div>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* ─── HERO SECTION ─── */}
      <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden bg-grid px-4 py-20 sm:px-6 lg:px-8">
        {/* Animated background elements */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Main glow orbs */}
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-1/4 top-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/5 blur-3xl"
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute right-1/4 bottom-1/4 h-[400px] w-[400px] rounded-full bg-gold/3 blur-3xl"
          />
          {/* Floating particles */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute size-2 rounded-full bg-gold/20"
              style={{
                left: `${15 + i * 15}%`,
                top: `${20 + (i % 3) * 20}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0, 0.5, 0],
              }}
              transition={{
                duration: 4 + i * 0.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.3,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="flex flex-col items-center gap-6"
          >
            {/* Badge */}
            <motion.div variants={fadeIn}>
              <Badge
                variant="outline"
                className="border-gold/30 bg-gold/10 text-gold px-4 py-1.5 text-sm"
              >
                <Zap className="mr-1.5 size-3.5" />
                Propulsé par l&apos;IA de nouvelle génération
              </Badge>
            </motion.div>

            {/* Heading */}
            <motion.h1
              variants={fadeInUp}
              className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
            >
              <span className="gradient-text">{t("auto.k_cr_ez_l_apos_extraordinaire_279")}</span>
              <br />
              <span className="text-foreground">{t("auto.k_avec_l_apos_ia_280")}</span>
            </motion.h1>

            {/* Subheading */}
            <motion.p
              variants={fadeInUp}
              className="max-w-2xl text-base text-muted-foreground sm:text-lg md:text-xl"
            >
              Unifiez tous vos outils de création IA en une seule plateforme.
              Texte, images, vidéos — tout est possible avec UnifyFocus.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeInUp} className="flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="bg-gold text-gold-foreground hover:bg-gold/90 px-8 text-base"
                onClick={handlePrimaryAction}
              >
                Démarrer gratuitement
                <ArrowRight className="ml-1 size-4" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="px-8 text-base"
                onClick={() => {
                  setShowDemoModal(true);
                  setDemoTab(0);
                }}
              >
                <Play className="mr-1.5 size-4" />
                Voir la démo
              </Button>
            </motion.div>
          </motion.div>

          {/* Mockup Card */}
          <motion.div
            initial={{ opacity: 0, y: 100, rotateX: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
            transition={{ 
              duration: 1.4, 
              delay: 0.4, 
              ease: [0.16, 1, 0.3, 1] 
            }}
            whileHover={{ 
              y: -12,
              transition: { duration: 0.4, ease: "easeOut" }
            }}
            className="mt-16"
            style={{ perspective: "1200px" }}
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <Card className="mx-auto max-w-4xl overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm shadow-2xl shadow-gold/5">
                {/* Mockup Header */}
                <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="size-3 rounded-full bg-red-500/70" />
                  <div className="size-3 rounded-full bg-yellow-500/70" />
                  <div className="size-3 rounded-full bg-green-500/70" />
                </div>
                <div className="ml-3 flex-1">
                  <div className="mx-auto h-6 max-w-sm rounded-md bg-muted/60" />
                </div>
              </div>
              {/* Mockup Body */}
              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr]">
                {/* Sidebar */}
                <div className="hidden border-r border-border/50 p-4 md:block">
                  {/* Animated Cursor */}
                  <motion.div
                    className="absolute z-20 pointer-events-none drop-shadow-lg"
                    animate={{ 
                      x: 36,
                      y: activeMockTab * 30 + 21, 
                      opacity: 1
                    }}
                    initial={{ opacity: 0 }}
                    transition={{ 
                      opacity: { delay: 1.2 },
                      type: "spring", stiffness: 80, damping: 15 
                    }}
                  >
                    <motion.div
                      animate={{ scale: [1, 0.8, 1] }}
                      transition={{ duration: 0.3, delay: 0.1, repeat: Infinity, repeatDelay: 3.2 }}
                    >
                      <MousePointer2 className="size-5 fill-white stroke-black" />
                    </motion.div>
                  </motion.div>

                  <div className="flex flex-col gap-3">
                    {[
                      { icon: Type, label: "Texte" },
                      { icon: ImageIcon, label: "Image" },
                      { icon: Video, label: "Vidéo" },
                    ].map((item, i) => {
                      const isActive = activeMockTab === i;
                      return (
                      <motion.div
                        key={item.label}
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.8 + i * 0.1, duration: 0.4 }}
                        className={`flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-all duration-500 ${
                          isActive
                            ? "bg-gold/15 text-gold shadow-[0_0_15px_rgba(251,191,36,0.15)]"
                            : "text-muted-foreground/40"
                        }`}
                      >
                        <item.icon className="size-4" />
                        <span className="font-medium">{item.label}</span>
                        {isActive && (
                          <motion.div 
                            layoutId="mock-active-dot"
                            className="ml-auto size-1.5 rounded-full bg-gold"
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        )}
                      </motion.div>
                      );
                    })}
                  </div>
                </div>
                {/* Main area */}
                <div className="p-5">
                  <motion.div 
                    key={`status-${activeMockTab}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground"
                  >
                    <Sparkles className="size-4 text-gold animate-pulse" />
                    {activeMockTab === 0 ? "IA en cours de rédaction..." : 
                     activeMockTab === 1 ? "IA en cours de génération..." : 
                     "IA en cours de production..."}
                  </motion.div>
                  
                  {/* Animated Text Skeleton */}
                  {activeMockTab === 0 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-4 h-20 rounded-lg border border-border/50 bg-muted/30 p-3"
                  >
                    {[0.8, 0.5, 0.7].map((width, i) => (
                      <motion.div
                        key={i}
                        initial={{ width: 0 }}
                        animate={{ width: `${width * 100}%` }}
                        transition={{ duration: 1.5, delay: i * 0.2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                        className="mt-2 h-3 rounded bg-muted-foreground/10 first:mt-0"
                      />
                    ))}
                  </motion.div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {/* Photo Generation Sim */}
                    <motion.div
                      className={`relative h-24 overflow-hidden rounded-lg border transition-all duration-500 ${
                        activeMockTab === 1 ? "border-gold/30 bg-gold/5 shadow-[0_0_20px_rgba(251,191,36,0.1)]" : "border-border/50 bg-muted/20"
                      }`}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ImageIcon className="size-6 text-muted-foreground/20" />
                      </div>
                      <motion.div 
                        animate={{ top: ["-10%", "110%"] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 h-1 w-full bg-gold/40 blur-sm"
                      />
                      <motion.div 
                        animate={{ opacity: [0.1, 0.3, 0.1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 bg-gold/5"
                      />
                      <div className="absolute bottom-2 left-2 flex gap-1">
                        <div className="h-1.5 w-8 rounded-full bg-gold/30" />
                        <div className="h-1.5 w-4 rounded-full bg-gold/20" />
                      </div>
                    </motion.div>

                    {/* Video Generation Sim */}
                    <motion.div 
                      className={`h-20 rounded-lg border p-3 flex flex-col justify-between transition-all duration-500 ${
                        activeMockTab === 2 ? "border-gold/40 bg-gold/10 shadow-[0_0_20px_rgba(251,191,36,0.15)]" : "border-gold/20 bg-gold/5"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="size-6 rounded-md bg-gold/20 flex items-center justify-center">
                          <Play className="size-3 text-gold fill-gold" />
                        </div>
                        <Badge variant="outline" className="text-[9px] h-4 px-1 border-gold/20 text-gold/80">PRO</Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <div className="space-y-1">
                            <div className="h-1.5 w-12 rounded-full bg-gold/30" />
                            <div className="h-1 w-8 rounded-full bg-gold/10" />
                          </div>
                          <span className="text-[9px] text-gold/50 font-mono">88%</span>
                        </div>
                        <div className="h-1 w-full bg-gold/10 rounded-full overflow-hidden">
                          <motion.div 
                            animate={{ width: ["0%", "88%", "0%"] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="h-full bg-gold"
                          />
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── FEATURES SECTION ─── */}
      <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Tout ce dont vous avez besoin
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="mt-4 text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto"
            >
              Une suite complète d&apos;outils IA pour répondre à tous vos besoins créatifs.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((feature) => (
              <motion.div key={feature.title} variants={fadeInUp}>
                <motion.div
                  whileHover={{ scale: 1.02, y: -6 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="h-full"
                >
                  <Card className="h-full border border-border bg-card/80 backdrop-blur-sm transition-shadow hover:shadow-lg hover:shadow-gold/5">
                    <CardHeader>
                      <motion.div 
                        className="mb-3 flex size-12 items-center justify-center rounded-xl bg-gold/10 border border-gold/20"
                        whileHover={{ rotate: 5 }}
                        transition={{ duration: 0.2 }}
                      >
                        <feature.icon className="size-6 text-gold" />
                      </motion.div>
                      <CardTitle className="text-lg group-hover:text-gold transition-colors">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="-mt-2">
                      <CardDescription className="text-sm leading-relaxed text-muted-foreground/80">
                        {feature.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── HOW IT WORKS SECTION ─── */}
      <section id="how-it-works" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Comment ça marche
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="mt-4 text-muted-foreground text-base sm:text-lg max-w-xl mx-auto"
            >
              Trois étapes simples pour donner vie à vos idées.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-12"
          >
            {steps.map((step, index) => (
              <motion.div key={step.title} variants={fadeInUp} className="relative">
                {/* Connector line (desktop) */}
                {index < steps.length - 1 && (
                  <div className="absolute left-[calc(50%+40px)] top-10 hidden h-px w-[calc(100%-80px)] bg-gradient-to-r from-gold/40 to-transparent md:block" />
                )}
                <div className="flex flex-col items-center text-center">
                  {/* Step number */}
                  <div className="relative mb-5">
                    <div className="flex size-20 items-center justify-center rounded-2xl bg-gold/10 border border-gold/20">
                      <step.icon className="size-8 text-gold" />
                    </div>
                    <div className="absolute -right-2 -top-2 flex size-7 items-center justify-center rounded-full bg-gold text-gold-foreground text-xs font-bold shadow-md">
                      {index + 1}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 max-w-xs text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── PRICING SECTION ─── */}
      <section id="pricing" className="px-4 py-20 sm:px-6 lg:px-8 bg-background">
        <div className="mx-auto max-w-7xl ">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Tarifs simples et transparents
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="mt-4 text-muted-foreground text-base sm:text-lg max-w-xl mx-auto "
            >
              Choisissez le plan adapté à vos besoins. Évoluez à votre rythme.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8 items-start "
          >
            {pricingPlans.map((plan) => (
              <motion.div
                key={plan.name}
                variants={fadeInUp}
                className="flex justify-center"
              >
                <Card
                  className={`relative w-full max-w-sm ${
                    plan.highlighted
                      ? "border-gold/50 glow-gold"
                      : "border-border "
                  } bg-card`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gold text-gold-foreground border-0 px-3 py-1 text-xs font-semibold">
                        Populaire
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-2 ">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <div className="mt-3 flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground text-sm">{plan.period}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="flex flex-col gap-3 ">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2.5 text-sm">
                          <Check className="size-4 shrink-0 text-gold" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="">
                    <Button
                      variant={plan.buttonVariant}
                      className={`w-full ${
                        plan.highlighted
                          ? "bg-gold text-gold-foreground hover:bg-gold/90"
                          : ""
                      }`}
                      disabled={upgradingPlan}
                      onClick={() => handleSelectPlan(plan.id)}
                    >
                      {upgradingPlan && plan.highlighted ? (
                        <span className="flex items-center gap-2">
                          <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Mise à jour...
                        </span>
                      ) : (
                        plan.buttonLabel
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── CTA SECTION ─── */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 ">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-14 sm:px-12 sm:py-20">
            {/* Decorative glow */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-1/2 top-0 h-48 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/10 blur-3xl" />
              <div className="absolute bottom-0 left-1/4 h-32 w-64 rounded-full bg-gold/5 blur-3xl" />
            </div>
            <div className="relative z-10">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Prêt à transformer votre création ?
              </h2>
              <p className="mt-4 text-muted-foreground text-base sm:text-lg">
                Rejoignez des milliers de créatifs qui utilisent déjà UnifyFocus.
              </p>
              <Button
                size="lg"
                className="mt-8 bg-gold text-gold-foreground hover:bg-gold/90 px-8 text-base"
                onClick={handlePrimaryAction}
              >
                Créer mon compte gratuitement
                <ArrowRight className="ml-1.5 size-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="mt-auto border-t border-border/40 px-4 py-10 sm:px-6 lg:px-8 ">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 sm:flex-row sm:justify-between">
          {/* Logo + Copyright */}
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <Logo markSize={36} textClassName="text-sm sm:text-base" />
            <p className="text-xs text-muted-foreground">
              &copy; 2025 UnifyFocus. Tous droits réservés.
            </p>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6 text-sm text-muted-foreground ">
            <a href="/docs/confidentialite.html" className="transition-colors hover:text-foreground" target="_blank" rel="noopener noreferrer">Confidentialité</a>
            <a href="/docs/cgu.html" className="transition-colors hover:text-foreground" target="_blank" rel="noopener noreferrer">CGU</a>
            <a href="/docs/support.html" className="transition-colors hover:text-foreground">Contact</a>
          </nav>

          {/* Social Icons */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="size-9 text-muted-foreground hover:text-foreground">
              <Monitor className="size-4" />
              <span className="sr-only">Microsoft</span>
            </Button>
            <Button variant="ghost" size="icon" className="size-9 text-muted-foreground hover:text-foreground">
              <Twitter className="size-4" />
              <span className="sr-only">Twitter</span>
            </Button>
          </div>
        </div>
      </footer>
      </main>

      {/* Demo Modal */}
      <Dialog open={showDemoModal} onOpenChange={setShowDemoModal}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0 ">
          {/* Modal Header */}
          <div className="flex-shrink-0 p-6 pb-4 border-b border-border">
            <h2 className="text-xl font-bold">{t("auto.k_d_couvrez_unifyfocus_281")}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Essayez nos outils de création IA
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex-shrink-0 flex gap-1 p-2 border-b border-border ">
            {[
              { id: 0, label: "Texte", icon: Type },
              { id: 1, label: "Images", icon: ImageIcon },
              { id: 2, label: "Vidéos", icon: Video },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDemoTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                  demoTab === tab.id
                    ? "bg-gold/10 text-gold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <tab.icon className="size-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6 ">
            {/* Text Generation Demo */}
            {demoTab === 0 && (
              <motion.div
                key={`text-${demoSlideIndex % textSlides.length}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Prompt</label>
                  <div className="p-3 rounded-lg border border-border bg-muted/50 text-sm">
                    {textSlides[demoSlideIndex % textSlides.length].prompt}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="size-3 text-gold animate-pulse" />
                    <span className="text-gold">{t("auto.k_g_n_ration_en_cours_282")}</span>
                  </label>
                  {/* Skeleton writing animation */}
                  <div className="p-3 rounded-lg border border-gold/20 bg-gold/5">
                    <div className="space-y-2">
                      <motion.div
                        initial={{ width: "0%" }}
                        animate={{ width: ["0%", "85%", "95%", "100%"] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="h-2 rounded-full bg-gradient-to-r from-gold/50 to-gold"
                      />
                      <motion.div
                        initial={{ width: "0%" }}
                        animate={{ width: ["0%", "70%", "90%", "80%"] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                        className="h-2 rounded-full bg-gradient-to-r from-gold/50 to-gold"
                      />
                      <motion.div
                        initial={{ width: "0%" }}
                        animate={{ width: ["0%", "60%", "85%", "75%"] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                        className="h-2 rounded-full bg-gradient-to-r from-gold/50 to-gold"
                      />
                      <motion.div
                        initial={{ width: "0%" }}
                        animate={{ width: ["0%", "50%", "70%", "60%"] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                        className="h-2 rounded-full bg-gradient-to-r from-gold/50 to-gold"
                      />
                    </div>
                  </div>
                </div>
                {/* Progress indicators */}
                <div className="flex items-center justify-center gap-1.5 pt-2">
                  {textSlides.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all ${
                        i === demoSlideIndex % textSlides.length ? 'w-6 bg-gold' : 'w-1.5 bg-muted'
                      }`}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Image Generation Demo */}
            {demoTab === 1 && (
              <motion.div
                key={`image-${demoSlideIndex % imageSlides.length}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Prompt</label>
                  <div className="p-3 rounded-lg border border-border bg-muted/50 text-sm">
                    {imageSlides[demoSlideIndex % imageSlides.length].prompt}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="size-3 text-gold animate-pulse" />
                    <span className="text-gold">{t("auto.k_g_n_ration_en_cours_282")}</span>
                  </label>
                  {/* Image generation skeleton */}
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-muted/30 border border-border">
                    {/* Scanning line animation */}
                    <motion.div
                      animate={{ top: ["-10%", "110%"] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold/50 to-transparent blur-sm"
                    />
                    {/* Grid pattern */}
                    <div className="absolute inset-0 grid grid-cols-4 grid-rows-3 gap-px">
                      {[...Array(12)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0.1 }}
                          animate={{ opacity: [0.1, 0.4, 0.1] }}
                          transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
                          className="rounded bg-gold/10"
                        />
                      ))}
                    </div>
                    {/* Center icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <ImageIcon className="size-12 text-gold/40" />
                      </motion.div>
                    </div>
                    {/* Progress */}
                    <div className="absolute bottom-2 left-2 right-2">
                      <motion.div
                        initial={{ width: "0%" }}
                        animate={{ width: ["0%", "30%", "60%", "90%", "0%"] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="h-0.5 bg-gold/40 rounded-full"
                      />
                    </div>
                  </div>
                </div>
                {/* Progress indicators */}
                <div className="flex items-center justify-center gap-1.5 pt-2">
                  {imageSlides.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all ${
                        i === demoSlideIndex % imageSlides.length ? 'w-6 bg-gold' : 'w-1.5 bg-muted'
                      }`}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Video Generation Demo */}
            {demoTab === 2 && (
              <motion.div
                key={`video-${demoSlideIndex % videoSlides.length}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Script</label>
                  <div className="p-3 rounded-lg border border-border bg-muted/50 text-sm">
                    {videoSlides[demoSlideIndex % videoSlides.length].prompt}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="size-3 text-gold animate-pulse" />
                    <span className="text-gold">{t("auto.k_rendu_en_cours_283")}</span>
                  </label>
                  {/* Video generation skeleton */}
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-muted/30 border border-border">
                    {/* Filmstrip animation */}
                    <div className="absolute inset-0 flex items-center justify-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{
                            scaleY: [0.3, 1, 0.3],
                            opacity: [0.2, 0.6, 0.2],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            delay: i * 0.15,
                          }}
                          className="w-8 h-16 bg-gold/30 rounded-sm"
                        />
                      ))}
                    </div>
                    {/* Center play button with pulse */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-14 h-14 rounded-full bg-gold/30 flex items-center justify-center"
                      >
                        <Play className="size-6 text-gold/50 ml-0.5" />
                      </motion.div>
                    </div>
                    {/* Progress bar */}
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="w-3 h-3 border border-gold/40 border-t-gold rounded-full"
                        />
                        <span className="text-[10px] text-gold/60">{t("auto.k_rendu_vid_o_284")}</span>
                        <span className="text-[10px] text-gold/40 ml-auto font-mono">
                          {videoSlides[demoSlideIndex % videoSlides.length].progress}%
                        </span>
                      </div>
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: "0%" }}
                          animate={{ width: `${videoSlides[demoSlideIndex % videoSlides.length].progress}%` }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className="h-full bg-gradient-to-r from-gold/60 to-gold"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Progress indicators */}
                <div className="flex items-center justify-center gap-1.5 pt-2">
                  {videoSlides.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all ${
                        i === demoSlideIndex % videoSlides.length ? 'w-6 bg-gold' : 'w-1.5 bg-muted'
                      }`}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Photos Seed Demo */}
            {demoTab === 3 && (
              <motion.div
                key="seed-photos"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <p className="text-xs text-muted-foreground text-center">{t("auto.k_exemples_de_photos_g_n_r_es_285")}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {seedPhotos.map((photo, index) => (
                    <div
                      key={photo.seed}
                      className="relative aspect-square rounded-lg overflow-hidden border border-border"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${photo.gradient}`} />
                      <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-black/30 backdrop-blur-sm">
                        <p className="text-[10px] text-white truncate">{photo.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Videos Seed Demo */}
            {demoTab === 4 && (
              <motion.div
                key="seed-videos"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <p className="text-xs text-muted-foreground text-center">{t("auto.k_exemples_de_vid_os_g_n_r_es_286")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {seedVideos.map((video, index) => (
                    <div
                      key={video.seed}
                      className="relative aspect-video rounded-lg overflow-hidden border border-border bg-muted"
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-gold/60 flex items-center justify-center">
                          <Play className="size-4 text-gold-foreground ml-0.5" />
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/30 backdrop-blur-sm">
                        <p className="text-xs text-white truncate">{video.title}</p>
                        <p className="text-[10px] text-white/50">{video.duration}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex-shrink-0 flex items-center justify-between p-6 border-t border-border ">
            <p className="text-xs text-muted-foreground">
              Prêt à créer ?
            </p>
            <Button
              size="sm"
              className="bg-gold text-gold-foreground hover:bg-gold/90"
              onClick={() => {
                setShowDemoModal(false);
                handlePrimaryAction();
              }}
            >
              Commencer
              <ArrowRight className="ml-1.5 size-3.5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
