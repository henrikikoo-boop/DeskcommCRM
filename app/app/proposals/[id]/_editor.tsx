"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ProposalBlockEditor } from "@/components/proposals/ProposalBlockEditor";
import { ProposalPreview } from "@/components/proposals/ProposalPreview";
import {
  DEFAULT_DESIGN,
  defaultBlocks,
  type ProposalBlock,
  type ProposalDesign,
  type TemplateLineItem,
} from "@/lib/proposals/types";

export function ProposalEditorClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("draft");
  const [token, setToken] = useState("");
  const [currency, setCurrency] = useState("BRL");
  const [validUntil, setValidUntil] = useState("");
  const [design, setDesign] = useState<ProposalDesign>(DEFAULT_DESIGN);
  const [blocks, setBlocks] = useState<ProposalBlock[]>(defaultBlocks());
  const [lineItems, setLineItems] = useState<TemplateLineItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const r = await fetch(`/api/v1/proposals/${id}`, { cache: "no-store" });
    const j = await r.json();
    if (!r.ok) {
      setError(j?.error?.message ?? "Falha ao carregar");
      return;
    }
    setTitle(j.data.title ?? "");
    setStatus(j.data.status ?? "draft");
    setToken(j.data.public_token ?? "");
    setCurrency(j.data.currency || "BRL");
    setValidUntil(j.data.valid_until ? j.data.valid_until.slice(0, 10) : "");
    setDesign({ ...DEFAULT_DESIGN, ...(j.data.design ?? {}) });
    setBlocks(Array.isArray(j.data.blocks) && j.data.blocks.length ? j.data.blocks : defaultBlocks());
    setLineItems(
      (j.data.line_items ?? []).map((it: TemplateLineItem & { id: string }) => ({
        id: it.id,
        name: it.name,
        description: it.description ?? undefined,
        quantity: Number(it.quantity),
        unit_cents: Number(it.unit_cents),
        discount_pct: Number(it.discount_pct),
        product_id: it.product_id,
      })),
    );
    setLoaded(true);
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function save(nextStatus?: "draft" | "sent") {
    setBusy(true);
    setError(null);
    const r = await fetch(`/api/v1/proposals/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        design,
        blocks,
        line_items: lineItems,
        currency,
        valid_until: validUntil ? new Date(`${validUntil}T23:59:59`).toISOString() : null,
        status: nextStatus,
      }),
    });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) {
      setError(j?.error?.message ?? "Falha ao salvar");
      return;
    }
    setStatus(j.data.status);
    setToken(j.data.public_token);
  }

  if (!loaded && !error) return <main className="p-6 text-sm">Carregando proposta…</main>;

  return (
    <div className="mx-auto grid max-w-6xl gap-6 p-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div>
          <p className="text-muted-foreground text-sm">
            <Link href="/app/proposals" className="underline">
              Propostas
            </Link>{" "}
            · edição final
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Proposta</h1>
          <p className="text-muted-foreground text-sm">Status: {status}</p>
        </div>
        <input
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm font-medium"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <label className="block text-xs space-y-1">
          <span className="text-muted-foreground">Validade</span>
          <input
            type="date"
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />
        </label>
        <ProposalBlockEditor
          blocks={blocks}
          design={design}
          lineItems={lineItems}
          onBlocksChange={setBlocks}
          onDesignChange={setDesign}
          onLineItemsChange={setLineItems}
          currency={currency}
        />
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="rounded-md border px-4 py-2 text-sm disabled:opacity-50"
          >
            Salvar rascunho
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save("sent")}
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm disabled:opacity-50"
          >
            Salvar e enviar
          </button>
          {token ? (
            <a
              className="text-primary self-center text-sm underline"
              href={`/p/${token}`}
              target="_blank"
              rel="noreferrer"
            >
              Abrir link público
            </a>
          ) : null}
          <button
            type="button"
            className="rounded-md border px-4 py-2 text-sm"
            onClick={() => router.push("/app/proposals")}
          >
            Voltar
          </button>
        </div>
      </div>
      <div className="lg:sticky lg:top-4 lg:self-start">
        <p className="text-muted-foreground mb-2 text-xs uppercase tracking-wide">Pré-visualização</p>
        <ProposalPreview
          title={title}
          design={design}
          blocks={blocks}
          lineItems={lineItems}
          currency={currency}
          brandName="Orkesta CRM"
          status={status}
        />
      </div>
    </div>
  );
}
