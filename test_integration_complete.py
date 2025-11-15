#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Teste Completo de Integração
Testa upload de PDF real para a API
"""

import requests
import json
import os
import time

def test_pdf_conversion():
    """Testa a conversão de PDF usando requests"""
    
    API_BASE = 'http://localhost:8000'
    pdf_file = 'test_sample.pdf'
    
    print("🧪 TESTE COMPLETO DE INTEGRAÇÃO")
    print("=" * 50)
    
    # 1. Verificar se o arquivo existe
    if not os.path.exists(pdf_file):
        print(f"❌ Arquivo {pdf_file} não encontrado!")
        return False
    
    file_size = os.path.getsize(pdf_file)
    print(f"📁 Arquivo: {pdf_file}")
    print(f"📊 Tamanho: {file_size} bytes ({file_size/1024:.1f} KB)")
    
    # 2. Testar conectividade da API
    print("\n🔌 Testando conectividade...")
    try:
        response = requests.get(f"{API_BASE}/health", timeout=5)
        health_data = response.json()
        print(f"✅ API Status: {health_data.get('status', 'unknown')}")
    except Exception as e:
        print(f"❌ API não acessível: {e}")
        return False
    
    # 3. Fazer upload do PDF
    print("\n📤 Enviando PDF para conversão...")
    try:
        with open(pdf_file, 'rb') as f:
            files = {'file': (pdf_file, f, 'application/pdf')}
            
            print(f"🚀 POST {API_BASE}/api/convert/pdf/text")
            start_time = time.time()
            
            response = requests.post(
                f"{API_BASE}/api/convert/pdf/text",
                files=files,
                timeout=30
            )
            
            end_time = time.time()
            duration = end_time - start_time
            
            print(f"⏱️ Tempo de resposta: {duration:.2f} segundos")
            print(f"📊 Status Code: {response.status_code}")
            print(f"📋 Headers: {dict(response.headers)}")
            
    except Exception as e:
        print(f"❌ Erro no upload: {e}")
        return False
    
    # 4. Analisar resposta
    print(f"\n📨 RESPOSTA DA API")
    print("-" * 30)
    
    try:
        if response.status_code == 200:
            # Sucesso
            data = response.json()
            print("✅ CONVERSÃO SUCESSO!")
            print(f"📄 Resposta: {json.dumps(data, indent=2, ensure_ascii=False)}")
            return True
            
        else:
            # Erro
            try:
                error_data = response.json()
                print(f"❌ ERRO {response.status_code}")
                print(f"📄 Detalhes: {json.dumps(error_data, indent=2, ensure_ascii=False)}")
            except:
                print(f"❌ ERRO {response.status_code}")
                print(f"📄 Resposta raw: {response.text}")
            
            return False
            
    except Exception as e:
        print(f"❌ Erro ao processar resposta: {e}")
        print(f"📄 Resposta raw: {response.text}")
        return False

def test_file_validation():
    """Testa validação de arquivos inválidos"""
    
    API_BASE = 'http://localhost:8000'
    
    print("\n🛡️ TESTE DE VALIDAÇÃO")
    print("-" * 30)
    
    # Criar arquivo texto fake
    fake_file = 'fake.pdf'
    with open(fake_file, 'w') as f:
        f.write("Este não é um PDF real!")
    
    try:
        with open(fake_file, 'rb') as f:
            files = {'file': (fake_file, f, 'application/pdf')}
            
            response = requests.post(
                f"{API_BASE}/api/convert/pdf/text",
                files=files,
                timeout=10
            )
            
            print(f"📊 Status: {response.status_code}")
            
            if response.status_code == 422 or response.status_code == 400:
                data = response.json()
                print(f"✅ Validação funcionando: {data.get('detail', 'Erro de validação')}")
            else:
                print(f"⚠️ Resposta inesperada: {response.text}")
                
    except Exception as e:
        print(f"❌ Erro no teste: {e}")
    finally:
        # Limpar arquivo fake
        if os.path.exists(fake_file):
            os.remove(fake_file)

if __name__ == "__main__":
    print("🎯 INICIANDO TESTES DE INTEGRAÇÃO")
    print("🕐 " + time.strftime('%Y-%m-%d %H:%M:%S'))
    print()
    
    # Teste principal
    success = test_pdf_conversion()
    
    # Teste de validação
    test_file_validation()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 INTEGRAÇÃO FUNCIONANDO!")
        print("✅ PDF foi processado pela API")
        print("🚀 Frontend pode ser conectado")
    else:
        print("❌ PROBLEMAS ENCONTRADOS")
        print("🔧 Verifique logs da API")
        print("🐛 Debug necessário")
    
    print("\n📖 PRÓXIMOS PASSOS:")
    print("1. 🌐 Abrir test_frontend_integration.html")
    print("2. 📁 Fazer upload do test_sample.pdf")
    print("3. 🔍 Verificar logs em tempo real")
    print("4. 🎯 Validar conversão completa")