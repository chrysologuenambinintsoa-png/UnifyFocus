"use client";

import { classMap } from '@/styles/classMap';
import { useTranslation } from "@/lib/i18n";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import React from "react";
import { useAppStore } from "@/store/app-store";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { acquireCheckout, isCheckoutPending, releaseCheckout } from '@/lib/checkoutLock';

const pricingPlans = [
  {
    id: "free",
    name: "Gratuit",
    price: "0€",
    period: "/mois",
    features: ["50 crédits", "Génération vocale", "1 création/jour", "Support basique"],
    buttonLabel: "Commencer",
    buttonVariant: "outline",
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "29€",
    period: "/mois",
    features: ["1000 crédits", "Tout type de génération", "Priorité IA", "Support prioritaire"],
    buttonLabel: "Choisir Pro",
    buttonVariant: "default",
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "99€",
    period: "/mois",
    features: ["5000 crédits", "API dédiée", "Personnalisation", "Account manager"],
    buttonLabel: "Passer à Enterprise",
    buttonVariant: "outline",
    highlighted: false,
  },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

export default function PricingView() {
  const { t } = useTranslation();
  const [upgradingPlan, setUpgradingPlan] = React.useState<string | null>(null);
  const { toast } = useToast();
  const user = useAppStore((s) => s.user);
  const isAdmin = user?.role === "admin";
  const pendingCheckoutRef = React.useRef<string | null>(null);
  const router = useRouter();

  const handleSelectPlan = async (newPlan: string) => {
    if (!user) {
      toast({ title: "Connexion requise", description: "Veuillez vous connecter pour souscrire.", variant: "destructive" });
      return;
    }
    if (isAdmin) {
      toast({ title: "Action non disponible", description: "Les administrateurs ne peuvent pas gérer un abonnement personnel.", variant: "destructive" });
      return;
    }
    const lockKey = `${user.id}`;
    const key = `${user.id}:${newPlan}`;
    if (pendingCheckoutRef.current === key) return;
    if (isCheckoutPending(lockKey)) return;
    if (!acquireCheckout(lockKey)) return;
    pendingCheckoutRef.current = key;
    setUpgradingPlan(newPlan);
    try {
      if (newPlan === "free") {
        // Downgrade handled elsewhere - redirect to settings
        router.push("/settings/subscription");
        // release lock when redirecting
        pendingCheckoutRef.current = null;
        releaseCheckout(lockKey);
        return;
      }

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
        setUpgradingPlan(null);
        pendingCheckoutRef.current = null;
        releaseCheckout(key);
        return;
      }

      if (!response.ok || !data.url) {
        throw new Error(data.error || "Impossible de démarrer le paiement");
      }

      // Redirect to Stripe Checkout
      pendingCheckoutRef.current = null;
      releaseCheckout(lockKey);
      // eslint-disable-next-line react-hooks/immutability
      window.location.href = data.url; // External navigation
      return;
    } catch (error) {
      console.error("Checkout error:", error);
      toast({ title: "Erreur paiement", description: (error instanceof Error ? error.message : "Une erreur est survenue"), variant: "destructive" });
      setUpgradingPlan(null);
      pendingCheckoutRef.current = null;
      releaseCheckout(lockKey);
    }
  };

  return (
    <section id="pricing" className={classMap["k_px_4_py_20_sm_px_6_lg_px_8_361"]}>
      <div className={classMap["k_mx_auto_max_w_7xl_362"]}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="text-center">
          <motion.h2 variants={fadeInUp} className={classMap["k_text_3xl_font_bold_tracking_tight_sm_tex_363"]}>
            Tarifs simples et transparents
          </motion.h2>
          <motion.p variants={fadeInUp} className={classMap["k_mt_4_text_muted_foreground_text_base_sm__371"]}>
            Choisissez le plan adapté à vos besoins. Évoluez à votre rythme.
          </motion.p>
          {isAdmin && (
            <motion.div variants={fadeInUp} className="mt-6 rounded-2xl border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
              Les administrateurs n'ont pas accès à la gestion d'abonnement personnelle depuis cette page.
            </motion.div>
          )}
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className={classMap["k_mt_14_grid_grid_cols_1_gap_6_md_grid_col_381"]}>
          {pricingPlans.map((plan) => (
            <motion.div key={plan.name} variants={fadeInUp} className={classMap["k_flex_justify_center_382"]}>
              <Card className={`relative w-full max-w-sm ${plan.highlighted ? "border-gold/50 glow-gold" : "border-border"} bg-card`}>
                {plan.highlighted && (
                  <div className={classMap["k_absolute_top_3_left_1_2_translate_x_1_2_383"]}>
                    <Badge className={classMap["k_bg_gold_text_gold_foreground_border_0_px_384"]}>Populaire</Badge>
                  </div>
                )}
                <CardHeader className={classMap["k_text_center_pb_2_385"]}>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className={classMap["k_mt_3_flex_items_baseline_justify_center__386"]}>
                    <span className={classMap["k_text_4xl_font_bold_387"]}>{plan.price}</span>
                    <span className={classMap["k_text_muted_foreground_text_sm_388"]}>{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className={classMap["k_flex_flex_col_gap_3_33"]}>
                    {plan.features.map((feature) => (
                      <li key={feature} className={classMap["k_flex_items_center_gap_2_5_text_sm_389"]}>
                        <Check className={classMap["k_size_4_shrink_0_text_gold_390"]} />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button variant={plan.buttonVariant as any} className={`w-full ${plan.highlighted ? "bg-gold text-gold-foreground hover:bg-gold/90" : ""}`} disabled={upgradingPlan !== null || isAdmin} onClick={() => handleSelectPlan(plan.id)}>
                    {upgradingPlan && plan.highlighted ? (
                      <span className={classMap["k_flex_items_center_gap_2_89"]}>
                        <span className={classMap["k_size_4_animate_spin_rounded_full_border__391"]} />
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
  );
}
