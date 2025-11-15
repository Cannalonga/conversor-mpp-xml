# Customer Support Runbook
**Arquivo:** `docs/runbooks/customer-support.md`  
**Versão:** 1.0  
**Última atualização:** 15/11/2025

## Objetivo
Padronizar atendimento ao cliente (B2B/B2C) para garantir respostas rápidas, escalonamento correto e resolução documentada de problemas relacionados a upload, pagamento, conversão e download.

---

## SLA (níveis)
- **P1 (Critical)** — serviço indisponível / pagamentos falhando em massa / dados corrompidos  
  *Resposta inicial:* 15 min | *Solução temporária:* 1 hora | *Root cause & post-mortem:* 72h
- **P2 (High)** — filas travadas, conversões com erro persistente (>10% jobs)  
  *Resposta:* 30 min | *Solução temporária:* 4 horas | *Post-mortem:* 7 dias
- **P3 (Normal)** — usuário não consegue baixar arquivo, pedido pendente  
  *Resposta:* 4 horas | *Solução:* 24–48h
- **P4 (Low)** — dúvidas, feature requests  
  *Resposta:* 48 horas

---

## Canais de atendimento
- Email: support@conversormpp.com (primário)  
- Formulário no site: /support (captura order_id, email, descrição, anexos)  
- Slack (interna): #ops-support (para escalonamento)  
- Status page pública: status.conversormpp.com (usar para incidentes P1/P2)

---

## Triagem (primeiros 5 passos)
1. Receber ticket → extrair: `order_id`, email, timestamp, descrição.  
2. Verificar estado do `order_id` no DB: `PENDING / PAID / PROCESSING / COMPLETED / FAILED`.  
3. Reproduzir o problema (se aplicável) — baixar logs correlacionados (app + worker + minio).  
4. Classificar prioridade (P1–P4) e aplicar SLA.  
5. Informar usuário com template de recebimento (ver abaixo).

### Template: Confirmação de recebimento (automatic)

```
Assunto: Recebemos sua solicitação — [order: {order_id}]

Olá {nome},

Recebemos sua solicitação sobre o pedido {order_id}. Estamos investigando e retornaremos em até {SLA_response_time}.
Se quiser, nos passe um print do comprovante (quando for pagamento) ou o arquivo .mpp (se diferente do original).

Atenciosamente,
Equipe Support — Conversor MPP→XML
```

---

## Etapas de resolução (por tipo de problema)

### 1) Pagamento não reconhecido (user pagou via PIX/Cartão)
- Verificar webhook logs (`/var/logs/webhooks/mercadopago.log`) e o status no painel Mercado Pago.
- Rodar script de verificação manual:
  ```bash
  python scripts/check_payment_status.py --order {order_id}
  ```

Se payment_id confirmado mas DB = PENDING:
1. Atualizar DB para PAID manualmente, em seguida: `python scripts/requeue_order.py --order {order_id}`
2. Responder ao usuário: informar que pagamento foi reconhecido e conversão foi enfileirada.

### 2) Arquivo não convertível / erro de conversão
- Baixar logs do worker (últimos 500 linhas) para order_id.
- Verificar motivo (format mismatch, timeout, crash).
- Se for bug em conversor: marcar FAILED, notificar time de engineering e oferecer reprocessamento manual após fix.
- Se arquivo inválido: solicitar novo arquivo ao usuário e orientar com formato aceitável.

### 3) Download expirado/perda do link
Gerar link presigned novo (válido 24h):
```bash
python scripts/generate_presigned.py --object results/{order_id}.xml --expires 86400
```
Entregar link ao usuário com instruções para baixar antes de expirar.

### 4) Dados sensíveis ou solicitação LGPD
- Encaminhar para DPO. Registrar pedido em privacy-requests.csv. 
- Processar exclusão conforme política (within 30 days).

---

## Escalonamento interno

**Nível 1:** Support Agent — lida com P3/P4

**Nível 2:** SRE / On-call Engineer — lida com P1/P2

**Nível 3:** CTO — incidentes críticos que exigem comunicação externa

Escalar para Slack #ops-support e chamar on-call via telefone (lista no Vault).

---

## Runbook de ações rápidas (comandos)

### Verificar health:
```bash
curl -sS https://conversormpp.com/health | jq .
```

### Logs do app:
```bash
docker-compose logs -f app | tail -n 200
```

### Reiniciar worker:
```bash
docker-compose restart worker
```

### Reprocessar order:
```bash
python scripts/requeue_order.py --order {order_id}
```

### Gerar presigned URL:
```bash
python scripts/generate_presigned.py --object results/{order_id}.xml
```

---

## Templates de resposta para clientes (prontas)

### Pagamento confirmado e conversão agendada
```
Assunto: Pagamento confirmado - Conversão em andamento [order: {order_id}]

Olá {nome},

Confirmamos o recebimento do seu pagamento! Sua conversão foi iniciada e deve ser concluída em até 15 minutos.

Você receberá o link de download por email assim que a conversão for finalizada.

Order ID: {order_id}
Status: Processando

Obrigado pela confiança!
Equipe ConversorMPP
```

### Pagamento não reconhecido — solicitar comprovante
```
Assunto: Verificação de pagamento necessária [order: {order_id}]

Olá {nome},

Não conseguimos localizar automaticamente seu pagamento no sistema. Para agilizar a resolução:

1. Envie uma foto/print do comprovante de pagamento
2. Confirme se usou o mesmo email do pedido
3. Informe se pagou via PIX ou cartão

Resolveremos em até 4 horas após o recebimento dos dados.

Order ID: {order_id}

Atenciosamente,
Equipe ConversorMPP
```

### Conversão falhou por formato inválido — solicitar novo arquivo
```
Assunto: Arquivo não pôde ser convertido [order: {order_id}]

Olá {nome},

Infelizmente seu arquivo .mpp não pôde ser processado. Possíveis causas:

✓ Arquivo corrompido ou muito antigo
✓ Versão incompatível do MS Project  
✓ Arquivo muito grande (limite: 50MB)

Solução: Tente um novo upload com um arquivo .mpp recém-salvo ou uma versão mais recente.

Seu pagamento será reembolsado automaticamente se não conseguir nova conversão em 48h.

Order ID: {order_id}

Suporte ConversorMPP
```

### Reembolso / disputa — explicar política, timeline e próximo passos
```
Assunto: Solicitação de reembolso - Processamento [order: {order_id}]

Olá {nome},

Recebemos sua solicitação de reembolso. Nossa política:

• Reembolso automático: falhas técnicas do sistema
• Timeline: 3-5 dias úteis para estorno
• Método: mesmo usado no pagamento original

Seu caso será analisado e processado em até 24h.

Order ID: {order_id}
Motivo: {motivo_reembolso}

Equipe ConversorMPP
```

---

## Pós-resolução

1. **Documentar ação** no ticket (quem, quando, o quê).
2. **Se P1/P2:** criar post-mortem com timeline e lições (usar template docs/runbooks/post-mortem-template.md).
3. **Atualizar KB** (base de conhecimento) se for issue recorrente.

---

## Métricas de Support (monitorar)

- **Tempo médio de resposta** por prioridade
- **Taxa de resolução** no primeiro contato  
- **CSAT** (Customer Satisfaction Score)
- **Escalações** para engineering (reduzir over time)

**Dashboard:** Grafana → Support Metrics → Weekly Review