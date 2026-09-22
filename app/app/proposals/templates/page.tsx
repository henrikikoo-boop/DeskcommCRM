import type { Metadata } from "next";
import { ProposalTemplatesClient } from "./_client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Modelos de proposta" };

export default function ProposalTemplatesPage() {
  return <ProposalTemplatesClient />;
}
