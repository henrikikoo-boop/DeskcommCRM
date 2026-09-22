"use client";

import { useEffect, useState } from "react";

type Company = {
  id: string;
  name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
};

export function CompaniesClient() {
  const [items, setItems] = useState<Company[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/v1/companies", { cache: "no-store" });
    const j = await r.json();
    if (!r.ok) {
      setError(j?.error?.message ?? "Falha ao listar");
      setLoading(false);
      return;
    }
    setItems(j.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const r = await fetch("/api/v1/companies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const j = await r.json();
    if (!r.ok) {
      setError(j?.error?.message ?? "Falha ao criar");
      return;
    }
    setName("");
    await load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Empresas</h1>
      <form onSubmit={create} className="flex gap-2">
        <input
          className="border-input bg-background flex-1 rounded-md border px-3 py-2 text-sm"
          placeholder="Nome da empresa"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <button
          type="submit"
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm"
        >
          Adicionar
        </button>
      </form>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando…</p>
      ) : (
        <ul className="divide-border divide-y rounded-md border">
          {items.map((c) => (
            <li key={c.id} className="px-4 py-3 text-sm">
              <div className="font-medium">{c.name}</div>
              <div className="text-muted-foreground">
                {[c.document, c.phone, c.email].filter(Boolean).join(" · ") || "—"}
              </div>
            </li>
          ))}
          {items.length === 0 ? (
            <li className="text-muted-foreground px-4 py-6 text-sm">Nenhuma empresa ainda.</li>
          ) : null}
        </ul>
      )}
    </div>
  );
}
