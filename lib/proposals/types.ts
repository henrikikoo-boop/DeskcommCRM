export type ProposalBlockType =
  | "cover"
  | "summary"
  | "scope"
  | "pricing"
  | "terms"
  | "acceptance";

export type AcceptanceMethod = "click" | "print";

export type ProposalDesign = {
  accent: string;
  coverBg: string;
  coverText: string;
  fontHeading: string;
  fontBody: string;
  showLogo: boolean;
  density: "comfortable" | "compact";
};

export type ProposalBlock = {
  id: string;
  type: ProposalBlockType;
  enabled: boolean;
  title?: string;
  /** Free text / HTML-ish plain content with {{placeholders}}. */
  body?: string;
  subtitle?: string;
  acceptanceMethod?: AcceptanceMethod;
};

export type TemplateLineItem = {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unit_cents: number;
  discount_pct: number;
  product_id?: string | null;
};

export type ProposalLineItem = TemplateLineItem & {
  proposal_id?: string;
};

export const DEFAULT_DESIGN: ProposalDesign = {
  accent: "#224bf1",
  coverBg: "#0b1220",
  coverText: "#ffffff",
  fontHeading: "Georgia, 'Times New Roman', serif",
  fontBody: "system-ui, -apple-system, Segoe UI, sans-serif",
  showLogo: true,
  density: "comfortable",
};

export function newBlockId(): string {
  return `b_${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultBlocks(): ProposalBlock[] {
  return [
    {
      id: newBlockId(),
      type: "cover",
      enabled: true,
      title: "Proposta comercial",
      subtitle: "Preparada para {{contact.name}} · {{lead.title}}",
    },
    {
      id: newBlockId(),
      type: "summary",
      enabled: true,
      title: "Resumo executivo",
      body: "Esta proposta descreve o escopo, investimento e condições para {{lead.title}}.",
    },
    {
      id: newBlockId(),
      type: "scope",
      enabled: true,
      title: "Escopo",
      body: "• Diagnóstico e alinhamento\n• Entrega do que foi combinado\n• Acompanhamento pós-início",
    },
    {
      id: newBlockId(),
      type: "pricing",
      enabled: true,
      title: "Investimento",
    },
    {
      id: newBlockId(),
      type: "terms",
      enabled: true,
      title: "Condições",
      body: "Validade: {{proposal.valid_until}}\nForma de pagamento a combinar.\nProposta sujeita a disponibilidade.",
    },
    {
      id: newBlockId(),
      type: "acceptance",
      enabled: true,
      title: "Aceite",
      acceptanceMethod: "click",
      body: "Ao aceitar, você confirma que leu e concorda com os termos desta proposta.",
    },
  ];
}

export function lineItemTotalCents(item: {
  quantity: number;
  unit_cents: number;
  discount_pct: number;
}): number {
  const gross = Math.round(Number(item.quantity) * Number(item.unit_cents));
  const disc = Math.min(100, Math.max(0, Number(item.discount_pct) || 0));
  return Math.max(0, Math.round(gross * (1 - disc / 100)));
}

export function sumLineItemsCents(
  items: Array<{ quantity: number; unit_cents: number; discount_pct: number }>,
): number {
  return items.reduce((acc, it) => acc + lineItemTotalCents(it), 0);
}
