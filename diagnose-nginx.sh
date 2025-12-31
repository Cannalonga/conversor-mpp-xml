#!/bin/bash

echo "🔍 DIAGNÓSTICO DETALHADO - NGINX CONFIGURATION"
echo "=============================================="
echo ""

echo "1️⃣ Verificando configuração NGINX (/etc/nginx/sites-available/default):"
echo "---"
cat /etc/nginx/sites-available/default 2>/dev/null || cat /etc/nginx/sites-enabled/default 2>/dev/null || echo "Arquivo não encontrado"
echo ""
echo "---"
echo ""

echo "2️⃣ Testando requisição com HOST header IP:"
curl -v -H "Host: 213.199.35.118" http://localhost 2>&1 | grep -E "(< HTTP|Location|Server)" | head -5
echo ""

echo "3️⃣ Testando requisição com HOST header domínio:"
curl -v -H "Host: cannaconvert.store" http://localhost 2>&1 | grep -E "(< HTTP|Location|Server)" | head -5
echo ""

echo "4️⃣ Status NGINX:"
systemctl status nginx --no-pager | head -3
echo ""

echo "5️⃣ Últimas 10 linhas do NGINX error.log:"
tail -10 /var/log/nginx/error.log
echo ""

echo "6️⃣ Verificando se há redirect:"
grep -r "redirect\|return" /etc/nginx/sites-available/ 2>/dev/null || echo "Nenhum redirect encontrado"
echo ""

echo "7️⃣ Verificar server_name:"
grep "server_name" /etc/nginx/sites-available/default /etc/nginx/sites-available/* 2>/dev/null | head -5
echo ""

echo "8️⃣ Listar todos os vhosts:"
ls -la /etc/nginx/sites-available/
