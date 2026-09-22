"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProposalPreview } from "@/components/proposals/ProposalPreview";
import {
  DEFAULT_DESIGN,
  type ProposalBlock,
  type ProposalDesign,
  type TemplateLineItem,
} from "@/lib/proposals/types";

type PublicData = {
  title: string;
  status: string;
  body_html: string;
  amount_cents: number | null;
  currency: string;
  blocks: ProposalBlock[];
  design: ProposalDesign;
  line_items: TemplateLineItem[];
  brand?: { name: string | null; logo_url: string | null; accent: string | null };
};

export default function PublicProposalPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [data, setData] = useState<PublicData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const r = await fetch(`/api/v1/public/proposals/${token}`);
      const j = await r.json();
      if (!r.ok) {
        setError(j?.error?.message ?? "Não encontrada");
        return;
      }
      setData({
        ...j.data,
        blocks: Array.isArray(j.data.blocks) ? j.data.blocks : [],
        design: { ...DEFAULT_DESIGN, ...(j.data.design ?? {}) },
        line_items: Array.isArray(j.data.line_items) ? j.data.line_items : [],
      });
    })();

    const started = Date.now();
    const tick = window.setInterval(() => {
      const secs = Math.floor((Date.now() - started) / 1000);
      if (secs > 0 && secs % 15 === 0) {
        void fetch(`/api/v1/public/proposals/${token}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ open_seconds: 15 }),
        });
      }
    }, 1000);
    return () => window.clearInterval(tick);
  }, [token]);

  async function decide(decision: "accepted" | "rejected") {
    setBusy(true);
    const r = await fetch(`/api/v1/public/proposals/${token}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) {
      setError(j?.error?.message ?? "Falha");
      return;
    }
    setData((d) => (d ? { ...d, status: j.data.status } : d));
  }

  if (error) return <main className="mx-auto max-w-xl p-8 text-sm">{error}</main>;
  if (!data) return <main className="mx-auto max-w-xl p-8 text-sm">Carregando…</main>;

  const hasBlocks = data.blocks.some((b) => b.enabled);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        {hasBlocks ? (
          <ProposalPreview
            title={data.title}
            design={data.design}
            blocks={data.blocks}
            lineItems={data.line_items}
            currency={data.currency || "BRL"}
            brandName={data.brand?.name}
            brandLogo={data.brand?.logo_url}
            status={data.status}
            busy={busy}
            onAccept={
              data.status !== "accepted" && data.status !== "rejected"
                ? () => void decide("accepted")
                : undefined
            }
            onReject={
              data.status !== "accepted" && data.status !== "rejected"
                ? () => void decide("rejected")
                : undefined
            }
          />
        ) : (
          <article className="space-y-6 rounded-xl border bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-semibold">{data.title}</h1>
            {data.amount_cents != null ? (
              <p className="text-muted-foreground text-sm">
                {(data.amount_cents / 100).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: data.currency || "BRL",
                })}
              </p>
            ) : null}
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: data.body_html || "<p></p>" }}
            />
            <p className="text-muted-foreground text-sm">Status: {data.status}</p>
            {data.status !== "accepted" && data.status !== "rejected" ? (
              <div className="flex gap-2">
                <button
                  disabled={busy}
                  className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm"
                  onClick={() => void decide("accepted")}
                >
                  Aceitar
                </button>
                <button
                  disabled={busy}
                  className="border-input rounded-md border px-4 py-2 text-sm"
                  onClick={() => void decide("rejected")}
                >
                  Recusar
                </button>
              </div>
            ) : null}
          </article>
        )}
      </div>
    </main>
  );
}
