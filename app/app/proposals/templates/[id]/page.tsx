import type { Metadata } from "next";
import { TemplateEditorClient } from "./_editor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Editar modelo de proposta" };

export default function TemplateEditorPage() {
  return <TemplateEditorClient />;
}
