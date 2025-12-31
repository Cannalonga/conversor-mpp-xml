#!/bin/bash
# Diagnóstico Completo - CannaConvert

echo "🔍 DIAGNÓSTICO COMPLETO - CANNACONVERT"
echo "=================================================="
echo ""

echo "1️⃣ Status do Serviço Node.js"
systemctl status cannaconvert.service --no-pager || echo "❌ Serviço não encontrado"
echo ""

echo "2️⃣ Verificar se Node.js está listening na porta 3000"
ss -tlnp | grep 3000 || echo "❌ Port 3000 não está listening"
echo ""

echo "3️⃣ Status do NGINX"
systemctl status nginx --no-pager || echo "❌ NGINX não está rodando"
echo ""

echo "4️⃣ Verificar porta 80 do NGINX"
ss -tlnp | grep 80 || echo "❌ NGINX não está na porta 80"
echo ""

echo "5️⃣ Teste de conectividade local"
echo "GET / HTTP/1.1" | nc -w 1 localhost 80 | head -5 || echo "❌ Não conseguiu conectar"
echo ""

echo "6️⃣ Últimos 20 logs do serviço"
journalctl -u cannaconvert.service -n 20 --no-pager
echo ""

echo "7️⃣ Últimas 20 linhas do erro NGINX"
tail -20 /var/log/nginx/error.log || echo "❌ Arquivo de log não encontrado"
echo ""

echo "8️⃣ Configuração NGINX"
cat /etc/nginx/sites-available/default 2>/dev/null | grep -A 20 "server {" || echo "❌ Arquivo não encontrado"
echo ""

echo "9️⃣ Processos Node.js ativos"
ps aux | grep node | grep -v grep || echo "❌ Nenhum processo Node.js ativo"
echo ""

echo "🔟 Teste DNS local"
nslookup cannaconvert.store localhost || echo "❌ Resolver local não funcionando"
echo ""

echo "📊 Memória disponível"
free -h
echo ""

echo "⏱️ Uptime"
uptime
echo ""

echo "=================================================="
echo "✅ Diagnóstico concluído"
