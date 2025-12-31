#!/bin/bash
# Script para corrigir acesso ao domínio cannaconvert.store

set -e

echo "🔧 SCRIPT DE CORREÇÃO - CANNACONVERT.STORE"
echo "=========================================="
echo ""

# 1. Parar e reiniciar o serviço
echo "1️⃣ Reiniciando serviço Node.js..."
systemctl restart cannaconvert.service
sleep 2

# 2. Recarregar NGINX
echo "2️⃣ Testando configuração NGINX..."
nginx -t
sleep 1

echo "3️⃣ Recarregando NGINX..."
systemctl reload nginx
sleep 2

# 4. Verificar status
echo ""
echo "4️⃣ Status dos serviços:"
echo "--- Node.js ---"
systemctl is-active cannaconvert.service && echo "✅ Ativo" || echo "❌ Inativo"

echo "--- NGINX ---"
systemctl is-active nginx && echo "✅ Ativo" || echo "❌ Inativo"

# 5. Teste de conectividade
echo ""
echo "5️⃣ Testes de conectividade:"

echo "  📡 HTTP local (localhost:80)..."
curl -s -I http://localhost 2>/dev/null | head -1 && echo "    ✅ Funcionando" || echo "    ⚠️ Problema"

echo "  📡 Node.js direto (localhost:3000)..."
curl -s -I http://localhost:3000 2>/dev/null | head -1 && echo "    ✅ Funcionando" || echo "    ⚠️ Problema"

echo "  📡 Domínio (cannaconvert.store)..."
curl -s -I http://cannaconvert.store 2>/dev/null | head -1 && echo "    ✅ Funcionando" || echo "    ⚠️ Problema"

# 6. Verificar portas
echo ""
echo "6️⃣ Portas em uso:"
ss -tlnp 2>/dev/null | grep -E ":(80|3000|443)" || echo "⚠️ Portas não encontradas"

# 7. DNS
echo ""
echo "7️⃣ DNS:"
nslookup cannaconvert.store 8.8.8.8 2>&1 | grep -A 1 "Name:" || echo "⚠️ DNS não resolvendo"

# 8. Limpar cache
echo ""
echo "8️⃣ Limpando cache local..."
systemctl restart systemd-resolved 2>/dev/null || true
systemctl restart nscd 2>/dev/null || true

echo ""
echo "=========================================="
echo "✅ Correção concluída!"
echo ""
echo "Próximas ações:"
echo "  1. Espere 2-5 minutos para propagação de DNS"
echo "  2. Abra seu navegador e teste: http://cannaconvert.store"
echo "  3. Se ainda não funcionar, limpe cache (Ctrl+Shift+Delete)"
echo "  4. Tente modo incógnito (Ctrl+Shift+N)"
echo "  5. Se nada funcionar, execute: bash diagnose.sh"
