# Cutover Orkesta CRM → DeskcommCRM (VPS com Caddy host)

> Contexto: VPS `169.58.110.124`, host `orkesta.rafiqueai.com.br`.
> Content OS (`/content`) e Pulse (`/pulse`) **não** mudam.
> Sem migração de dados — ambos os CRMs estavam sem base real.

## Homolog (antes do cutover)

1. Deskcomm em `/opt/deskcomm` com `docker-compose.prod.yml` +
   `docker-compose.caddy-host.yml` (app em `127.0.0.1:3050`).
2. Supabase **self-host** via `supabase start` **sem** aplicar a cadeia
   `migrations/` (mova `supabase/migrations` para fora, suba, aplique
   `supabase/baseline.sql`, restaure a pasta).
3. Smoke: `curl -sI http://127.0.0.1:3050/login` → 200.
4. Orkesta CRM continua em `:3010` (rota catch-all do Caddy).

```bash
cd /opt/deskcomm
docker compose -f docker-compose.prod.yml -f docker-compose.caddy-host.yml \
  --env-file .env up -d
```

## Cutover (janela curta, 1 operador)

1. Backup do Caddy:

```bash
cp /etc/caddy/caddy-vps.json \
  /etc/caddy/caddy-vps.json.bak-before-deskcomm-$(date -u +%Y%m%d%H%M)
```

2. No route catch-all de `orkesta.rafiqueai.com.br` (hoje `127.0.0.1:3010`),
   troque o dial para `127.0.0.1:3050`.

3. (Recomendado) Proxies do Kong local antes do catch-all:

| path | dial |
|------|------|
| `/auth/v1*` `/rest/v1*` `/storage/v1*` `/realtime/v1*` | `127.0.0.1:54321` |

4. Atualize `.env` do Deskcomm:

- `NEXT_PUBLIC_APP_URL=https://orkesta.rafiqueai.com.br`
- `NEXT_PUBLIC_SUPABASE_URL=https://orkesta.rafiqueai.com.br` (se proxied)
  ou mantenha `http://host.docker.internal:54321` só para o server e use
  o mesmo host público no browser após o proxy.

5. Reload Caddy:

```bash
systemctl reload caddy
# ou: caddy reload --config /etc/caddy/caddy-vps.json --force
```

6. Smoke produção:

```bash
curl -sI https://orkesta.rafiqueai.com.br/login   # 200/307 Deskcomm
curl -sI https://orkesta.rafiqueai.com.br/pulse   # Pulse intacto
curl -sI https://orkesta.rafiqueai.com.br/content # Content intacto
```

7. Pare o CRM Orkesta:

```bash
systemctl stop crm-web
# opcional: docker stop crm-canary-local-crm-api-1 crm-canary-local-crm-worker-1
```

## Rollback

```bash
# 1) dial catch-all de volta para 127.0.0.1:3010
cp /etc/caddy/caddy-vps.json.bak-before-deskcomm-XXXX /etc/caddy/caddy-vps.json
systemctl reload caddy
systemctl start crm-web
```

## Admin homolog (gerado no bootstrap)

- E-mail: `admin@orkesta.local`
- Senha: definida no bootstrap da VPS (`/root/.deskcomm-bootstrap.env`)
- Troque após o primeiro login.

## Features de paridade (MVP neste PR)

| Feature | Rotas |
|---------|--------|
| Empresas | `/app/companies`, `/api/v1/companies` |
| Propostas | `/app/proposals`, público `/p/[token]` |
| Booking | público `/b/[token]` |
| Webchat | público `/w/[token]` |

## Gate G2 (WhatsApp)

WAHA sobe no compose Deskcomm. Pareamento QR e primeira mensagem ponta a ponta
dependem de celular — faça na UI em Integrações › WhatsApp após o cutover.
OpenRouter já pode estar no `.env` (`OPENROUTER_API_KEY`); cadastre também em
IA › Credenciais se preferir chave por organização.
