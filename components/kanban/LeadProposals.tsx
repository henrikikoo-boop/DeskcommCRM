"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UseTemplateDialog } from "@/components/proposals/UseTemplateDialog";

type Proposal = {
  id: string;
  title: string;
  status: string;
  public_token: string;
  view_count?: number;
};

export function LeadProposals({ leadId }: { leadId: string }) {
  const [items, setItems] = useState<Proposal[]>([]);
  const [open, setOpen] = useState(false);

  async function load() {
    const r = await fetch(`/api/v1/proposals?lead_id=${leadId}`, { cache: "no-store" });
    const j = await r.json();
    if (r.ok) setItems(j.data ?? []);
  }

  useEffect(() => {
    void load();
  }, [leadId]);

  return (
    <section className="border-b border-border py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted">Proposta comercial</h3>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs font-medium text-primary underline-offset-2 hover:underline"
        >
          Usar modelo
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-text-muted">
          Nenhum envio ainda. Escolha um modelo para preencher com os dados desta oportunidade.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((p) => (
            <li key={p.id} className="rounded-md border border-border px-3 py-2 text-xs">
              <div className="font-medium text-text">{p.title}</div>
              <div className="text-text-muted">
                {p.status}
                {p.view_count != null ? ` · ${p.view_count} views` : ""}
              </div>
              <div className="mt-1 flex gap-3">
                <Link className="text-primary underline" href={`/app/proposals/${p.id}`}>
                  Editar
                </Link>
                <a className="underline" href={`/p/${p.public_token}`} target="_blank" rel="noreferrer">
                  Link
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
      <UseTemplateDialog leadId={leadId} open={open} onOpenChange={setOpen} />
    </section>
  );
}
