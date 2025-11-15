# Playbook: Ativação de Campanhas de Marketing
**Arquivo:** `marketing/playbooks/activate-campaign.md`  
**Versão:** 1.0  
**Última atualização:** 15/11/2025

## Objetivo
Procedimento padronizado para ativação controlada de campanhas de marketing digital com monitoramento de budget, performance e ajustes automáticos.

---

## Pré-requisitos antes da ativação

### ✅ Verificações técnicas
- [ ] Site 100% operacional (`curl -sS https://conversormpp.com/health`)
- [ ] Pagamentos funcionando (testar 1 transação PIX + cartão)
- [ ] Conversões rodando sem erro (queue depth < 10)
- [ ] Monitoring ativo (Grafana + alertas configurados)
- [ ] Backup recovery testado nas últimas 24h

### ✅ Verificações de conteúdo
- [ ] Landing page otimizada e mobile-friendly
- [ ] CTAs claros e funcionais
- [ ] Pixel Facebook + Google Analytics instalados
- [ ] SEO tags e meta descriptions atualizadas
- [ ] Política de privacidade + termos de uso publicados

### ✅ Verificações financeiras
- [ ] Budget total definido: **R$ 5.000/mês**
- [ ] Contas Google Ads e Facebook configuradas
- [ ] Cartões de pagamento com limite disponível
- [ ] Dashboard de ROI funcionando

---

## Fase 1: Ativação Gradual (Semana 1)

### Dia 1-2: Teste mínimo
**Budget:** R$ 100/dia total  
**Canais:** Google Ads (R$ 60) + Facebook (R$ 40)

```bash
# Script de ativação
python marketing/scripts/activate_campaigns.py \
  --budget-total 100 \
  --google-ads-budget 60 \
  --facebook-budget 40 \
  --mode gradual \
  --duration 2
```

**Métricas para monitorar (a cada 2h):**
- CPM < R$ 25 (Google) / R$ 15 (Facebook)
- CTR > 2% (Google) / > 1.5% (Facebook)
- CPC < R$ 2.50
- Conversions > 2 por dia

**Critérios para continuar:**
- ✅ CPA (custo por aquisição) < R$ 50
- ✅ ROI > 150% (R$ 1.50 de receita para cada R$ 1 investido)
- ✅ Taxa de conversão site > 3%

### Dia 3-4: Escala moderada
**Budget:** R$ 200/dia total  
**Canais:** Google Ads (R$ 120) + Facebook (R$ 80)

```bash
python marketing/scripts/scale_campaigns.py \
  --current-budget 100 \
  --new-budget 200 \
  --scaling-factor 2.0
```

**Otimizações automáticas:**
- Pausar ads com CPC > R$ 3.00 por 6h+
- Aumentar budget em campanhas com CPA < R$ 30
- A/B test novas variações de copy (2-3 por dia)

### Dia 5-7: Consolidação
**Budget:** R$ 300/dia total (se métricas OK)

**Canais:** Google Ads (R$ 180) + Facebook (R$ 100) + LinkedIn (R$ 20)

```bash
python marketing/scripts/add_channel.py \
  --channel linkedin \
  --budget 20 \
  --target "B2B project managers"
```

---

## Fase 2: Escala Completa (Semana 2-4)

### Target final: R$ 5.000/mês = R$ 167/dia

**Distribuição de budget:**
- Google Ads Search: R$ 100/dia (60%)
- Facebook + Instagram: R$ 50/dia (30%)  
- LinkedIn (B2B): R$ 12/dia (7%)
- Remarketing: R$ 5/dia (3%)

### Configuração de campanhas

#### Google Ads
```yaml
campaigns:
  - name: "Conversor MPP - Exatas"
    keywords: ["converter mpp para xml", "microsoft project xml", "conversor project"]
    budget_daily: 60
    bid_strategy: "Target CPA"
    target_cpa: 35.00
  
  - name: "Conversor MPP - Amplo"  
    keywords: ["converter project", "mpp xml", "exportar microsoft project"]
    budget_daily: 40
    bid_strategy: "Maximize conversions"
```

#### Facebook Ads
```yaml
campaigns:
  - name: "Conversor MPP - Interesses"
    audience: "Project management + Microsoft Project users"
    budget_daily: 30
    objective: "conversions"
    placement: ["facebook", "instagram"]
  
  - name: "Conversor MPP - Lookalike"
    audience: "Lookalike 1% do pixel de conversões"  
    budget_daily: 20
    objective: "conversions"
```

