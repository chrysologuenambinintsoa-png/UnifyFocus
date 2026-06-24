import fr from "../locales/fr.json";
import en from "../locales/en.json";
import de from "../locales/de.json";
import es from "../locales/es.json";
import { useMemo } from "react";
import { useAppStore } from "@/store/app-store";

const LOCALES: Record<string, any> = {
  fr,
  en,
  de,
  es,
};

function getByKey(obj: any, key: string) {
  return key.split(".").reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj);
}

export function useTranslation() {
  const lang = useAppStore((s) => s.settings?.language || "fr");
  const messages = LOCALES[lang] || LOCALES["fr"];

  const t = useMemo(() => {
    return (key: string, fallback?: string) => {
      const v = getByKey(messages, key);
      if (v === undefined) {
        if (key.startsWith("auto.")) {
          return fallback ?? "";
        }
        return fallback ?? key;
      }
      return v;
    };
  }, [messages]);

  return { t, lang };
}

export default useTranslation;
