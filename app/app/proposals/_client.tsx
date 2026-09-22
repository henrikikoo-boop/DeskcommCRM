"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Proposal = {
  id: string;
  title: string;
  status: string;
  public_token: string;
  amount_cents: number | null;
  currency: string;
  view_count?: number;
  lead_id?: string | null;
};

export function ProposalsClient() {
  const [items, setItems] = useState<Proposal[]>([]);
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

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Propostas</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Crie o design em Modelos. Na oportunidade, use “Usar modelo” para gerar a proposta.
          </p>
        </div>
        <Link
          href="/app/proposals/templates"
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm"
        >
          Modelos de proposta
        </Link>
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <ul className="divide-border divide-y rounded-md border">
        {items.length === 0 ? (
          <li className="text-muted-foreground px-4 py-8 text-sm">
            Nenhuma proposta ainda. Abra uma oportunidade e escolha um modelo.
          </li>
        ) : (
          items.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <div>
                <div className="font-medium">{p.title}</div>
                <div className="text-muted-foreground">
                  {p.status}
                  {p.view_count != null ? ` · ${p.view_count} visualizações` : ""}
                  {p.amount_cents != null
                    ? ` · ${(p.amount_cents / 100).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: p.currency || "BRL",
                      })}`
                    : ""}
                </div>
              </div>
              <div className="flex gap-3">
                <Link className="text-primary underline" href={`/app/proposals/${p.id}`}>
                  Editar
                </Link>
                <a className="underline" href={`/p/${p.public_token}`} target="_blank" rel="noreferrer">
                  Link público
                </a>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
