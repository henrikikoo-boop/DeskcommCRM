import { z } from "zod";
import {
  DEFAULT_DESIGN,
  type AcceptanceMethod,
  type ProposalBlock,
  type ProposalBlockType,
  type ProposalDesign,
  type TemplateLineItem,
} from "@/lib/proposals/types";

const blockType = z.enum(["cover", "summary", "scope", "pricing", "terms", "acceptance"]);
const acceptanceMethod = z.enum(["click", "print"]);

export const designSchema = z
  .object({
    accent: z.string().max(32).optional(),
    coverBg: z.string().max(32).optional(),
    coverText: z.string().max(32).optional(),
    fontHeading: z.string().max(120).optional(),
    fontBody: z.string().max(120).optional(),
    showLogo: z.boolean().optional(),
    density: z.enum(["comfortable", "compact"]).optional(),
  })
  .transform((d): ProposalDesign => ({
    ...DEFAULT_DESIGN,
    ...d,
  }));

export const blockSchema = z.object({
  id: z.string().min(1).max(64),
  type: blockType,
  enabled: z.boolean(),
  title: z.string().max(200).optional(),
  subtitle: z.string().max(500).optional(),
  body: z.string().max(50_000).optional(),
  acceptanceMethod: acceptanceMethod.optional(),
});

export const lineItemSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  quantity: z.number().positive().max(1_000_000),
  unit_cents: z.number().int().nonnegative(),
  discount_pct: z.number().min(0).max(100).default(0),
  product_id: z.string().uuid().optional().nullable(),
});

export const templateCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  is_active: z.boolean().optional().default(true),
  design: designSchema.optional(),
  blocks: z.array(blockSchema).max(40).optional(),
  default_line_items: z.array(lineItemSchema).max(100).optional(),
});

export const templateUpdateSchema = templateCreateSchema.partial();

export const fromTemplateSchema = z.object({
  template_id: z.string().uuid(),
  lead_id: z.string().uuid(),
  title: z.string().trim().min(1).max(200).optional(),
  valid_until: z.string().datetime().optional().nullable(),
});

export function asBlocks(raw: unknown): ProposalBlock[] {
  const parsed = z.array(blockSchema).safeParse(raw);
  return parsed.success ? (parsed.data as ProposalBlock[]) : [];
}

export function asDesign(raw: unknown): ProposalDesign {
  const parsed = designSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : { ...DEFAULT_DESIGN };
}

export function asLineItems(raw: unknown): TemplateLineItem[] {
  const parsed = z.array(lineItemSchema).safeParse(raw);
  return parsed.success ? (parsed.data as TemplateLineItem[]) : [];
}

export type { ProposalBlock, ProposalBlockType, AcceptanceMethod, ProposalDesign, TemplateLineItem };
