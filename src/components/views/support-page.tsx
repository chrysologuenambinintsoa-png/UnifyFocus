"use client"

import React, { FormEvent, useState } from "react";

export default function SupportPage(): React.JSX.Element {
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus(null);
    setSending(true);
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const payload = {
      userId: formData.get("email")?.toString() || undefined,
      name: formData.get("name")?.toString() || undefined,
      subject: formData.get("subject")?.toString() || undefined,
      message: formData.get("message")?.toString() || "",
    };

    if (!payload.userId || !payload.message) {
      setStatus({ type: "error", text: "Veuillez fournir un email et un message." });
      setSending(false);
      return;
    }

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setStatus({ type: "success", text: "Message envoyé — merci ! Nous répondrons sous 24–72 heures." });
        form.reset();
      } else {
        setStatus({ type: "error", text: json?.error || "Erreur serveur, réessayez plus tard." });
      }
    } catch (err) {
      setStatus({ type: "error", text: "Erreur réseau, vérifiez votre connexion." });
    }

    setSending(false);
    setTimeout(() => setStatus(null), 8000);
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <div className="bg-white border rounded-xl shadow p-6">
        <h1 className="text-xl font-semibold">Contact Support</h1>
        <p className="text-sm text-muted-foreground mt-1">Utilisez ce formulaire pour signaler un bug, demander de l'aide ou envoyer une demande commerciale.</p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium">Nom (optionnel)</label>
            <input name="name" type="text" className="mt-1 block w-full rounded-md border px-3 py-2" placeholder="Votre nom complet" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium">Email</label>
              <input name="email" type="email" required className="mt-1 block w-full rounded-md border px-3 py-2" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium">Sujet</label>
              <input name="subject" type="text" className="mt-1 block w-full rounded-md border px-3 py-2" placeholder="Ex: bug, facturation" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Message</label>
            <textarea name="message" required className="mt-1 block w-full rounded-md border px-3 py-2 min-h-[140px]" placeholder="Décrivez votre problème ou votre demande en détail..."></textarea>
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={sending} className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-md font-medium disabled:opacity-60">
              {sending ? "Envoi…" : "Envoyer la demande"}
            </button>
            {status ? (
              <div className={"px-3 py-2 rounded-md font-semibold " + (status.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white")}>
                {status.text}
              </div>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
