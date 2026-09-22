"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Template = { id: string; name: string; description: string | null };

type Props = {
  leadId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function UseTemplateDialog({ leadId, open, onOpenChange }: Props) {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const r = await fetch("/api/v1/proposal-templates?active=1", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) {
        setError(j?.error?.message ?? "Falha ao carregar modelos");
        return;
      }
      const list = (j.data ?? []) as Template[];
      setTemplates(list);
      setSelected(list[0]?.id ?? "");
    })();
  }, [open]);

  async function create() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    const r = await fetch("/api/v1/proposals/from-template", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ template_id: selected, lead_id: leadId }),
    });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) {
      setError(j?.error?.message ?? "Falha ao criar proposta");
      return;
    }
    onOpenChange(false);
    router.push(`/app/proposals/${j.data.id}`);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-background w-full max-w-md space-y-4 rounded-lg border p-5 shadow-lg">
        <div>
          <h2 className="text-base font-semibold">Usar modelo de proposta</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Os dados da oportunidade serão preenchidos no modelo. Depois você faz a edição final.
          </p>
        </div>
        {templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum modelo ativo. Crie em{" "}
            <a className="underline" href="/app/proposals/templates">
              Modelos de proposta
            </a>
            .
          </p>
        ) : (
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {templates.map((t) => (
              <li key={t.id}>
                <label className="flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm has-[:checked]:border-primary">
                  <input
                    type="radio"
                    name="template"
                    checked={selected === t.id}
                    onChange={() => setSelected(t.id)}
                  />
                  <span>
                    <span className="font-medium">{t.name}</span>
                    {t.description ? (
                      <span className="text-muted-foreground block text-xs">{t.description}</span>
                    ) : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border px-3 py-2 text-sm"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={busy || !selected}
            className="bg-primary text-primary-foreground rounded-md px-3 py-2 text-sm disabled:opacity-50"
            onClick={() => void create()}
          >
            Continuar para edição
          </button>
        </div>
      </div>
    </div>
  );
}
