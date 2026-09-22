import type { Metadata } from "next";
import { ProposalEditorClient } from "./_editor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Editar proposta" };

export default function ProposalEditorPage() {
  return <ProposalEditorClient />;
}
