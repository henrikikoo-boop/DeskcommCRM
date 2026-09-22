"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function PublicBookingPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [title, setTitle] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const r = await fetch(`/api/v1/public/booking/${token}`);
      const j = await r.json();
      if (!r.ok) {
        setError(j?.error?.message ?? "Link inválido");
        return;
      }
      setTitle(j.data.title);
    })();
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch(`/api/v1/public/booking/${token}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        requester_name: name,
        requester_email: email || null,
        requester_phone: phone || null,
      }),
    });
    const j = await r.json();
    if (!r.ok) {
      setError(j?.error?.message ?? "Falha");
      return;
    }
    setDone(true);
  }

  if (error) return <main className="mx-auto max-w-md p-8 text-sm">{error}</main>;
  if (!title) return <main className="mx-auto max-w-md p-8 text-sm">Carregando…</main>;
  if (done) {
    return (
      <main className="mx-auto max-w-md space-y-2 p-8">
        <h1 className="text-xl font-semibold">Pedido enviado</h1>
        <p className="text-muted-foreground text-sm">Entraremos em contato em breve.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md space-y-4 p-8">
      <h1 className="text-xl font-semibold">{title}</h1>
      <form onSubmit={submit} className="space-y-3">
        <input
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          placeholder="Seu nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          placeholder="E-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          placeholder="Telefone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <button type="submit" className="bg-primary text-primary-foreground w-full rounded-md px-4 py-2 text-sm">
          Solicitar horário
        </button>
      </form>
    </main>
  );
}
