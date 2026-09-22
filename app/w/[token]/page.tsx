"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Msg = { id: string; direction: string; body: string; created_at: string };

export default function PublicWebchatPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const session = useMemo(() => {
    if (typeof window === "undefined") return "";
    const key = `webchat:${token}`;
    let s = localStorage.getItem(key);
    if (!s) {
      s = crypto.randomUUID().replace(/-/g, "");
      localStorage.setItem(key, s);
    }
    return s;
  }, [token]);

  const [welcome, setWelcome] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!session) return;
    const r = await fetch(
      `/api/v1/public/webchat/${token}?session_token=${encodeURIComponent(session)}`,
    );
    const j = await r.json();
    if (!r.ok) {
      setError(j?.error?.message ?? "Widget inválido");
      return;
    }
    setWelcome(j.data.welcome_message);
    setMessages(j.data.messages ?? []);
  }

  useEffect(() => {
    void load();
  }, [token, session]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch(`/api/v1/public/webchat/${token}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ session_token: session, body: text }),
    });
    const j = await r.json();
    if (!r.ok) {
      setError(j?.error?.message ?? "Falha ao enviar");
      return;
    }
    setText("");
    await load();
  }

  if (error) return <main className="mx-auto max-w-md p-8 text-sm">{error}</main>;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col p-4">
      <h1 className="mb-2 text-lg font-semibold">Chat</h1>
      <p className="text-muted-foreground mb-4 text-sm">{welcome}</p>
      <div className="flex-1 space-y-2 overflow-y-auto rounded-md border p-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.direction === "inbound"
                ? "bg-muted ml-8 rounded-md px-3 py-2 text-sm"
                : "bg-primary/10 mr-8 rounded-md px-3 py-2 text-sm"
            }
          >
            {m.body}
          </div>
        ))}
      </div>
      <form onSubmit={send} className="mt-3 flex gap-2">
        <input
          className="border-input bg-background flex-1 rounded-md border px-3 py-2 text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Digite sua mensagem"
          required
        />
        <button type="submit" className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm">
          Enviar
        </button>
      </form>
    </main>
  );
}
