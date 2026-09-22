---
impacto: capacidade_nova
secao: adicionado
titulo: Cutover Orkesta com Caddy próprio e paridade de propostas
---

Quem opera uma VPS que já tem Caddy (como a Orkesta) consegue subir o CRM sem
brigar pelas portas 80/443: o compose `docker-compose.caddy-host.yml` publica o
app só em loopback e o proxy do host aponta para ele. O runbook
`docs/runbooks/orkesta-deskcomm-cutover.md` descreve homolog, cutover e rollback.

Também entram empresas no CRM, propostas com link público, pedido de horário
público e um widget de webchat — o mínimo que o CRM Orkesta cobria além do núcleo.