#### LinkedIn Ads
```yaml
campaigns:
  - name: "Conversor MPP - B2B"
    audience: "Project managers, Construction, IT"
    budget_daily: 12
    objective: "website_conversions"
    ad_format: "single_image"
```

---

## Monitoramento em tempo real

### Dashboard principal (Grafana)
**URL:** `https://monitor.conversormpp.com/d/marketing`

**Alertas críticos:**
- CPA > R$ 75 → pausar campanhas automaticamente
- Budget burn rate > 120% → reduzir bids em 20%
- Conversions < 2 em 6 horas → investigar landing page

### Scripts de monitoramento automático
```bash
# Rodar a cada hora
*/15 * * * * python marketing/scripts/monitor_performance.py --alert-threshold-cpa 75

# Relatório diário (8h da manhã)
0 8 * * * python marketing/scripts/daily_report.py --send-email --recipients "cmo@conversormpp.com"

# Auto-otimização (a cada 2h)  
0 */2 * * * python marketing/scripts/auto_optimize.py --max-budget-increase 10
```

---

## Cenários e troubleshooting

### 🔴 CPA muito alto (> R$ 75)
**Ações imediatas:**
1. Pausar ads com pior performance (bottom 20%)
2. Reduzir bids em 30% em todas as campanhas
3. Ativar audiences mais restritivas  
4. Aumentar threshold de qualidade (Quality Score > 6/10)

```bash
python marketing/scripts/emergency_optimize.py --max-cpa 75 --action pause-worst
```

### 🟡 Volume baixo (< 5 conversions/dia)
**Ações:**
1. Aumentar budget nas campanhas top performers (+20%)
2. Expandir match types (broad match modifier)
3. Adicionar novas keywords relacionadas
4. Testar novos creativos

### 🟢 Performance excelente (CPA < R$ 30)
**Ações:**
1. Escalar budget gradualmente (+15% por dia)
2. Duplicar campanhas top performers com novas audiences
3. Investir em remarketing para aumentar LTV
4. Testar novos canais (YouTube, TikTok B2B)

---

## Relatórios e análises

### Relatório semanal (automático - segunda-feira 9h)
**Conteúdo:**
- Budget spend vs. target
- CPA, CTR, ROAS por canal
- Volume de conversões e tendência
- Recomendações de otimização
- Projeção budget próxima semana

**Template:**
```
RELATÓRIO SEMANAL - Marketing Campaigns
Período: {start_date} a {end_date}

📊 PERFORMANCE GERAL
Budget gasto: R$ {total_spent} / R$ {budget_planned} ({spend_percentage}%)
Conversões: {total_conversions} (meta: {target_conversions})
CPA médio: R$ {average_cpa} (meta: < R$ 50)
ROAS: {roas} (meta: > 200%)

🎯 POR CANAL:
Google Ads: {google_performance}
Facebook: {facebook_performance}  
LinkedIn: {linkedin_performance}

🔧 AÇÕES PARA PRÓXIMA SEMANA:
{recommendations}
```

### Relatório mensal (detalhado)
- Análise de cohort (LTV dos usuários)
- Attribution modeling (qual canal trouxe mais value)
- Competitive analysis (ferramentas: SEMrush, SimilarWeb)
- Sugestões estratégicas para próximo mês

---

## Critérios para pausar/ajustar campanhas

### ⏸️ Pausar imediatamente se:
- CPA > R$ 100 por 3 conversões consecutivas
- CTR < 0.5% por 48h  
- Quality Score < 4/10 em 70%+ das keywords
- Budget burn rate > 200% da meta diária

### 📉 Reduzir budget se:
- CPA entre R$ 75-100
- ROAS < 150%
- Volume alto mas baixa qualidade (baixo LTV)

### 📈 Aumentar budget se:
- CPA < R$ 30 consistentemente
- ROAS > 300%
- Share of voice < 50% nas keywords principais
- Queue de conversão crescendo (demanda reprimida)

---

## Contatos e escalonamento

**CMO:** cmo@conversormpp.com  
**Performance Specialist:** ads@conversormpp.com  
**Emergency Slack:** #marketing-ops  
**Google Ads Rep:** (quando budget > R$ 10k/mês)  
**Facebook Account Manager:** (quando budget > R$ 8k/mês)

**Em caso de budget burn > 300% da meta:**
1. Pausar todas as campanhas imediatamente
2. Notificar CFO + CMO via Slack + email
3. Aguardar análise antes de reativar