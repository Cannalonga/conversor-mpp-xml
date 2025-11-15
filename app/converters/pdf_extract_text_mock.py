"""
PDF Text Extractor - Mock Version
Funciona sem PyPDF2 para demonstração
"""

from pathlib import Path
import logging
from typing import Tuple

log = logging.getLogger("converters.pdf.text")

def extract_text_from_pdf(input_path: str) -> Tuple[bool, str]:
    """
    Extrai texto de um PDF e retorna como string.
    VERSÃO MOCK - para demonstração sem PyPDF2
    
    Entrada:
        input_path: caminho completo do arquivo PDF
    Saída:
        (success: bool, text_or_error: str)
    """

    input_path = Path(input_path)

    if not input_path.exists():
        return False, f"Arquivo não encontrado: {input_path}"

    try:
        # Verificar se é realmente um PDF (verificação básica)
        if not str(input_path).lower().endswith('.pdf'):
            return False, "Arquivo não é um PDF válido"
        
        # Verificar tamanho do arquivo
        file_size = input_path.stat().st_size
        if file_size == 0:
            return False, "Arquivo PDF está vazio"
        
        if file_size > 50 * 1024 * 1024:  # 50MB
            return False, "Arquivo PDF muito grande (> 50MB)"
        
        # MOCK: Simular extração de texto baseada no nome/tamanho do arquivo
        mock_text = f"""TEXTO EXTRAÍDO (SIMULADO)
        
Arquivo: {input_path.name}
Tamanho: {file_size} bytes
Data: {input_path.stat().st_mtime}

Este é um texto simulado extraído do PDF.
O conversor real utilizaria PyPDF2 para fazer a extração verdadeira.

Conteúdo de exemplo:
- Título do documento
- Parágrafo 1 com informações importantes
- Parágrafo 2 com dados relevantes  
- Lista de itens
- Conclusão

NOTA: Esta é uma simulação para demonstração.
Para extração real de texto, instale PyPDF2:
pip install PyPDF2==3.0.1

Status: Mock extraction successful
Método: Simulated PDF text extraction
Biblioteca: Mock (substitui PyPDF2)
"""
        
        log.info(f"[PDF→Texto MOCK] Simulação de extração para {input_path.name}")
        return True, mock_text.strip()

    except Exception as e:
        log.exception("[PDF→Texto MOCK] Erro inesperado na simulação")
        return False, f"Erro ao simular leitura PDF: {str(e)}"

def extract_text_from_pdf_real(input_path: str) -> Tuple[bool, str]:
    """
    Versão real com PyPDF2 (para quando estiver disponível)
    """
    try:
        import PyPDF2
        
        input_path = Path(input_path)
        
        if not input_path.exists():
            return False, f"Arquivo não encontrado: {input_path}"

        reader = PyPDF2.PdfReader(str(input_path))
        text_chunks = []

        for page_num, page in enumerate(reader.pages):
            try:
                text = page.extract_text() or ""
                text_chunks.append(text)
            except Exception as e:
                log.warning(f"Falha ao extrair texto da página {page_num}: {e}")

        full_text = "\n".join(text_chunks)

        if not full_text.strip():
            return False, "Nenhum texto extraído — possivelmente PDF escaneado (use OCR)."

        return True, full_text
        
    except ImportError:
        log.warning("PyPDF2 não disponível, usando versão mock")
        return extract_text_from_pdf(input_path)
    except Exception as e:
        log.exception("[PDF→Texto] Erro inesperado na extração real")
        return False, f"Erro ao ler PDF: {str(e)}"

def check_pdf_dependencies() -> dict:
    """Verifica dependências do PDF converter"""
    status = {
        "pypdf2_available": False,
        "version": None,
        "mode": "mock",
        "capabilities": []
    }
    
    try:
        import PyPDF2
        status["pypdf2_available"] = True
        status["version"] = PyPDF2.__version__
        status["mode"] = "real"
        status["capabilities"] = [
            "PDF text extraction",
            "Multi-page support", 
            "Metadata reading",
            "Error handling"
        ]
    except ImportError:
        status["capabilities"] = [
            "Mock PDF simulation",
            "File validation",
            "Basic error handling",
            "Demo functionality"
        ]
    
    return status

if __name__ == "__main__":
    # Teste rápido
    print("🧪 PDF Text Extractor - Test")
    
    # Verificar dependências
    deps = check_pdf_dependencies()
    print(f"PyPDF2 disponível: {deps['pypdf2_available']}")
    print(f"Modo: {deps['mode']}")
    print(f"Capabilities: {', '.join(deps['capabilities'])}")
    
    # Teste com arquivo fake
    import tempfile
    
    temp_file = tempfile.NamedTemporaryFile(suffix='.pdf', delete=False)
    temp_file.write(b"fake pdf content")
    temp_file.close()
    
    success, result = extract_text_from_pdf(temp_file.name)
    
    print(f"\nTeste resultado: {success}")
    if success:
        print(f"Texto extraído: {len(result)} caracteres")
        print(f"Preview: {result[:100]}...")
    else:
        print(f"Erro: {result}")
    
    # Cleanup
    import os
    os.unlink(temp_file.name)