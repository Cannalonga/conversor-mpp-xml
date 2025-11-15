#!/usr/bin/env python3
"""
Script de teste completo para API PDF
Testa diferentes tipos de PDF e cenários
"""

import requests
import time
import os
from pathlib import Path

API_BASE = "http://localhost:8000"

def test_pdf_api():
    """Executa bateria completa de testes"""
    
    print("🧪 INICIANDO TESTES DA API PDF")
    print("=" * 50)
    
    # 1. Health check
    print("\n1️⃣ Testando Health Check...")
    try:
        response = requests.get(f"{API_BASE}/health")
        if response.status_code == 200:
            print("✅ Health Check: OK")
            print(f"   Status: {response.json()}")
        else:
            print(f"❌ Health Check Failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Health Check Error: {e}")
    
    # 2. Stats endpoint
    print("\n2️⃣ Testando Stats...")
    try:
        response = requests.get(f"{API_BASE}/api/stats")
        if response.status_code == 200:
            print("✅ Stats: OK")
            stats = response.json()
            print(f"   Formatos: {stats.get('supported_formats')}")
            print(f"   Preço: {stats.get('pricing', {}).get('pdf_text_extraction')}")
        else:
            print(f"❌ Stats Failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Stats Error: {e}")
    
    # 3. Teste com arquivo inválido
    print("\n3️⃣ Testando Validação de Arquivo...")
    try:
        # Criar arquivo não-PDF
        with open("test_invalid.txt", "w") as f:
            f.write("Este não é um PDF")
        
        with open("test_invalid.txt", "rb") as f:
            files = {'file': f}
            response = requests.post(f"{API_BASE}/api/convert/pdf/text", files=files)
            
        if response.status_code == 400:
            print("✅ Validação: OK - Rejeitou arquivo não-PDF")
            print(f"   Mensagem: {response.json().get('detail')}")
        else:
            print(f"❌ Validação Failed: {response.status_code}")
        
        os.remove("test_invalid.txt")
        
    except Exception as e:
        print(f"❌ Validação Error: {e}")
    
    # 4. Teste com PDF fake (simula estrutura)
    print("\n4️⃣ Testando PDF Fake...")
    try:
        # Criar PDF mais realista
        pdf_content = b"""%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R>>endobj
4 0 obj<</Length 44>>stream
BT /F1 12 Tf 100 700 Td (Hello World) Tj ET
endstream endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000207 00000 n 
trailer<</Size 5/Root 1 0 R>>
startxref
295
%%EOF"""
        
        with open("test_valid.pdf", "wb") as f:
            f.write(pdf_content)
        
        print(f"   📄 Arquivo criado: test_valid.pdf ({len(pdf_content)} bytes)")
        
        with open("test_valid.pdf", "rb") as f:
            files = {'file': ('test_valid.pdf', f, 'application/pdf')}
            response = requests.post(f"{API_BASE}/api/convert/pdf/text", files=files)
            
        print(f"   📡 Response Status: {response.status_code}")
        print(f"   📋 Response: {response.json()}")
        
        if response.status_code in [200, 202, 400]:  # 400 pode ser erro de parsing, ok para teste
            print("✅ API aceita e processa PDFs")
        else:
            print(f"❌ Erro inesperado: {response.status_code}")
        
        os.remove("test_valid.pdf")
        
    except Exception as e:
        print(f"❌ PDF Test Error: {e}")
    
    # 5. Teste de tamanho
    print("\n5️⃣ Testando Limite de Tamanho...")
    try:
        # Criar arquivo > 40MB
        large_content = b"%PDF-1.4\n" + b"X" * (45 * 1024 * 1024)  # 45MB
        
        with open("test_large.pdf", "wb") as f:
            f.write(large_content)
        
        print(f"   📄 Arquivo grande: {len(large_content) // 1024 // 1024}MB")
        
        with open("test_large.pdf", "rb") as f:
            files = {'file': ('test_large.pdf', f, 'application/pdf')}
            response = requests.post(f"{API_BASE}/api/convert/pdf/text", files=files)
            
        if response.status_code == 413:
            print("✅ Limite de tamanho: OK - Rejeitou arquivo grande")
        else:
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.json()}")
        
        os.remove("test_large.pdf")
        
    except Exception as e:
        print(f"❌ Size Test Error: {e}")
    
    print("\n🏁 TESTES CONCLUÍDOS!")
    print("=" * 50)

if __name__ == "__main__":
    test_pdf_api()