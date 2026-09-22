import type { Metadata } from "next";
import { ProposalsClient } from "./_client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Propostas" };

export default function ProposalsPage() {
  return <ProposalsClient />;
}
