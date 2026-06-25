"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Shield, Trash2, Check, X } from "lucide-react";

interface UserItem {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  role: "user" | "admin";
  isBlocked: boolean;
}

interface AppSettingItem {
  key: string;
  label: string;
  value: string;
  description?: string;
}

interface AuditLogItem {
  id: string;
  adminId: string;
  action: string;
  details?: string;
  createdAt: string;
}

export default function AdminView() {
  const user = useAppStore((s) => s.user);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [settings, setSettings] = useState<AppSettingItem[]>([]);
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"user" | "admin">("user");

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    Promise.all([
      fetch("/api/admin/users").then((res) => res.json()),
      fetch("/api/admin/settings").then((res) => res.json()),
      fetch("/api/admin/logs").then((res) => res.json()),
    ])
      .then(([usersData, settingsData, logsData]) => {
        if (usersData?.users) setUsers(usersData.users);
        if (settingsData?.settings) setSettings(settingsData.settings);
        if (logsData?.logs) setLogs(logsData.logs);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, settingsRes, logsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/settings"),
        fetch("/api/admin/logs"),
      ]);
      const [usersData, settingsData, logsData] = await Promise.all([
        usersRes.json(),
        settingsRes.json(),
        logsRes.json(),
      ]);
      setUsers(usersData.users || []);
      setSettings(settingsData.settings || []);
      setLogs(logsData.logs || []);
    } catch (err) {
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
      setUsers((prev) => prev.map((user) => (user.id === id ? data.user : user)));
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
      setUsers((prev) => prev.map((user) => (user.id === id ? data.user : user)));
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
      setUsers((prev) => prev.filter((user) => user.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  if (!user) {
    return <div className="p-8">Veuillez vous connecter pour accéder au panneau administrateur.</div>;
  }

  if (!isAdmin) {
    return <div className="p-8">Accès refusé : vous n'êtes pas autorisé à voir cette page.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-2xl font-bold">
            <Shield className="size-5 text-emerald-400" />
            Panneau Admin
          </div>
          <p className="text-sm text-muted-foreground">Gestion des utilisateurs, paramètres et journal d’audit.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={refresh} disabled={loading}>
            Rafraîchir
          </Button>
          <Badge variant="secondary">{users.length} utilisateurs</Badge>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Créer un utilisateur</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-muted-foreground">Email</label>
              <Input value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="email@exemple.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground">Nom</label>
              <Input value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="Prénom Nom" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground">Mot de passe</label>
              <Input type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} placeholder="Mot de passe" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground">Rôle</label>
              <select
                className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as "user" | "admin")}
              >
                <option value="user">Utilisateur</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
            <Button onClick={handleCreateUser} disabled={loading} className="w-full">
              Créer l'utilisateur
            </Button>
          </div>
        </section>

        <section className="col-span-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Utilisateurs</h2>
              <p className="text-sm text-muted-foreground">Gestion des comptes et des accès.</p>
            </div>
            <Badge>{users.filter((u) => u.role === "admin").length} admins</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Email</th>
                  <th className="px-3 py-2 text-left font-medium">Nom</th>
                  <th className="px-3 py-2 text-left font-medium">Plan</th>
                  <th className="px-3 py-2 text-left font-medium">Rôle</th>
                  <th className="px-3 py-2 text-left font-medium">État</th>
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((item) => (
                  <tr key={item.id} className={item.isBlocked ? "bg-red-50" : ""}>
                    <td className="px-3 py-3">{item.email}</td>
                    <td className="px-3 py-3">{item.name || "-"}</td>
                    <td className="px-3 py-3">{item.plan}</td>
                    <td className="px-3 py-3">{item.role}</td>
                    <td className="px-3 py-3">{item.isBlocked ? "Bloqué" : "Actif"}</td>
                    <td className="px-3 py-3 text-right space-x-2">
                      <Button
                        size="sm"
                        variant={item.isBlocked ? "secondary" : "destructive"}
                        onClick={() => handleToggleBlock(item.id, !item.isBlocked)}
                      >
                        {item.isBlocked ? "Débloquer" : "Bloquer"}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleChangeRole(item.id, item.role === "admin" ? "user" : "admin")}
                      >
                        Passer {item.role === "admin" ? "user" : "admin"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteUser(item.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <Separator className="my-8" />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Paramètres de l’application</h2>
              <p className="text-sm text-muted-foreground">Modifiez la configuration centrale.</p>
            </div>
          </div>
          {settings.map((setting) => (
            <div key={setting.key} className="mb-4 rounded-xl border border-border bg-background p-4">
              <div className="mb-2 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold">{setting.label}</div>
                  <div className="text-xs text-muted-foreground">{setting.description}</div>
                </div>
                <Badge>{setting.key}</Badge>
              </div>
              <Input
                value={setting.value}
                onChange={(e) =>
                  setSettings((prev) =>
                    prev.map((item) =>
                      item.key === setting.key ? { ...item, value: e.target.value } : item
                    )
                  )
                }
              />
            </div>
          ))}
          <Button
            onClick={async () => {
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
              } catch (err) {
                setError(err instanceof Error ? err.message : "Erreur");
              }
            }}
          >
            Enregistrer les paramètres
          </Button>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Audit & Logs</h2>
              <p className="text-sm text-muted-foreground">Actions récentes des administrateurs.</p>
            </div>
            <Badge>{logs.length} entrées</Badge>
          </div>
          <div className="space-y-3 max-h-[500px] overflow-auto pr-2">
            {logs.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-border bg-background p-3">
                <div className="mb-1 flex items-center justify-between gap-2 text-sm font-semibold">
                  <span>{entry.action}</span>
                  <span className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</span>
                </div>
                <div className="text-sm text-muted-foreground">{entry.details || "Aucune information"}</div>
                <div className="mt-2 text-xs text-muted-foreground">Admin: {entry.adminId}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
