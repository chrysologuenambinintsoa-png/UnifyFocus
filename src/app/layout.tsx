import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UnifyFocus — IA Générative pour Créatifs",
  description:
    "Plateforme SaaS d'intelligence artificielle générative. Créez du texte, des images et des vidéos avec la puissance de l'IA.",
  keywords: [
    "UnifyFocus",
    "IA",
    "générative",
    "SaaS",
    "texte",
    "image",
    "vidéo",
    "intelligence artificielle",
  ],
  authors: [{ name: "UnifyFocus" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "UnifyFocus — IA Générative pour Créatifs",
    description:
      "Générez du texte, des images et des vidéos avec la puissance de l'IA.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
