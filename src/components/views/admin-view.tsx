"use client";

import { useEffect, useState, useMemo } from "react";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import {
  Shield,
  Trash2,
  Check,
  X,
  Search,
  Download,
  RefreshCw,
  Users,
  UserCheck,
  UserX,
  Activity,
  TrendingUp,
  Server,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  Eye,
  Mail,
  Calendar,
  Filter,
} from "lucide-react";

interface UserItem {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  credits: number;
  role: "user" | "admin";
  isBlocked: boolean;
  createdAt?: string;
  lastLogin?: string;
}

interface AppSettingItem {
  key: string;
  label: string;
  value: string;
  description?: string;
  type?: "text" | "number" | "boolean" | "select" | "textarea";
  options?: string[];
  category?: string;
  updatedAt?: string;
}

interface AuditLogItem {
  id: string;
  adminId: string;
  action: string;
  details?: string;
  createdAt: string;
}

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  adminUsers: number;
  totalCreditsUsed: number;
  apiCallsToday: number;
  systemHealth: "healthy" | "warning" | "critical";
}

type TabType = "overview" | "users" | "settings" | "logs";

export default function AdminView() {
  const user = useAppStore((s) => s.user);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [settings, setSettings] = useState<AppSettingItem[]>([]);
  const [settingsSearchQuery, setSettingsSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"user" | "admin">("user");

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "user" | "admin">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "blocked">("all");
  const [filterPlan, setFilterPlan] = useState<"all" | "free" | "pro" | "enterprise">("all");
  const [currentTab, setCurrentTab] = useState<TabType>("overview");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<keyof UserItem>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    
    const fetchWithTimeout = async (url: string, timeout = 5000) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      try {
        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          },
        });
        clearTimeout(timeoutId);
        
        const text = await res.text();
        
        // Check if response is JSON
        try {
          const json = JSON.parse(text);
          if (!res.ok) {
            throw new Error(json.error || `HTTP ${res.status}: ${res.statusText}`);
          }
          return json;
        } catch (parseError) {
          console.error(`Failed to parse JSON from ${url}:`, text.substring(0, 100));
          throw new Error(`Réponse invalide du serveur (${res.status}). Veuillez réessayer.`);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error(`Délai d'attente dépassé pour ${url}`);
        }
        throw error;
      }
    };

    Promise.all([
      fetchWithTimeout("/api/admin/users"),
      fetchWithTimeout("/api/admin/settings"),
      fetchWithTimeout("/api/admin/logs"),
      fetchWithTimeout("/api/admin/stats"),
    ])
      .then(([usersData, settingsData, logsData, statsData]) => {
        if (usersData?.users) setUsers(usersData.users);
        if (settingsData?.settings) {
          setSettings(settingsData.settings);
        } else {
          // If no settings exist, initialize with defaults
          initializeDefaultSettings();
        }
        if (logsData?.logs) setLogs(logsData.logs);
        if (statsData?.stats) setStats(statsData.stats);
      })
      .catch((err) => {
        console.error("Admin data loading error:", err);
        setError(err instanceof Error ? err.message : "Erreur de chargement");
      })
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const initializeDefaultSettings = async () => {
    const defaultSettings = [
      { key: "app.name", label: "Nom de l'application", value: "UnifyFocus", description: "Nom affiché dans l'interface", category: "Application", type: "text" as const },
      { key: "app.description", label: "Description", value: "Plateforme IA unifiée", description: "Description courte de l'application", category: "Application", type: "text" as const },
      { key: "app.maintenance", label: "Mode maintenance", value: "false", description: "Activer le mode maintenance", category: "Application", type: "boolean" as const },
      { key: "app.registration_enabled", label: "Inscriptions autorisées", value: "true", description: "Permettre les nouvelles inscriptions", category: "Application", type: "boolean" as const },
      { key: "email.smtp_host", label: "Serveur SMTP", value: "", description: "Adresse du serveur SMTP", category: "Email", type: "text" as const },
      { key: "email.smtp_port", label: "Port SMTP", value: "587", description: "Port du serveur SMTP", category: "Email", type: "number" as const },
      { key: "email.smtp_user", label: "Utilisateur SMTP", value: "", description: "Nom d'utilisateur SMTP", category: "Email", type: "text" as const },
      { key: "email.smtp_pass", label: "Mot de passe SMTP", value: "", description: "Mot de passe SMTP", category: "Email", type: "password" as const },
      { key: "stripe.public_key", label: "Clé publique Stripe", value: "", description: "Clé API publique Stripe", category: "Paiement", type: "text" as const },
      { key: "stripe.secret_key", label: "Clé secrète Stripe", value: "", description: "Clé API secrète Stripe", category: "Paiement", type: "password" as const },
      { key: "ai.default_model", label: "Modèle IA par défaut", value: "gpt-4o-mini", description: "Modèle IA utilisé par défaut", category: "IA", type: "select" as const, options: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "claude-3-opus", "claude-3-sonnet"] },
      { key: "ai.max_tokens", label: "Tokens maximum", value: "4096", description: "Nombre maximum de tokens par requête", category: "IA", type: "number" as const },
      { key: "ai.temperature", label: "Température", value: "0.7", description: "Créativité du modèle (0-1)", category: "IA", type: "number" as const },
      { key: "security.max_login_attempts", label: "Tentatives de connexion max", value: "5", description: "Nombre maximum de tentatives avant blocage", category: "Sécurité", type: "number" as const },
      { key: "security.session_duration", label: "Durée de session (heures)", value: "24", description: "Durée de validité des sessions", category: "Sécurité", type: "number" as const },
      { key: "features.chat_enabled", label: "Chat activé", value: "true", description: "Activer la fonctionnalité de chat", category: "Fonctionnalités", type: "boolean" as const },
      { key: "features.image_generation", label: "Génération d'images", value: "true", description: "Activer la génération d'images", category: "Fonctionnalités", type: "boolean" as const },
      { key: "features.video_generation", label: "Génération de vidéos", value: "false", description: "Activer la génération de vidéos", category: "Fonctionnalités", type: "boolean" as const },
    ];

    try {
      const updates = defaultSettings.map(s => ({ key: s.key, value: s.value }));
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: updates }),
      });
      const data = await res.json();
      if (res.ok && data.settings) {
        // Merge with default metadata
        const merged = data.settings.map((s: any) => {
          const defaultSetting = defaultSettings.find(ds => ds.key === s.key);
          return {
            ...s,
            label: defaultSetting?.label || s.key,
            description: defaultSetting?.description || '',
            type: defaultSetting?.type || 'text',
            category: defaultSetting?.category || 'General',
            options: defaultSetting?.options,
          };
        });
        setSettings(merged);
      }
    } catch (err) {
      console.error("Failed to initialize default settings:", err);
    }
  };

  const refresh = async () => {
    setLoading(true);
    setError(null);
    
    const fetchWithTimeout = async (url: string, timeout = 5000) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      try {
        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          },
        });
        clearTimeout(timeoutId);
        
        const text = await res.text();
        
        try {
          const json = JSON.parse(text);
          if (!res.ok) {
            throw new Error(json.error || `HTTP ${res.status}: ${res.statusText}`);
          }
          return json;
        } catch (parseError) {
          console.error(`Failed to parse JSON from ${url}:`, text.substring(0, 100));
          throw new Error(`Réponse invalide du serveur (${res.status}). Veuillez réessayer.`);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error(`Délai d'attente dépassé pour ${url}`);
        }
        throw error;
      }
    };

    try {
      const [usersData, settingsData, logsData, statsData] = await Promise.all([
        fetchWithTimeout("/api/admin/users"),
        fetchWithTimeout("/api/admin/settings"),
        fetchWithTimeout("/api/admin/logs"),
        fetchWithTimeout("/api/admin/stats"),
      ]);
      
      setUsers(usersData.users || []);
      setSettings(settingsData.settings || []);
      setLogs(logsData.logs || []);
      setStats(statsData.stats || null);
    } catch (err) {
      console.error("Refresh error:", err);
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    setError(null);
    if (!newUserEmail || !newUserPassword) {
      setError("Email et mot de passe sont requis");
      return;
    }
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newUserEmail,
          name: newUserName,
          password: newUserPassword,
          role: newUserRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impossible de créer l'utilisateur");
      setUsers((prev) => [data.user, ...prev]);
      setNewUserEmail("");
      setNewUserName("");
      setNewUserPassword("");
      setNewUserRole("user");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  const handleToggleBlock = async (id: string, block: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBlocked: block }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impossible de mettre à jour l'utilisateur");
      setUsers((prev) => prev.map((u) => (u.id === id ? data.user : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  const handleChangeRole = async (id: string, role: "user" | "admin") => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impossible de mettre à jour le rôle");
      setUsers((prev) => prev.map((u) => (u.id === id ? data.user : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  const handleUpdateUser = async (id: string, plan: string, credits: number) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, credits }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impossible de mettre à jour l'utilisateur");
      setUsers((prev) => prev.map((u) => (u.id === id ? data.user : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Supprimer définitivement cet utilisateur ?")) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impossible de supprimer l'utilisateur");
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setSelectedUsers((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.size === 0) return;
    if (!confirm(`Supprimer ${selectedUsers.size} utilisateur(s) ?`)) return;
    try {
      await Promise.all(
        Array.from(selectedUsers).map((id) =>
          fetch(`/api/admin/users/${id}`, { method: "DELETE" })
        )
      );
      setUsers((prev) => prev.filter((u) => !selectedUsers.has(u.id)));
      setSelectedUsers(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  const handleBulkBlock = async (block: boolean) => {
    if (selectedUsers.size === 0) return;
    try {
      await Promise.all(
        Array.from(selectedUsers).map((id) =>
          fetch(`/api/admin/users/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isBlocked: block }),
          })
        )
      );
      setUsers((prev) =>
        prev.map((u) => (selectedUsers.has(u.id) ? { ...u, isBlocked: block } : u))
      );
      setSelectedUsers(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  const handleClearLogs = async () => {
    if (!confirm("Effacer toutes les entrées du journal d’audit ?")) return;
    try {
      const res = await fetch("/api/admin/logs", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impossible de supprimer les logs");
      setLogs([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  const handleSaveSettings = async () => {
    try {
      const updates = settings.map((setting) => ({ key: setting.key, value: setting.value }));
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: updates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impossible de sauvegarder les paramètres");
      setSettings(data.settings || settings);
      setHasUnsavedChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  const handleResetSettings = async () => {
    try {
      const defaultSettings = [
        { key: "app.name", label: "Nom de l'application", value: "UnifyFocus", description: "Nom affiché dans l'interface", category: "Application", type: "text" },
        { key: "app.description", label: "Description", value: "Plateforme IA unifiée", description: "Description courte de l'application", category: "Application", type: "text" },
        { key: "app.maintenance", label: "Mode maintenance", value: "false", description: "Activer le mode maintenance", category: "Application", type: "boolean" },
        { key: "app.registration_enabled", label: "Inscriptions autorisées", value: "true", description: "Permettre les nouvelles inscriptions", category: "Application", type: "boolean" },
        { key: "email.smtp_host", label: "Serveur SMTP", value: "", description: "Adresse du serveur SMTP", category: "Email", type: "text" },
        { key: "email.smtp_port", label: "Port SMTP", value: "587", description: "Port du serveur SMTP", category: "Email", type: "number" },
        { key: "email.smtp_user", label: "Utilisateur SMTP", value: "", description: "Nom d'utilisateur SMTP", category: "Email", type: "text" },
        { key: "email.smtp_pass", label: "Mot de passe SMTP", value: "", description: "Mot de passe SMTP", category: "Email", type: "password" },
        { key: "stripe.public_key", label: "Clé publique Stripe", value: "", description: "Clé API publique Stripe", category: "Paiement", type: "text" },
        { key: "stripe.secret_key", label: "Clé secrète Stripe", value: "", description: "Clé API secrète Stripe", category: "Paiement", type: "password" },
        { key: "ai.default_model", label: "Modèle IA par défaut", value: "gpt-4o-mini", description: "Modèle IA utilisé par défaut", category: "IA", type: "select", options: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "claude-3-opus", "claude-3-sonnet"] },
        { key: "ai.max_tokens", label: "Tokens maximum", value: "4096", description: "Nombre maximum de tokens par requête", category: "IA", type: "number" },
        { key: "ai.temperature", label: "Température", value: "0.7", description: "Créativité du modèle (0-1)", category: "IA", type: "number" },
        { key: "security.max_login_attempts", label: "Tentatives de connexion max", value: "5", description: "Nombre maximum de tentatives avant blocage", category: "Sécurité", type: "number" },
        { key: "security.session_duration", label: "Durée de session (heures)", value: "24", description: "Durée de validité des sessions", category: "Sécurité", type: "number" },
        { key: "features.chat_enabled", label: "Chat activé", value: "true", description: "Activer la fonctionnalité de chat", category: "Fonctionnalités", type: "boolean" },
        { key: "features.image_generation", label: "Génération d'images", value: "true", description: "Activer la génération d'images", category: "Fonctionnalités", type: "boolean" },
        { key: "features.video_generation", label: "Génération de vidéos", value: "false", description: "Activer la génération de vidéos", category: "Fonctionnalités", type: "boolean" },
      ];

      const updates = defaultSettings.map(s => ({ key: s.key, value: s.value }));
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: updates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impossible de réinitialiser les paramètres");
      
      // Merge with existing settings to preserve type/category info
      const merged = defaultSettings.map(ds => {
        const existing = settings.find(s => s.key === ds.key);
        return {
          key: ds.key,
          label: ds.label,
          value: data.settings?.find((s: any) => s.key === ds.key)?.value || ds.value,
          description: ds.description,
          type: ds.type as any,
          category: ds.category,
          options: ds.options,
        };
      });
      
      setSettings(merged);
      setHasUnsavedChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  const handleExportSettings = () => {
    const exportData = settings.map((s) => ({
      key: s.key,
      label: s.label,
      value: s.value,
      description: s.description,
      category: s.category,
      type: s.type,
    }));
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `settings-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    const headers = ["Email", "Nom", "Plan", "Crédits", "Rôle", "État"];
    const rows = filteredUsers.map((u) => [
      u.email,
      u.name || "",
      u.plan,
      u.credits,
      u.role,
      u.isBlocked ? "Bloqué" : "Actif",
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleUserSelection = (id: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map((u) => u.id)));
    }
  };

  const handleSort = (field: keyof UserItem) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(settings.map((s) => s.category || "General"));
    return Array.from(cats).sort();
  }, [settings]);

  const filteredSettings = useMemo(() => {
    let result = [...settings];

    // Search filter
    if (settingsSearchQuery) {
      const query = settingsSearchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.label.toLowerCase().includes(query) ||
          s.key.toLowerCase().includes(query) ||
          s.description?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      result = result.filter((s) => (s.category || "General") === selectedCategory);
    }

    return result;
  }, [settings, settingsSearchQuery, selectedCategory]);

  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.email.toLowerCase().includes(query) ||
          (u.name && u.name.toLowerCase().includes(query))
      );
    }

    // Role filter
    if (filterRole !== "all") {
      result = result.filter((u) => u.role === filterRole);
    }

    // Status filter
    if (filterStatus !== "all") {
      result = result.filter((u) => (filterStatus === "active" ? !u.isBlocked : u.isBlocked));
    }

    // Plan filter
    if (filterPlan !== "all") {
      result = result.filter((u) => u.plan === filterPlan);
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

    return result;
  }, [users, searchQuery, filterRole, filterStatus, filterPlan, sortField, sortDirection]);

  if (!user) {
    return <div className="p-8">Veuillez vous connecter pour accéder au panneau administrateur.</div>;
  }

  if (!isAdmin) {
    return <div className="p-8">Accès refusé : vous n'êtes pas autorisé à voir cette page.</div>;
  }

  const tabs = [
    { id: "overview" as TabType, label: "Vue d'ensemble", icon: Activity },
    { id: "users" as TabType, label: "Utilisateurs", icon: Users },
    { id: "settings" as TabType, label: "Paramètres", icon: Server },
    { id: "logs" as TabType, label: "Journaux", icon: Shield },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-2xl font-bold">
            <Shield className="size-5 text-emerald-400" />
            Panneau d'Administration
          </div>
          <p className="text-sm text-muted-foreground">
            Gestion complète des utilisateurs, paramètres système et monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={refresh} disabled={loading}>
            <RefreshCw className={`size-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Rafraîchir
          </Button>
          <Badge variant="secondary" className="text-sm">
            {users.length} utilisateurs
          </Badge>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="mb-6 flex gap-2 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCurrentTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              currentTab === tab.id
                ? "border-emerald-400 text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {currentTab === "overview" && stats && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Utilisateurs</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </div>
                <Users className="size-8 text-blue-400" />
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="size-3" />
                <span>+12% ce mois</span>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Utilisateurs Actifs</p>
                  <p className="text-2xl font-bold">{stats.activeUsers}</p>
                </div>
                <UserCheck className="size-8 text-emerald-400" />
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <span>
                  {stats.totalUsers > 0
                    ? Math.round((stats.activeUsers / stats.totalUsers) * 100)
                    : 0}
                  % du total
                </span>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Utilisateurs Bloqués</p>
                  <p className="text-2xl font-bold">{stats.blockedUsers}</p>
                </div>
                <UserX className="size-8 text-red-400" />
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <span>
                  {stats.totalUsers > 0
                    ? Math.round((stats.blockedUsers / stats.totalUsers) * 100)
                    : 0}
                  % du total
                </span>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Santé Système</p>
                  <p className="text-2xl font-bold capitalize">{stats.systemHealth}</p>
                </div>
                {stats.systemHealth === "healthy" ? (
                  <Activity className="size-8 text-emerald-400" />
                ) : stats.systemHealth === "warning" ? (
                  <AlertCircle className="size-8 text-yellow-400" />
                ) : (
                  <AlertCircle className="size-8 text-red-400" />
                )}
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Server className="size-3" />
                <span>API: {stats.apiCallsToday} appels aujourd'hui</span>
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Actions Rapides</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => setCurrentTab("users")}
              >
                <Users className="size-4 mr-2" />
                Gérer les utilisateurs
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => setCurrentTab("settings")}
              >
                <Server className="size-4 mr-2" />
                Configurer le système
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => setCurrentTab("logs")}
              >
                <Shield className="size-4 mr-2" />
                Voir les journaux
              </Button>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Activité Récente</h3>
            <div className="space-y-3">
              {logs.slice(0, 5).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background"
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{entry.action}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleString("fr-FR")}
                      </span>
                    </div>
                    {entry.details && (
                      <p className="text-xs text-muted-foreground mt-1">{entry.details}</p>
                    )}
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune activité récente
                </p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Users Tab */}
      {currentTab === "users" && (
        <div className="space-y-6">
          {/* Create User Card */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Créer un utilisateur</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Email
                </label>
                <Input
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="email@exemple.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Nom
                </label>
                <Input
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Prénom Nom"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Mot de passe
                </label>
                <Input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Mot de passe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Rôle
                </label>
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as "user" | "admin")}
                >
                  <option value="user">Utilisateur</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleCreateUser} disabled={loading} className="w-full">
                  Créer
                </Button>
              </div>
            </div>
          </Card>

          {/* Search and Filters */}
          <Card className="p-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher par email ou nom..."
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value as any)}
                  >
                    <option value="all">Tous les rôles</option>
                    <option value="user">Utilisateurs</option>
                    <option value="admin">Administrateurs</option>
                  </select>
                  <select
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                  >
                    <option value="all">Tous les états</option>
                    <option value="active">Actifs</option>
                    <option value="blocked">Bloqués</option>
                  </select>
                  <select
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    value={filterPlan}
                    onChange={(e) => setFilterPlan(e.target.value as any)}
                  >
                    <option value="all">Tous les plans</option>
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedUsers.size > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <span className="text-sm text-blue-900">
                    {selectedUsers.size} utilisateur(s) sélectionné(s)
                  </span>
                  <div className="flex gap-2 ml-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkBlock(false)}
                    >
                      Débloquer
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleBulkBlock(true)}>
                      Bloquer
                    </Button>
                    <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                      Supprimer
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {filteredUsers.length} utilisateur(s) trouvé(s)
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  disabled={filteredUsers.length === 0}
                >
                  <Download className="size-4 mr-2" />
                  Exporter CSV
                </Button>
              </div>
            </div>
          </Card>

          {/* Users Table */}
          <Card className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={
                          filteredUsers.length > 0 &&
                          selectedUsers.size === filteredUsers.length
                        }
                        onChange={toggleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th
                      className="px-3 py-3 text-left font-medium cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("email")}
                    >
                      <div className="flex items-center gap-1">
                        Email
                        {sortField === "email" && (
                          <span className="text-muted-foreground">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-3 py-3 text-left font-medium cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center gap-1">
                        Nom
                        {sortField === "name" && (
                          <span className="text-muted-foreground">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-3 py-3 text-left font-medium cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("plan")}
                    >
                      <div className="flex items-center gap-1">
                        Plan
                        {sortField === "plan" && (
                          <span className="text-muted-foreground">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-3 py-3 text-left font-medium cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("credits")}
                    >
                      <div className="flex items-center gap-1">
                        Crédits
                        {sortField === "credits" && (
                          <span className="text-muted-foreground">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="px-3 py-3 text-left font-medium">Rôle</th>
                    <th className="px-3 py-3 text-left font-medium">État</th>
                    <th className="px-3 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-muted/30 transition-colors ${
                        item.isBlocked ? "bg-red-50/50" : ""
                      } ${selectedUsers.has(item.id) ? "bg-blue-50/50" : ""}`}
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(item.id)}
                          onChange={() => toggleUserSelection(item.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Mail className="size-3.5 text-muted-foreground" />
                          {item.email}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {item.name || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <select
                          className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                          value={item.plan}
                          onChange={(e) =>
                            setUsers((prev) =>
                              prev.map((u) =>
                                u.id === item.id ? { ...u, plan: e.target.value } : u
                              )
                            )
                          }
                        >
                          <option value="free">Free</option>
                          <option value="pro">Pro</option>
                          <option value="enterprise">Enterprise</option>
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min={0}
                          className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                          value={item.credits}
                          onChange={(e) =>
                            setUsers((prev) =>
                              prev.map((u) =>
                                u.id === item.id
                                  ? { ...u, credits: Number(e.target.value) }
                                  : u
                              )
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={item.role === "admin" ? "default" : "secondary"}>
                          {item.role}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        <Badge
                          variant={item.isBlocked ? "destructive" : "outline"}
                          className={
                            !item.isBlocked
                              ? "border-emerald-200 text-emerald-700"
                              : ""
                          }
                        >
                          {item.isBlocked ? "Bloqué" : "Actif"}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUpdateUser(item.id, item.plan, item.credits)}
                            title="Sauvegarder"
                          >
                            <Check className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={item.isBlocked ? "secondary" : "destructive"}
                            onClick={() => handleToggleBlock(item.id, !item.isBlocked)}
                            title={item.isBlocked ? "Débloquer" : "Bloquer"}
                          >
                            {item.isBlocked ? (
                              <Check className="size-4" />
                            ) : (
                              <X className="size-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleChangeRole(
                                item.id,
                                item.role === "admin" ? "user" : "admin"
                              )
                            }
                            title="Changer le rôle"
                          >
                            <Shield className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteUser(item.id)}
                            title="Supprimer"
                          >
                            <Trash2 className="size-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun utilisateur trouvé
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Settings Tab */}
      {currentTab === "settings" && (
        <div className="space-y-6">
          {/* Settings Header with Search and Filters */}
          <Card className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold">Paramètres de l'application</h3>
              <p className="text-sm text-muted-foreground">
                Gérez la configuration centrale du système
              </p>
            </div>

            {/* Search and Category Filter */}
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={settingsSearchQuery}
                  onChange={(e) => setSettingsSearchQuery(e.target.value)}
                  placeholder="Rechercher un paramètre..."
                  className="pl-9"
                />
              </div>
              <select
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">Toutes les catégories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Settings Count and Actions */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {filteredSettings.length} paramètre(s) trouvé(s)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm("Réinitialiser tous les paramètres aux valeurs par défaut ?")) {
                      handleResetSettings();
                    }
                  }}
                >
                  <RefreshCw className="size-4 mr-2" />
                  Réinitialiser
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportSettings()}
                >
                  <Download className="size-4 mr-2" />
                  Exporter
                </Button>
              </div>
            </div>
          </Card>

          {/* Settings List */}
          <Card className="p-6">
            <div className="space-y-4">
              {filteredSettings.map((setting) => (
                <div
                  key={setting.key}
                  className="rounded-xl border border-border bg-background p-4 hover:border-muted-foreground/20 transition-colors"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-sm font-semibold">{setting.label}</div>
                        {setting.category && (
                          <Badge variant="outline" className="text-xs">
                            {setting.category}
                          </Badge>
                        )}
                      </div>
                      {setting.description && (
                        <div className="text-xs text-muted-foreground">
                          {setting.description}
                        </div>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs font-mono">
                      {setting.key}
                    </Badge>
                  </div>

                  {/* Dynamic Input Based on Type */}
                  {setting.type === "boolean" ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={setting.value === "true"}
                        onChange={(e) =>
                          setSettings((prev) =>
                            prev.map((item) =>
                              item.key === setting.key
                                ? { ...item, value: e.target.checked ? "true" : "false" }
                                : item
                            )
                          )
                        }
                        className="rounded"
                      />
                      <span className="text-sm text-muted-foreground">
                        {setting.value === "true" ? "Activé" : "Désactivé"}
                      </span>
                    </div>
                  ) : setting.type === "textarea" ? (
                    <textarea
                      value={setting.value}
                      onChange={(e) =>
                        setSettings((prev) =>
                          prev.map((item) =>
                            item.key === setting.key ? { ...item, value: e.target.value } : item
                          )
                        )
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
                      rows={4}
                    />
                  ) : setting.type === "select" && setting.options ? (
                    <select
                      value={setting.value}
                      onChange={(e) =>
                        setSettings((prev) =>
                          prev.map((item) =>
                            item.key === setting.key ? { ...item, value: e.target.value } : item
                          )
                        )
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    >
                      {setting.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      type={setting.type === "number" ? "number" : "text"}
                      value={setting.value}
                      onChange={(e) =>
                        setSettings((prev) =>
                          prev.map((item) =>
                            item.key === setting.key ? { ...item, value: e.target.value } : item
                          )
                        )
                      }
                      className="font-mono text-sm"
                    />
                  )}
                </div>
              ))}

              {filteredSettings.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun paramètre trouvé
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center mt-6 pt-6 border-t border-border">
              <div>
                {hasUnsavedChanges && (
                  <span className="text-sm text-amber-600 flex items-center gap-2">
                    <AlertCircle className="size-4" />
                    Modifications non enregistrées
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSettings(settings.map((s) => ({ ...s, value: s.value })));
                    setHasUnsavedChanges(false);
                  }}
                  disabled={!hasUnsavedChanges}
                >
                  Annuler
                </Button>
                <Button onClick={handleSaveSettings} disabled={loading || !hasUnsavedChanges}>
                  <Check className="size-4 mr-2" />
                  Enregistrer les modifications
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Logs Tab */}
      {currentTab === "logs" && (
        <Card className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Journal d'audit</h3>
              <p className="text-sm text-muted-foreground">
                Historique des actions administratives
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{logs.length} entrées</Badge>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleClearLogs}
                disabled={logs.length === 0}
              >
                <Trash2 className="size-4 mr-2" />
                Effacer
              </Button>
            </div>
          </div>
          <div className="space-y-2 max-h-[600px] overflow-auto pr-2">
            {logs.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-border bg-background p-4 hover:border-muted-foreground/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-0.5">
                      <Shield className="size-4 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-semibold">{entry.action}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(entry.createdAt).toLocaleString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {entry.details && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {entry.details}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="size-3" />
                        <span>Admin: {entry.adminId}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="size-12 mx-auto mb-3 opacity-20" />
                <p>Aucune entrée dans le journal d'audit</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}