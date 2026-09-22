"use client";

import * as React from "react";
import type { ProposalBlock, ProposalDesign, TemplateLineItem } from "@/lib/proposals/types";
import { lineItemTotalCents } from "@/lib/proposals/types";
import { PLACEHOLDER_HELP } from "@/lib/proposals/merge";

type Props = {
  blocks: ProposalBlock[];
  design: ProposalDesign;
  lineItems: TemplateLineItem[];
  onBlocksChange: (b: ProposalBlock[]) => void;
  onDesignChange: (d: ProposalDesign) => void;
  onLineItemsChange: (items: TemplateLineItem[]) => void;
  currency?: string;
};

const LABELS: Record<ProposalBlock["type"], string> = {
  cover: "Capa",
  summary: "Resumo",
  scope: "Escopo",
  pricing: "Investimento",
  terms: "Condições",
  acceptance: "Aceite",
};

export function ProposalBlockEditor({
  blocks,
  design,
  lineItems,
  onBlocksChange,
  onDesignChange,
  onLineItemsChange,
  currency = "BRL",
}: Props) {
  function updateBlock(id: string, patch: Partial<ProposalBlock>) {
    onBlocksChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function addLine() {
    onLineItemsChange([
      ...lineItems,
      {
        id: `li_${Math.random().toString(36).slice(2, 9)}`,
        name: "Novo item",
        quantity: 1,
        unit_cents: 0,
        discount_pct: 0,
      },
    ]);
  }

  function updateLine(id: string, patch: Partial<TemplateLineItem>) {
    onLineItemsChange(lineItems.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function removeLine(id: string) {
    onLineItemsChange(lineItems.filter((it) => it.id !== id));
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold">Design do modelo</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs space-y-1">
            <span className="text-muted-foreground">Cor de destaque</span>
            <input
              type="color"
              className="h-9 w-full cursor-pointer rounded border"
              value={design.accent}
              onChange={(e) => onDesignChange({ ...design, accent: e.target.value })}
            />
          </label>
          <label className="text-xs space-y-1">
            <span className="text-muted-foreground">Fundo da capa</span>
            <input
              type="color"
              className="h-9 w-full cursor-pointer rounded border"
              value={design.coverBg}
              onChange={(e) => onDesignChange({ ...design, coverBg: e.target.value })}
            />
          </label>
          <label className="text-xs space-y-1">
            <span className="text-muted-foreground">Texto da capa</span>
            <input
              type="color"
              className="h-9 w-full cursor-pointer rounded border"
              value={design.coverText}
              onChange={(e) => onDesignChange({ ...design, coverText: e.target.value })}
            />
          </label>
          <label className="flex items-center gap-2 text-xs pt-5">
            <input
              type="checkbox"
              checked={design.showLogo}
              onChange={(e) => onDesignChange({ ...design, showLogo: e.target.checked })}
            />
            Mostrar logo da marca
          </label>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Placeholders: {PLACEHOLDER_HELP.join(" · ")}
        </p>
      </section>

      {blocks.map((b) => (
        <section key={b.id} className="space-y-2 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{LABELS[b.type]}</h3>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={b.enabled}
                onChange={(e) => updateBlock(b.id, { enabled: e.target.checked })}
              />
              Ativo
            </label>
          </div>
          {b.type !== "pricing" ? (
            <>
              <input
                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                value={b.title ?? ""}
                placeholder="Título da seção"
                onChange={(e) => updateBlock(b.id, { title: e.target.value })}
              />
              {b.type === "cover" ? (
                <input
                  className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                  value={b.subtitle ?? ""}
                  placeholder="Subtítulo"
                  onChange={(e) => updateBlock(b.id, { subtitle: e.target.value })}
                />
              ) : null}
              {b.type !== "cover" ? (
                <textarea
                  className="border-input bg-background min-h-[100px] w-full rounded-md border px-3 py-2 text-sm"
                  value={b.body ?? ""}
                  placeholder="Conteúdo (use {{placeholders}})"
                  onChange={(e) => updateBlock(b.id, { body: e.target.value })}
                />
              ) : null}
              {b.type === "acceptance" ? (
                <select
                  className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                  value={b.acceptanceMethod ?? "click"}
                  onChange={(e) =>
                    updateBlock(b.id, {
                      acceptanceMethod: e.target.value as "click" | "print",
                    })
                  }
                >
                  <option value="click">Clique para aceitar</option>
                  <option value="print">Imprimir e assinar</option>
                </select>
              ) : null}
            </>
          ) : (
            <div className="space-y-2">
              <input
                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                value={b.title ?? ""}
                placeholder="Título da tabela"
                onChange={(e) => updateBlock(b.id, { title: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Itens padrão do modelo (podem ser editados na proposta final). Moeda: {currency}
              </p>
              {lineItems.map((it) => (
                <div key={it.id} className="grid gap-2 rounded border p-2 sm:grid-cols-6">
                  <input
                    className="border-input rounded border px-2 py-1 text-sm sm:col-span-2"
                    value={it.name}
                    onChange={(e) => updateLine(it.id, { name: e.target.value })}
                  />
                  <input
                    type="number"
                    min={0.001}
                    step="any"
                    className="border-input rounded border px-2 py-1 text-sm"
                    value={it.quantity}
                    onChange={(e) => updateLine(it.id, { quantity: Number(e.target.value) || 1 })}
                  />
                  <input
                    type="number"
                    min={0}
                    className="border-input rounded border px-2 py-1 text-sm"
                    value={(it.unit_cents / 100).toFixed(2)}
                    onChange={(e) =>
                      updateLine(it.id, {
                        unit_cents: Math.round(Number(e.target.value.replace(",", ".")) * 100) || 0,
                      })
                    }
                    placeholder="Preço unit."
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="border-input rounded border px-2 py-1 text-sm"
                    value={it.discount_pct}
                    onChange={(e) => updateLine(it.id, { discount_pct: Number(e.target.value) || 0 })}
                    placeholder="% desc."
                  />
                  <div className="flex items-center justify-between gap-1 text-xs">
                    <span>
                      {(lineItemTotalCents(it) / 100).toLocaleString("pt-BR", {
                        style: "currency",
                        currency,
                      })}
                    </span>
                    <button type="button" className="text-destructive" onClick={() => removeLine(it.id)}>
                      Remover
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="text-primary text-sm underline"
                onClick={addLine}
              >
                + Item
              </button>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
