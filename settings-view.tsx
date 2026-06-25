"use client";

import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Upload, X } from "lucide-react";

const profileSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
  email: z.string().email("Adresse e-mail invalide."),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function SettingsView() {
  const {
    user,
    setAuth,
    logout,
    settings,
    updateSettings,
  } = useAppStore();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user?.avatar ?? null
  );
  const [isUploading, setIsUploading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
    },
  });

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p>Veuillez vous connecter pour voir vos paramètres.</p>
      </div>
    );
  }

  const isAdmin = user.role === "admin";

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const onSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
    let avatarUrl = user.avatar;

    if (avatarFile) {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", avatarFile);
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const { url } = await res.json();
        avatarUrl = url;
      } catch (error) {
        toast.error("Erreur lors de l'upload de l'avatar.");
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    try {
      const res = await fetch(`/api/user`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, avatar: avatarUrl }),
      });
      const result = await res.json();
      if (res.ok) {
        setAuth(result.user);
        toast.success("Profil mis à jour avec succès !");
        reset(result.user);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error(
        `Erreur lors de la mise à jour du profil: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`
      );
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const res = await fetch(`/api/user`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Votre compte a été supprimé.");
        logout();
      } else {
        const result = await res.json();
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error(
        `Erreur lors de la suppression du compte: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`
      );
    }
  };

  const userInitials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-center mb-8 relative">
        <h1 className="text-2xl font-bold tracking-tight">Mon Profil</h1>
      </div>

      <div className="flex flex-col gap-6">
        {/* Personal Info */}
        <Card className="bg-card border border-border rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Informations personnelles
            </CardTitle>
            <CardDescription>
              Mettez à jour votre photo et vos informations personnelles ici.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center mb-6">
                <div className="relative group">
                  <Avatar className="size-24 ring-2 ring-gold/30 ring-offset-2 ring-offset-background">
                    <AvatarImage src={avatarPreview ?? undefined} />
                    <AvatarFallback className="text-2xl font-semibold bg-gold/10 text-gold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    {isUploading ? (
                      <div className="size-8 text-white animate-spin" />
                    ) : (
                      <Upload className="size-8 text-white" />
                    )}
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    className="hidden"
                    onChange={handleAvatarChange}
                    accept="image/png, image/jpeg, image/webp"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  JPG, PNG, ou WebP. Max 5MB.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom complet</Label>
                  <Input id="name" {...register("name")} />
                  {errors.name && (
                    <p className="text-xs text-destructive mt-0.5">
                      {errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Adresse e-mail</Label>
                  <Input id="email" type="email" {...register("email")} />
                  {errors.email && (
                    <p className="text-xs text-destructive mt-0.5">
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                disabled={isSubmitting || isUploading || !isDirty}
                className="bg-gold text-gold-foreground hover:bg-gold/90"
              >
                {isSubmitting ? "Sauvegarde..." : "Sauvegarder les changements"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Account Info */}
        <Card className="bg-card border border-border rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Informations du compte
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 mb-6">
            <p className="text-sm font-medium tabular-nums">
              Plan:{" "}
              {isAdmin
                ? "Administrateur"
                : user.plan === "free"
                ? "Gratuit"
                : user.plan === "pro"
                ? "Pro"
                : "Enterprise"}
            </p>
            {!isAdmin && (
              <p className="text-sm font-medium tabular-nums">
                Crédits: {user.credits}
              </p>
            )}
            <p className="text-sm font-medium text-muted-foreground">
              Membre depuis:{" "}
              {format(new Date(user.createdAt), "d MMMM yyyy", { locale: fr })}
            </p>
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              className="bg-gold/10 text-gold border-gold/30 hover:bg-gold/20 hover:text-gold"
            >
              Gérer l'abonnement
            </Button>
          </CardFooter>
        </Card>

        {/* Danger Zone */}
        <Card className="bg-card border border-destructive/40 rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-destructive">
              Zone de danger
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              La suppression de votre compte est une action irréversible. Toutes
              vos données seront définitivement effacées.
            </p>
          </CardContent>
          <CardFooter>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Supprimer mon compte</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Êtes-vous absolument sûr ?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. Votre compte et toutes vos
                    données seront supprimés définitivement.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    Oui, supprimer mon compte
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}