import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/store/app-store";

type Option = {
  value: string;
  label: string;
};

type OptionGroup = {
  label: string;
  property: string;
  options: Option[];
};

const generationOptions: Record<
  "text" | "code" | "image" | "video" | "music",
  OptionGroup[]
> = {
  text: [
    {
      label: "Longueur",
      property: "length",
      options: [
        { value: "short", label: "Court (~200 mots)" },
        { value: "medium", label: "Moyen (~500 mots)" },
        { value: "long", label: "Long (~1000 mots)" },
      ],
    },
  ],
  code: [
    {
      label: "Langage",
      property: "language",
      options: [
        { value: "python", label: "Python" },
        { value: "javascript", label: "JavaScript" },
        { value: "typescript", label: "TypeScript" },
      ],
    },
  ],
  image: [
    {
      label: "Style",
      property: "style",
      options: [
        { value: "photorealistic", label: "Photoréaliste" },
        { value: "digital-art", label: "Art numérique" },
        { value: "anime", label: "Anime" },
      ],
    },
    {
      label: "Format",
      property: "aspectRatio",
      options: [
        { value: "1:1", label: "Carré (1:1)" },
        { value: "16:9", label: "Paysage (16:9)" },
        { value: "9:16", label: "Portrait (9:16)" },
      ],
    },
  ],
  video: [
    {
      label: "Qualité",
      property: "quality",
      options: [
        { value: "hd", label: "HD" },
        { value: "full-hd", label: "Full HD" },
        { value: "4k", label: "Ultra HD" },
      ],
    },
    {
      label: "Durée",
      property: "duration",
      options: [
        { value: "5", label: "5 secondes" },
        { value: "10", label: "10 secondes" },
        { value: "15", label: "15 secondes" },
      ],
    },
  ],
  music: [
    // This was the missing property
  ],
};

export function PropertiesPanel() {
  const { editorTab: generationType } = useAppStore();
  const options = generationOptions[generationType];

  return (
    <div className="p-4 space-y-6">
      <h3 className="text-lg font-semibold">Propriétés</h3>
      <div className="space-y-4">
        {/* Content will be added here */}
      </div>
    </div>
  );
}