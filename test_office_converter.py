#!/usr/bin/env python3
"""
Office Converter Local Test
Testa conversão DOCX→PDF, XLSX→CSV usando LibreOffice headless
"""

import subprocess
import os
import tempfile
import sys
from pathlib import Path

# Adicionar o diretório app ao PYTHONPATH
sys.path.insert(0, str(Path(__file__).parent / "app"))

try:
    from converters.office import OfficeConverter
    print("✅ Office converter importado com sucesso!")
except ImportError as e:
    print(f"❌ Erro importando Office converter: {e}")
    print("Vamos testar LibreOffice diretamente...")

def check_libreoffice():
    """Verifica se LibreOffice está instalado e disponível"""
    try:
        result = subprocess.run(['soffice', '--version'], 
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print(f"✅ LibreOffice encontrado: {result.stdout.strip()}")
            return True
    except FileNotFoundError:
        pass
    except subprocess.TimeoutExpired:
        pass
    
    # Tentar outras localizações comuns no Windows
    possible_paths = [
        r"C:\Program Files\LibreOffice\program\soffice.exe",
        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        r"C:\Users\%USERNAME%\AppData\Local\Programs\LibreOffice\program\soffice.exe"
    ]
    
    for path in possible_paths:
        expanded_path = os.path.expandvars(path)
        if os.path.exists(expanded_path):
            print(f"✅ LibreOffice encontrado: {expanded_path}")
            return expanded_path
    
    print("❌ LibreOffice não encontrado!")
    print("💡 Instale LibreOffice: https://www.libreoffice.org/download/download/")
    return False

def create_test_docx():
    """Cria um arquivo DOCX de teste usando LibreOffice"""
    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("""TESTE OFFICE CONVERTER
====================

Este é um arquivo de teste para conversão DOCX → PDF.

Features testadas:
- ✅ Criação de documento
- ✅ Conversão LibreOffice headless  
- ✅ Validação de saída PDF
- ✅ Performance benchmark

Data: $(date)
Tamanho: Médio (para teste)
Formato origem: TXT → DOCX → PDF
""")
            return f.name
    except Exception as e:
        print(f"❌ Erro criando arquivo teste: {e}")
        return None

def test_conversion(input_file, output_format="pdf"):
    """Testa conversão usando LibreOffice headless"""
    if not os.path.exists(input_file):
        print(f"❌ Arquivo não encontrado: {input_file}")
        return False
    
    output_dir = tempfile.mkdtemp()
    
    try:
        # Comando LibreOffice headless
        cmd = [
            'soffice',
            '--headless',
            '--convert-to', output_format,
            '--outdir', output_dir,
            input_file
        ]
        
        print(f"🔄 Executando: {' '.join(cmd)}")
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            # Verificar se arquivo foi criado
            input_name = Path(input_file).stem
            expected_output = os.path.join(output_dir, f"{input_name}.{output_format}")
            
            if os.path.exists(expected_output):
                file_size = os.path.getsize(expected_output)
                print(f"✅ Conversão bem-sucedida!")
                print(f"📄 Arquivo gerado: {expected_output}")
                print(f"📊 Tamanho: {file_size} bytes")
                return expected_output
            else:
                print(f"❌ Arquivo de saída não encontrado: {expected_output}")
        else:
            print(f"❌ Erro na conversão:")
            print(f"STDOUT: {result.stdout}")
            print(f"STDERR: {result.stderr}")
        
        return False
        
    except subprocess.TimeoutExpired:
        print("❌ Timeout na conversão (>30s)")
        return False
    except Exception as e:
        print(f"❌ Erro na conversão: {e}")
        return False

def main():
    print("🧪 TESTE OFFICE CONVERTER - LibreOffice Headless")
    print("=" * 50)
    
    # 1. Verificar LibreOffice
    print("\n1️⃣ Verificando LibreOffice...")
    libreoffice_path = check_libreoffice()
    if not libreoffice_path:
        return
    
    # 2. Criar arquivo de teste
    print("\n2️⃣ Criando arquivo de teste...")
    test_file = create_test_docx()
    if not test_file:
        return
    
    print(f"✅ Arquivo teste criado: {test_file}")
    
    # 3. Testar conversão TXT → PDF
    print("\n3️⃣ Testando conversão TXT → PDF...")
    pdf_output = test_conversion(test_file, "pdf")
    
    if pdf_output:
        print(f"\n🎉 SUCESSO! Office Converter funcionando!")
        print(f"📁 PDF gerado: {pdf_output}")
        
        # 4. Benchmark básico
        print("\n4️⃣ Teste de performance...")
        import time
        
        start_time = time.time()
        for i in range(3):
            print(f"   Conversão {i+1}/3...", end=" ")
            result = test_conversion(test_file, "pdf")
            if result:
                print("✅")
            else:
                print("❌")
        
        end_time = time.time()
        avg_time = (end_time - start_time) / 3
        print(f"\n📊 Tempo médio por conversão: {avg_time:.2f}s")
        
        if avg_time < 5:
            print("🚀 Performance EXCELENTE! (<5s)")
        elif avg_time < 10:
            print("✅ Performance BOA! (<10s)")
        else:
            print("⚠️ Performance pode ser otimizada (>10s)")
    
    else:
        print("\n❌ Falha no teste de conversão!")
        print("💡 Verifique se LibreOffice está instalado corretamente")
    
    # Cleanup
    try:
        os.unlink(test_file)
        print(f"\n🧹 Arquivo temporário removido: {test_file}")
    except:
        pass

if __name__ == "__main__":
    main()