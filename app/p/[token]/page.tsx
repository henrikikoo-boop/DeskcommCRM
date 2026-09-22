"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function PublicProposalPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [data, setData] = useState<{
    title: string;
    status: string;
    body_html: string;
    amount_cents: number | null;
    currency: string;
  } | null>(null);
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
      setData(j.data);
    })();
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

  return (
    <main className="mx-auto max-w-xl space-y-6 p-8">
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
    </main>
  );
}
