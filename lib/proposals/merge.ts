export type MergeContext = {
  lead?: { title?: string | null; value_cents?: number | null; currency?: string | null };
  contact?: { name?: string | null; email?: string | null; phone?: string | null };
  company?: { name?: string | null };
  org?: { name?: string | null };
  proposal?: { title?: string | null; valid_until?: string | null; currency?: string | null };
};

function money(cents: number | null | undefined, currency = "BRL"): string {
  if (cents == null || Number.isNaN(cents)) return "—";
  try {
    return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: currency || "BRL" });
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

function dateBr(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

const MAP: Record<string, (ctx: MergeContext) => string> = {
  "lead.title": (c) => c.lead?.title?.trim() || "—",
  "lead.value": (c) => money(c.lead?.value_cents, c.lead?.currency || c.proposal?.currency || "BRL"),
  "contact.name": (c) => c.contact?.name?.trim() || "—",
  "contact.email": (c) => c.contact?.email?.trim() || "—",
  "contact.phone": (c) => c.contact?.phone?.trim() || "—",
  "company.name": (c) => c.company?.name?.trim() || "—",
  "org.name": (c) => c.org?.name?.trim() || "—",
  "proposal.title": (c) => c.proposal?.title?.trim() || "—",
  "proposal.valid_until": (c) => dateBr(c.proposal?.valid_until),
};

export function mergePlaceholders(text: string | null | undefined, ctx: MergeContext): string {
  if (!text) return "";
  return text.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_m, key: string) => {
    const fn = MAP[key];
    return fn ? fn(ctx) : `{{${key}}}`;
  });
}

export const PLACEHOLDER_HELP = [
  "{{lead.title}}",
  "{{lead.value}}",
  "{{contact.name}}",
  "{{contact.email}}",
  "{{contact.phone}}",
  "{{company.name}}",
  "{{org.name}}",
  "{{proposal.title}}",
  "{{proposal.valid_until}}",
] as const;
