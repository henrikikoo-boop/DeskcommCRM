# Propostas comerciais — modelos + envio na oportunidade

## O que mudou

A proposta deixa de ser só “criar e enviar um link”. Agora há:

1. **Modelos** (`/app/proposals/templates`) — tela de design: cores, capa, blocos (capa, resumo, escopo, investimento, condições, aceite), itens padrão e placeholders.
2. **Na oportunidade** (dossiê do lead no funil) — botão **Usar modelo**: escolhe o modelo, preenche com dados do negócio/contato/empresa e abre a **edição final**.
3. **Link público** (`/p/{token}`) — renderiza os blocos, registra visualização/tempo e permite aceitar ou recusar.

## Placeholders nos modelos

`{{lead.title}}` · `{{lead.value}}` · `{{contact.name}}` · `{{contact.email}}` · `{{contact.phone}}` · `{{company.name}}` · `{{org.name}}` · `{{proposal.title}}` · `{{proposal.valid_until}}`

## Schema

- `crm_proposal_templates` — design + blocks + default_line_items
- `crm_proposals` — blocks, design, version, valid_until, view_count, open_seconds, template_id
- `crm_proposal_line_items` — itens da proposta

Migration: `20260922120000_0383_proposal_templates_editor.sql`

## APIs

- `GET/POST /api/v1/proposal-templates`
- `GET/PATCH/DELETE /api/v1/proposal-templates/[id]`
- `POST /api/v1/proposals/from-template` `{ template_id, lead_id }`
- `GET/PATCH /api/v1/proposals/[id]`
- `GET/PATCH /api/v1/public/proposals/[token]` (aceite + tracking)

## Fluxo do vendedor

```text
Modelos (design) → Funil → Abrir oportunidade → Usar modelo
  → Edição final → Salvar e enviar → Link /p/... → Cliente aceita/recusa
```
