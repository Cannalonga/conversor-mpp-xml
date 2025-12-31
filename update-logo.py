#!/usr/bin/env python3
import base64
import os

# A imagem anexada em base64 (logo CannaConverter)
# Você pode colar a imagem como base64 aqui
logo_path = r"c:\Users\rafae\OneDrive\Área de Trabalho\PROJETOS DE ESTUDOS\CONVERSOR MPP XML\public\images\logo.png"

# Verificar se já existe um arquivo de logo e fazer backup
if os.path.exists(logo_path):
    backup_path = logo_path.replace('.png', '.backup.png')
    if not os.path.exists(backup_path):
        os.rename(logo_path, backup_path)
        print(f"✓ Logo anterior salva como backup: {backup_path}")

# Para atualizar a logo, você pode:
# 1. Usar a imagem que você trouxe e salvar diretamente
# 2. Ou você pode fazer upload manualmente da nova logo

# Mostrar instruções
print("\n" + "="*60)
print("INSTRUÇÕES PARA ATUALIZAR A LOGO")
print("="*60)
print("\n1. A nova logo que você trouxe precisa ser salva em:")
print(f"   {logo_path}")
print("\n2. Se você tem a imagem em base64, adicione-a abaixo")
print("3. Ou faça upload direto do arquivo PNG para a pasta")
print("\n" + "="*60)

# Verificar se existe
if os.path.exists(logo_path):
    size = os.path.getsize(logo_path)
    print(f"\n✓ Logo atual encontrada: {size} bytes")
else:
    print(f"\n✗ Logo não encontrada em: {logo_path}")
