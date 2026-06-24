"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  HelpCircle,
  MessageCircle,
  Book,
  Mail,
  ExternalLink,
  ChevronRight,
  Search,
  LifeBuoy,
} from "lucide-react";

import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

/* ──────────── animation variants ──────────── */
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

/* ──────────── help resources data ──────────── */
const helpResources = [
  {
    icon: Book,
    title: "Documentation",
    description: "Guides complets et tutoriels pour maîtriser la plateforme",
    action: "Consulter",
  },
  {
    icon: MessageCircle,
    title: "FAQ",
    description: "Réponses aux questions les plus fréquentes",
    action: "Voir la FAQ",
  },
  {
    icon: Mail,
    title: "Contact",
    description: "Notre équipe support vous répond sous 24h",
    action: "Nous écrire",
  },
  {
    icon: ExternalLink,
    title: "Communauté",
    description: "Échangez avec d'autres utilisateurs",
    action: "Rejoindre",
  },
];

const commonQuestions = [
  {
    question: "Comment générer du contenu avec l'IA ?",
    answer:
      "1) Ouvrez l'éditeur (menu 'Éditeur IA'). 2) Choisissez le type (texte/image/video). 3) Rédigez un prompt clair avec le ton et la longueur souhaités. 4) Cliquez sur 'Générer'. Astuce : incluez des exemples ou contraintes (ex. longueur, style) pour obtenir des résultats plus précis.",
  },
  {
    question: "Comment les crédits sont-ils facturés ?",
    answer:
      "Chaque génération consomme un nombre de crédits dépendant du type et de la complexité. Pour consulter votre solde et historique, allez dans 'Usage'. Les abonnements mensuels rechargent automatiquement les crédits selon votre plan.",
  },
  {
    question: "Puis-je modifier et exporter le contenu généré ?",
    answer:
      "Oui : après génération, éditez le texte directement dans l'éditeur, utilisez l'historique pour restaurer une version précédente, puis exportez au format souhaité (copier, télécharger). Pour images, utilisez les options de téléchargement et variantes.",
  },
  {
    question: "Comment changer d'abonnement ou passer à Pro ?",
    answer:
      "Accédez à votre 'Profil' puis 'Abonnement' ou cliquez sur 'Passer Pro' depuis le menu. Le paiement s'effectue via une session sécurisée Stripe ; vous serez redirigé vers la page de paiement.",
  },
  {
    question: "Comment utiliser l'API et obtenir une clé ?",
    answer:
      "Les accès API et exemples sont dans la documentation (/docs). Pour demander une clé, consultez la section 'API' dans votre espace ou contactez le support via ce formulaire.",
  },
  {
    question: "Comment signaler un bug ou fournir des logs ?",
    answer:
      "Donnez une description claire, étapes pour reproduire, navigateurs/version, et joignez captures d'écran ou export de console. Envoyez ces informations via 'Contact' ici ou par email si vous préférez.",
  },
];

/* ──────────── component ──────────── */
export default function HelpView() {
  const { setCurrentView } = useAppStore();
  const { t } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();

  const [contactOpen, setContactOpen] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [contactLoading, setContactLoading] = useState(false);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-center mb-8 relative"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/")}
          className="absolute left-0"
          aria-label={t("auto.k_retour_au_tableau_de_bord_108")}
        >
          <ArrowLeft className="size-5" />
        </Button>

        <h1 className="text-2xl font-bold tracking-tight">
          Centre d'aide
        </h1>
      </motion.div>

      {/* ── Search Bar ── */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="mb-8"
      >
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <Input
            placeholder="Rechercher une aide..."
            className="pl-12 h-12 text-lg"
          />
        </div>
      </motion.div>

      {/* ── Quick Access Cards ── */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10"
      >
        {helpResources.map((resource, index) => (
          <motion.div key={resource.title} variants={fadeInUp}>
            <Card
              className="hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => {
                switch (resource.title) {
                  case "Documentation":
                    // Open the detailed documentation page (not the landing index)
                    window.open("/docs/documentation.html", "_blank", "noopener,noreferrer");
                    break;
                  case "FAQ":
                    // scroll to FAQ section
                    document.getElementById("faq-section")?.scrollIntoView({ behavior: "smooth" });
                    break;
                  case "Contact":
                    setContactOpen(true);
                    break;
                  case "Communauté":
                    window.open("/app.html", "_blank", "noopener,noreferrer");
                    break;
                }
              }}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gold/10 group-hover:bg-gold/20 transition-colors">
                      <resource.icon className="size-5 text-gold" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{resource.title}</CardTitle>
                      <CardDescription>{resource.description}</CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
              </CardHeader>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Common Questions ── */}
      <motion.div id="faq-section" variants={stagger} initial="hidden" animate="visible">
        <h2 className="text-xl font-semibold mb-6">Questions fréquentes</h2>
        <Accordion type="single" collapsible className="space-y-2">
          {commonQuestions.map((faq, idx) => (
            <AccordionItem key={idx} value={`faq-${idx}`}>
              <AccordionTrigger>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="size-4 text-gold" />
                    <span className="font-medium">{faq.question}</span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{faq.answer}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.div>

      {/* ── Contact Support CTA ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="mt-10"
      >
        <Card className="bg-gradient-to-r from-gold/10 to-gold/5 border-gold/20">
          <CardContent className="py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-gold/20">
                  <LifeBuoy className="size-6 text-gold" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Besoin d'aide supplémentaire ?</h3>
                  <p className="text-sm text-muted-foreground">
                    Notre équipe support est disponible pour vous accompagner.
                  </p>
                </div>
              </div>
              <Button
                className="bg-gold text-gold-foreground hover:bg-gold/90 whitespace-nowrap"
                onClick={() => setContactOpen(true)}
              >
                Contacter le support
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Contact Dialog */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contacter le support</DialogTitle>
            <DialogDescription>Envoyez-nous un message et notre équipe vous répondra sous 24h.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={contactMessage}
              onChange={(e) => setContactMessage(e.target.value)}
              placeholder="Décrivez votre problème ou question"
              className="h-32"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={async () => {
                if (!contactMessage.trim()) {
                  toast({ title: "Message vide", description: "Veuillez saisir un message.", variant: "destructive" });
                  return;
                }
                setContactLoading(true);
                try {
                  const user = useAppStore.getState().user;
                  const res = await fetch("/api/support", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: user?.id, message: contactMessage }),
                  });
                  if (!res.ok) throw new Error("Erreur serveur");
                  toast({ title: "Message envoyé", description: "Nous avons bien reçu votre message." });
                  setContactMessage("");
                  setContactOpen(false);
                } catch (err) {
                  console.error(err);
                  toast({ title: "Erreur", description: "Impossible d'envoyer le message.", variant: "destructive" });
                } finally {
                  setContactLoading(false);
                }
              }}
              disabled={contactLoading}
            >
              {contactLoading ? "Envoi..." : "Envoyer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}