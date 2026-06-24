"use client";

import { classMap } from '@/styles/classMap';
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Upload,
  Camera,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface AvatarUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File) => Promise<void>;
  uploading: boolean;
  currentAvatar?: string | null;
  userName?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function AvatarUploadModal({
  open,
  onOpenChange,
  onUpload,
  uploading,
  currentAvatar,
  userName,
}: AvatarUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { t } = useTranslation();
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    setUploadProgress(0);
  }, []);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    onOpenChange(newOpen);
  };

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Format non supporté. Utilisez JPG, PNG ou WebP.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "Fichier trop volumineux. Maximum 5 Mo.";
    }
    return null;
  };

  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    setError(null);
    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploadProgress(10);
      await onUpload(selectedFile);
      setUploadProgress(100);
      setTimeout(() => {
        handleOpenChange(false);
      }, 500);
    } catch {
      setError("Erreur lors de l'upload. Réessayez.");
    }
  };

  const handleRemoveSelected = () => {
    resetState();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " o";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " Ko";
    return (bytes / (1024 * 1024)).toFixed(1) + " Mo";
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className={classMap["k_flex_items_center_gap_2_89"]}>
            <Camera className={classMap["k_size_5_text_gold_129"]} />
            Modifier la photo de profil
          </DialogTitle>
          <DialogDescription>
            Téléchargez une nouvelle photo de profil. Formats acceptés : JPG,
            PNG, WebP (max 5 Mo).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop Zone */}
          {!selectedFile ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer group",
                isDragging
                  ? "border-gold bg-gold/5 scale-[1.02]"
                  : "border-muted-foreground/25 hover:border-gold/50 hover:bg-muted/30"
              )}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_TYPES.join(",")}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                className="hidden"
              />

              <div className={classMap["k_flex_flex_col_items_center_gap_3_130"]}>
                <div
                  className={cn(
                    "size-16 rounded-full flex items-center justify-center transition-colors",
                    isDragging
                      ? "bg-gold/20 text-gold"
                      : "bg-muted text-muted-foreground group-hover:bg-gold/10 group-hover:text-gold"
                  )}
                >
                  {isDragging ? (
                    <Upload className="size-8" />
                  ) : (
                    <ImageIcon className="size-8" />
                  )}
                </div>

                <div className="space-y-1">
                  <p className={classMap["k_text_sm_font_medium_35"]}>
                    {isDragging
                      ? "Relâchez le fichier ici"
                      : "Glissez-déposez votre image"}
                  </p>
                  <p className={classMap["k_text_xs_text_muted_foreground_131"]}>
                    ou cliquez pour parcourir
                  </p>
                </div>

                <p className={classMap["k_text_xs_text_muted_foreground_131"]}>
                  JPG, PNG, WebP • Max 5 Mo
                </p>
              </div>
            </motion.div>
          ) : (
            /* Preview */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className={classMap["k_flex_items_center_gap_4_132"]}>
                <div className={classMap["k_relative_shrink_0_133"]}>
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className={classMap["k_size_24_rounded_full_object_cover_ring_2_134"]}
                    />
                  )}
                  <button
                    onClick={handleRemoveSelected}
                    disabled={uploading}
                    className={classMap["k_absolute_top_2_right_2_size_6_rounded_fu_135"]}
                  >
                    <X className="size-3" />
                  </button>
                </div>

                <div className={classMap["k_flex_1_min_w_0_136"]}>
                  <p className={classMap["k_font_medium_truncate_137"]}>{selectedFile.name}</p>
                  <p className={classMap["k_text_sm_text_muted_foreground_32"]}>
                    {formatFileSize(selectedFile.size)}
                  </p>
                  <div className={classMap["k_flex_items_center_gap_1_mt_1_138"]}>
                    <CheckCircle2 className={classMap["k_size_4_text_green_500_139"]} />
                    <span className={classMap["k_text_xs_text_green_600_140"]}>
                      Fichier valide
                    </span>
                  </div>
                </div>
              </div>

              {/* Upload Progress */}
              {uploading && (
                <div className="space-y-2">
                  <div className={classMap["k_flex_items_center_justify_between_text_s_141"]}>
                    <span className="text-muted-foreground">{t("auto.k_upload_en_cours_127")}</span>
                    <span className="font-medium">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
            </motion.div>
          )}

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={classMap["k_flex_items_center_gap_2_p_3_rounded_lg_b_142"]}
              >
                <AlertCircle className={classMap["k_size_4_shrink_0_143"]} />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Current Avatar Info */}
          {!selectedFile && currentAvatar && (
            <div className={classMap["k_flex_items_center_gap_3_p_3_rounded_lg_b_144"]}>
              <img
                src={currentAvatar}
                alt={userName || "Avatar"}
                className={classMap["k_size_10_rounded_full_object_cover_145"]}
              />
              <div className={classMap["k_flex_1_min_w_0_136"]}>
                <p className={classMap["k_text_sm_font_medium_35"]}>{t("auto.k_photo_actuelle_128")}</p>
                <p className={classMap["k_text_xs_text_muted_foreground_131"]}>
                  Sera remplacée par la nouvelle image
                </p>
              </div>
              <Trash2 className={classMap["k_size_4_text_muted_foreground_146"]} />
            </div>
          )}
        </div>

        <DialogFooter className={classMap["k_gap_2_sm_gap_0_147"]}>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={uploading}
          >
            Annuler
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className={classMap["k_bg_gold_text_gold_foreground_hover_bg_go_148"]}
          >
            {uploading ? (
              <>
                <Loader2 className={classMap["k_size_4_animate_spin_mr_2_149"]} />
                Upload...
              </>
            ) : (
              <>
                <Upload className={classMap["k_size_4_mr_2_150"]} />
                Télécharger
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}