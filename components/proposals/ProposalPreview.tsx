"use client";

import type { ProposalBlock, ProposalDesign, TemplateLineItem } from "@/lib/proposals/types";
import { lineItemTotalCents, sumLineItemsCents } from "@/lib/proposals/types";

type Props = {
  title?: string;
  design: ProposalDesign;
  blocks: ProposalBlock[];
  lineItems: TemplateLineItem[];
  currency?: string;
  brandName?: string | null;
  brandLogo?: string | null;
  status?: string;
  onAccept?: () => void;
  onReject?: () => void;
  busy?: boolean;
};

export function ProposalPreview({
  title,
  design,
  blocks,
  lineItems,
  currency = "BRL",
  brandName,
  brandLogo,
  status,
  onAccept,
  onReject,
  busy,
}: Props) {
  const pad = design.density === "compact" ? "1.25rem" : "2rem";
  const total = sumLineItemsCents(lineItems);
  const decided = status === "accepted" || status === "rejected";

  return (
    <article
      className="overflow-hidden rounded-xl border shadow-sm"
      style={{ fontFamily: design.fontBody, background: "#fff" }}
    >
      {blocks
        .filter((b) => b.enabled)
        .map((b) => {
          if (b.type === "cover") {
            return (
              <header
                key={b.id}
                style={{
                  background: design.coverBg,
                  color: design.coverText,
                  padding: pad,
                }}
              >
                {design.showLogo && brandLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={brandLogo} alt={brandName ?? "Logo"} className="mb-4 h-8 w-auto" />
                ) : design.showLogo && brandName ? (
                  <p className="mb-3 text-xs uppercase tracking-[0.2em] opacity-80">{brandName}</p>
                ) : null}
                <h1
                  className="text-3xl leading-tight"
                  style={{ fontFamily: design.fontHeading }}
                >
                  {b.title || title || "Proposta"}
                </h1>
                {b.subtitle ? <p className="mt-2 text-sm opacity-85">{b.subtitle}</p> : null}
              </header>
            );
          }

          if (b.type === "pricing") {
            return (
              <section key={b.id} style={{ padding: pad }} className="border-t">
                <h2
                  className="mb-3 text-lg font-semibold"
                  style={{ color: design.accent, fontFamily: design.fontHeading }}
                >
                  {b.title || "Investimento"}
                </h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 font-medium">Item</th>
                      <th className="py-2 font-medium">Qtd</th>
                      <th className="py-2 font-medium">Unit.</th>
                      <th className="py-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((it) => (
                      <tr key={it.id} className="border-b border-border/60">
                        <td className="py-2">
                          <div className="font-medium">{it.name}</div>
                          {it.description ? (
                            <div className="text-xs text-muted-foreground">{it.description}</div>
                          ) : null}
                        </td>
                        <td className="py-2">{it.quantity}</td>
                        <td className="py-2">
                          {(it.unit_cents / 100).toLocaleString("pt-BR", {
                            style: "currency",
                            currency,
                          })}
                          {it.discount_pct > 0 ? (
                            <span className="text-xs text-muted-foreground"> (−{it.discount_pct}%)</span>
                          ) : null}
                        </td>
                        <td className="py-2 font-medium">
                          {(lineItemTotalCents(it) / 100).toLocaleString("pt-BR", {
                            style: "currency",
                            currency,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-3 text-right text-base font-semibold" style={{ color: design.accent }}>
                  Total{" "}
                  {(total / 100).toLocaleString("pt-BR", { style: "currency", currency })}
                </p>
              </section>
            );
          }

          if (b.type === "acceptance") {
            return (
              <section key={b.id} style={{ padding: pad }} className="border-t bg-slate-50">
                <h2
                  className="mb-2 text-lg font-semibold"
                  style={{ color: design.accent, fontFamily: design.fontHeading }}
                >
                  {b.title || "Aceite"}
                </h2>
                {b.body ? (
                  <p className="mb-4 whitespace-pre-wrap text-sm text-muted-foreground">{b.body}</p>
                ) : null}
                {!decided && onAccept ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={onAccept}
                      className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      style={{ background: design.accent }}
                    >
                      Aceitar proposta
                    </button>
                    {onReject ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={onReject}
                        className="rounded-md border px-4 py-2 text-sm disabled:opacity-50"
                      >
                        Recusar
                      </button>
                    ) : null}
                  </div>
                ) : status ? (
                  <p className="text-sm font-medium">
                    Status: {status === "accepted" ? "Aceita" : status === "rejected" ? "Recusada" : status}
                  </p>
                ) : null}
              </section>
            );
          }

          return (
            <section key={b.id} style={{ padding: pad }} className="border-t">
              <h2
                className="mb-2 text-lg font-semibold"
                style={{ color: design.accent, fontFamily: design.fontHeading }}
              >
                {b.title}
              </h2>
              {b.body ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{b.body}</p>
              ) : null}
            </section>
          );
        })}
    </article>
  );
}
