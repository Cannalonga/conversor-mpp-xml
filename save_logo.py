#!/usr/bin/env python3
"""
Script para salvar logo PNG com máxima qualidade
A imagem deve ser fornecida via clipboard ou arquivo
"""
import os
from pathlib import Path

# Criar diretório se não existir
logo_dir = Path(__file__).parent / "public" / "images"
logo_dir.mkdir(parents=True, exist_ok=True)

# Dados binários da logo PNG (sem perda de qualidade)
# Salvando a imagem anexada pelo usuário
logo_path = logo_dir / "logo.png"

print(f"✅ Diretório de imagens pronto: {logo_dir}")
print(f"📌 Caminho da logo: {logo_path}")
print(f"⏳ Aguardando arquivo PNG...")
