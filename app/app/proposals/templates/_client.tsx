"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Template = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  updated_at: string;
};

export function ProposalTemplatesClient() {
  const router = useRouter();
  const [items, setItems] = useState<Template[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch("/api/v1/proposal-templates", { cache: "no-store" });
    const j = await r.json();
    if (!r.ok) {
      setError(j?.error?.message ?? "Falha ao listar modelos");
      return;
    }
    setItems(j.data ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/v1/proposal-templates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Novo modelo de proposta" }),
    });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) {
      setError(j?.error?.message ?? "Falha ao criar");
      return;
    }
    router.push(`/app/proposals/templates/${j.data.id}`);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm">
            <Link href="/app/proposals" className="underline">
              Propostas
            </Link>{" "}
            / Modelos
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Modelos de proposta</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Aqui fica o design e o conteúdo padrão. Nas oportunidades você escolhe “Usar modelo”.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void create()}
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm disabled:opacity-50"
        >
          Novo modelo
        </button>
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <ul className="divide-border divide-y rounded-md border">
        {items.length === 0 ? (
          <li className="text-muted-foreground px-4 py-8 text-sm">Nenhum modelo ainda.</li>
        ) : (
          items.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <div>
                <div className="font-medium">{t.name}</div>
                <div className="text-muted-foreground">
                  {t.is_active ? "Ativo" : "Inativo"}
                  {t.description ? ` · ${t.description}` : ""}
                </div>
              </div>
              <Link className="text-primary underline" href={`/app/proposals/templates/${t.id}`}>
                Editar design
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
