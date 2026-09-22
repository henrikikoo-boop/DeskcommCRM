"use client";

import { useEffect, useState } from "react";

type Proposal = {
  id: string;
  title: string;
  status: string;
  public_token: string;
  amount_cents: number | null;
  currency: string;
};

export function ProposalsClient() {
  const [items, setItems] = useState<Proposal[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const r = await fetch("/api/v1/proposals", { cache: "no-store" });
    const j = await r.json();
    if (!r.ok) {
      setError(j?.error?.message ?? "Falha ao listar");
      return;
    }
    setItems(j.data ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/v1/proposals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, status: "sent", body_html: `<p>${title}</p>` }),
    });
    const j = await r.json();
    if (!r.ok) {
      setError(j?.error?.message ?? "Falha ao criar");
      return;
    }
    setTitle("");
    await load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Propostas</h1>
      <form onSubmit={create} className="flex gap-2">
        <input
          className="border-input bg-background flex-1 rounded-md border px-3 py-2 text-sm"
          placeholder="Título da proposta"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <button type="submit" className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm">
          Criar e enviar
        </button>
      </form>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <ul className="divide-border divide-y rounded-md border">
        {items.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
            <div>
              <div className="font-medium">{p.title}</div>
              <div className="text-muted-foreground">{p.status}</div>
            </div>
            <a className="text-primary underline" href={`/p/${p.public_token}`} target="_blank" rel="noreferrer">
              Link público
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
