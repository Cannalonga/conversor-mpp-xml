#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Gerador de PDF de Teste
Cria um documento PDF simples para testar a API de conversão
"""

import sys
import datetime

def create_simple_pdf():
    """Cria um PDF de teste usando reportlab"""
    try:
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import letter
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.platypus import Paragraph
    except ImportError:
        print("❌ ReportLab não instalado. Instalando...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "reportlab"])
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import letter

    filename = 'test_pdf_sample.pdf'
    
    # Criar canvas
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter
    
    # Título
    c.setFont('Helvetica-Bold', 18)
    c.drawString(50, height - 80, 'DOCUMENTO DE TESTE - CONVERSÃO PDF')
    
    # Linha divisória
    c.line(50, height - 100, width - 50, height - 100)
    
    # Conteúdo principal
    c.setFont('Helvetica', 12)
    
    text_sections = [
        {
            'title': '1. INFORMAÇÕES DO DOCUMENTO',
            'content': [
                f'Data de criação: {datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S")}',
                'Propósito: Teste de conversão PDF para texto',
                'Encoding: UTF-8',
                'Tamanho esperado: ~2KB'
            ]
        },
        {
            'title': '2. TESTE DE CARACTERES',
            'content': [
                'Acentos: ação, educação, informação, coração',
                'Cedilha: ç, Ç, caça, açúcar, almoço',
                'Til: ão, não, são, então, criação',
                'Números: 0123456789',
                'Símbolos: !@#$%^&*()_+-=[]{}|;:,.<>?'
            ]
        },
        {
            'title': '3. TEXTO LONGO PARA TESTE',
            'content': [
                'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
                'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
                'Ut enim ad minim veniam, quis nostrud exercitation ullamco.',
                'Duis aute irure dolor in reprehenderit in voluptate velit esse.',
                'Excepteur sint occaecat cupidatat non proident, sunt in culpa.'
            ]
        },
        {
            'title': '4. LISTA DE VERIFICAÇÃO',
            'content': [
                '✓ Texto básico extraído corretamente',
                '✓ Acentos preservados',
                '✓ Números legíveis',
                '✓ Símbolos mantidos',
                '✓ Quebras de linha respeitadas'
            ]
        }
    ]
    
    y_position = height - 130
    
    for section in text_sections:
        # Título da seção
        c.setFont('Helvetica-Bold', 14)
        c.drawString(50, y_position, section['title'])
        y_position -= 25
        
        # Conteúdo da seção
        c.setFont('Helvetica', 11)
        for line in section['content']:
            c.drawString(70, y_position, line)
            y_position -= 18
            
        y_position -= 15  # Espaço entre seções
        
        # Nova página se necessário
        if y_position < 100:
            c.showPage()
            y_position = height - 80
    
    # Rodapé
    c.setFont('Helvetica-Oblique', 10)
    c.drawString(50, 50, f'Arquivo: {filename} | Gerado automaticamente para teste')
    
    # Salvar
    c.save()
    return filename

def create_text_only_pdf():
    """Cria um PDF minimalista só com texto"""
    try:
        # Usar apenas bibliotecas built-in do Python
        content = f"""TESTE PDF SIMPLES
        
Data: {datetime.datetime.now().strftime('%d/%m/%Y %H:%M:%S')}

Este é um documento PDF de teste criado automaticamente.

TEXTO DE TESTE:
- Linha 1: Funcionalidade básica
- Linha 2: Acentos (ção, não, são)
- Linha 3: Números (123456)
- Linha 4: Símbolos (!@#$%*)

CONTEÚDO PARA CONVERSÃO:
Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Sed do eiusmod tempor incididunt ut labore et dolore.

FIM DO DOCUMENTO
"""
        
        # Salvar como texto simples primeiro
        with open('test_content.txt', 'w', encoding='utf-8') as f:
            f.write(content)
        
        print("✅ Conteúdo de teste salvo em: test_content.txt")
        return 'test_content.txt'
        
    except Exception as e:
        print(f"❌ Erro ao criar arquivo: {e}")
        return None

if __name__ == "__main__":
    print("🔄 Gerando PDF de teste...")
    
    try:
        # Tentar criar PDF com reportlab
        filename = create_simple_pdf()
        print(f"✅ PDF criado com sucesso: {filename}")
        
        # Verificar tamanho do arquivo
        import os
        size = os.path.getsize(filename)
        print(f"📊 Tamanho: {size} bytes ({size/1024:.1f} KB)")
        
    except Exception as e:
        print(f"❌ Erro ao criar PDF: {e}")
        print("🔄 Criando arquivo de texto como alternativa...")
        
        # Fallback para arquivo de texto
        filename = create_text_only_pdf()
        if filename:
            print(f"✅ Arquivo alternativo criado: {filename}")
    
    print("🎯 Arquivo pronto para teste da API!")