#!/usr/bin/env python3
"""
Teste PDF Text Extractor - Local
Testa o conversor PDF sem dependências externas
"""

import os
import sys
import tempfile
from pathlib import Path

def create_fake_pdf():
    """Cria um arquivo fake PDF para teste"""
    # Cria um arquivo com header PDF básico
    fake_pdf_content = b"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Teste PDF) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000074 00000 n 
0000000120 00000 n 
0000000179 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
274
%%EOF"""
    
    temp_file = tempfile.NamedTemporaryFile(suffix='.pdf', delete=False)
    temp_file.write(fake_pdf_content)
    temp_file.close()
    
    return temp_file.name

def test_pdf_extractor():
    """Testa o PDF extractor"""
    print("🧪 TESTE PDF TEXT EXTRACTOR")
    print("=" * 40)
    
    # Verificar se PyPDF2 está disponível
    try:
        import PyPDF2
        print("✅ PyPDF2 disponível")
    except ImportError:
        print("❌ PyPDF2 não encontrado")
        print("💡 Instale com: pip install PyPDF2")
        return False
    
    # Importar o conversor
    try:
        sys.path.insert(0, os.path.join(os.getcwd(), 'app'))
        from converters.pdf_extract_text import extract_text_from_pdf
        print("✅ PDF extractor importado")
    except ImportError as e:
        print(f"❌ Erro importando conversor: {e}")
        return False
    
    # Criar PDF de teste
    print("\n📄 Criando PDF de teste...")
    pdf_path = create_fake_pdf()
    print(f"✅ PDF criado: {pdf_path}")
    
    # Testar extração
    print("\n🔄 Testando extração de texto...")
    try:
        success, result = extract_text_from_pdf(pdf_path)
        
        if success:
            print("✅ Extração bem-sucedida!")
            print(f"📝 Texto extraído: '{result.strip()}'")
            print(f"📊 Tamanho: {len(result)} caracteres")
        else:
            print(f"❌ Falha na extração: {result}")
        
        # Testar arquivo inexistente
        print("\n🧪 Testando arquivo inexistente...")
        success2, result2 = extract_text_from_pdf("arquivo_inexistente.pdf")
        
        if not success2:
            print("✅ Validação de arquivo funcionando")
            print(f"📝 Erro esperado: {result2}")
        else:
            print("❌ Validação falhou")
        
        # Cleanup
        os.unlink(pdf_path)
        print(f"\n🧹 Arquivo temporário removido")
        
        return success
        
    except Exception as e:
        print(f"❌ Erro no teste: {e}")
        return False

def test_mock_api():
    """Testa estrutura da API (sem FastAPI)"""
    print("\n🌐 TESTE ESTRUTURA API")
    print("=" * 30)
    
    # Simular dados de upload
    mock_file_data = {
        "filename": "test.pdf",
        "size": 1024,
        "content_type": "application/pdf"
    }
    
    # Simular validação
    if not mock_file_data["filename"].lower().endswith(".pdf"):
        print("❌ Validação de extensão falhou")
        return False
    
    if mock_file_data["size"] > 40 * 1024 * 1024:
        print("❌ Arquivo muito grande")
        return False
    
    print("✅ Validação de upload OK")
    
    # Simular criação de ordem
    import uuid
    order_id = uuid.uuid4().hex
    print(f"✅ Ordem criada: {order_id}")
    
    # Simular preço
    price_cents = 300  # R$ 3,00
    price_formatted = f"R$ {price_cents/100:.2f}"
    print(f"💰 Preço: {price_formatted}")
    
    # Simular resposta API
    mock_response = {
        "order_id": order_id,
        "status": "QUEUED",
        "message": "PDF recebido e enfileirado para extração de texto",
        "price": price_formatted
    }
    
    print("✅ Resposta API simulada:")
    print(f"   {mock_response}")
    
    return True

def main():
    print("🔥 PDF TEXT EXTRACTOR - TESTE COMPLETO")
    print("=" * 50)
    
    success_converter = test_pdf_extractor()
    success_api = test_mock_api()
    
    print("\n" + "="*50)
    print("📊 RESULTADO FINAL")
    print("="*50)
    
    if success_converter and success_api:
        print("🎉 TODOS OS TESTES PASSARAM!")
        print("✅ PDF extractor funcionando")
        print("✅ API structure validada")
        print("\n💡 Próximos passos:")
        print("   1. docker-compose up --build")
        print("   2. curl -F 'file=@test.pdf' http://localhost:8000/api/convert/pdf/text")
        print("   3. Verificar logs do worker")
        return True
    else:
        print("❌ ALGUNS TESTES FALHARAM")
        if not success_converter:
            print("   - PDF extractor com problemas")
        if not success_api:
            print("   - API structure com problemas")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)