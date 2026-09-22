# Orkesta Deskcomm — imagem local (VPS)

## Decisões
- Nunca abrir PR no `melgarafael/DeskcommCRM`.
- Imagem: `deskcomm-app:orkesta-local` (+ worker/scheduler) com `*_PULL_POLICY=never`.
- **Proibido** rodar `hostgator-setup-kit/update.sh` stock — ele reescreve `APP_IMAGE` para GHCR.

## Build / deploy
```bash
cd /opt/deskcomm
export APP_IMAGE=deskcomm-app:orkesta-local APP_PULL_POLICY=never
export WORKER_IMAGE=deskcomm-worker:orkesta-local WORKER_PULL_POLICY=never
export SCHEDULER_IMAGE=deskcomm-scheduler:orkesta-local SCHEDULER_PULL_POLICY=never
docker compose -f docker-compose.prod.yml -f docker-compose.build.yml -f docker-compose.caddy-host.yml --env-file .env build app worker scheduler
docker compose -f docker-compose.prod.yml -f docker-compose.caddy-host.yml --env-file .env up -d --force-recreate app worker scheduler
```

## Marca
- Nome: Orkesta CRM
- Accent: `#224bf1`
- Logo: `/brand/orkesta-logo.png` (fonte: `/root/Orkesta/apps/crm/crm-web/public/brand/`)
- DB: `platform_branding` id=1
- UI: `/admin/marca` e `/app/settings/marca`

## Rollback Caddy → CRM Orkesta antigo
```bash
cp /etc/caddy/caddy-vps.json.bak-before-deskcomm-* /etc/caddy/caddy-vps.json
systemctl reload caddy
systemctl start crm-web
```

## Código
- Live tree: `/opt/deskcomm`
- Mirror fork: `/opt/deskcomm-src` (branch `feat/orkesta-vps-cutover-parity`)

## WhatsApp / IA (gate manual)
1. UI → Integrações › WhatsApp → parear QR no WAHA (`deskcomm-waha-1` já up).
2. IA › Credenciais → confirmar OpenRouter (já no `.env` como `OPENROUTER_API_KEY`).
3. Enviar 1 mensagem de teste para o número pareado.

Admin bootstrap: `admin@orkesta.local` (senha em `/root/.deskcomm-bootstrap.env`).
