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

export function TemplateEditorClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [design, setDesign] = useState<ProposalDesign>(DEFAULT_DESIGN);
  const [blocks, setBlocks] = useState<ProposalBlock[]>(defaultBlocks());
  const [lineItems, setLineItems] = useState<TemplateLineItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      const r = await fetch(`/api/v1/proposal-templates/${id}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) {
        setError(j?.error?.message ?? "Falha ao carregar");
        return;
      }
      setName(j.data.name ?? "");
      setDescription(j.data.description ?? "");
      setIsActive(Boolean(j.data.is_active));
      setDesign({ ...DEFAULT_DESIGN, ...(j.data.design ?? {}) });
      setBlocks(Array.isArray(j.data.blocks) && j.data.blocks.length ? j.data.blocks : defaultBlocks());
      setLineItems(Array.isArray(j.data.default_line_items) ? j.data.default_line_items : []);
      setLoaded(true);
    })();
  }, [id]);

  async function save() {
    setBusy(true);
    setError(null);
    const r = await fetch(`/api/v1/proposal-templates/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || null,
        is_active: isActive,
        design,
        blocks,
        default_line_items: lineItems,
      }),
    });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) {
      setError(j?.error?.message ?? "Falha ao salvar");
      return;
    }
  }

  if (!loaded && !error) {
    return <main className="p-6 text-sm">Carregando modelo…</main>;
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 p-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div>
          <p className="text-muted-foreground text-sm">
            <Link href="/app/proposals/templates" className="underline">
              Modelos
            </Link>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Editor do modelo</h1>
        </div>
        <input
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm font-medium"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do modelo"
        />
        <textarea
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrição interna (opcional)"
          rows={2}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Modelo ativo (aparece em “Usar modelo”)
        </label>
        <ProposalBlockEditor
          blocks={blocks}
          design={design}
          lineItems={lineItems}
          onBlocksChange={setBlocks}
          onDesignChange={setDesign}
          onLineItemsChange={setLineItems}
        />
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm disabled:opacity-50"
          >
            Salvar modelo
          </button>
          <button
            type="button"
            className="rounded-md border px-4 py-2 text-sm"
            onClick={() => router.push("/app/proposals/templates")}
          >
            Voltar
          </button>
        </div>
      </div>
      <div className="lg:sticky lg:top-4 lg:self-start">
        <p className="text-muted-foreground mb-2 text-xs uppercase tracking-wide">Pré-visualização</p>
        <ProposalPreview
          title={name}
          design={design}
          blocks={blocks}
          lineItems={lineItems}
          brandName="Orkesta CRM"
        />
      </div>
    </div>
  );
}
