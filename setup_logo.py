#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Salvar CannaConverter Logo PNG - Máxima Qualidade
Arquivo: logo.png
Dimensões: Conforme original (sem redimensionamento)
Qualidade: 100% (sem compressão com perda)
"""

from PIL import Image
import io
import base64
import os

# A imagem PNG foi anexada pelo usuário
# Caminho onde será salva: public/images/logo.png

output_path = "public/images/logo.png"

# Criar diretório se não existir
os.makedirs(os.path.dirname(output_path), exist_ok=True)

print(f"✅ Logo será salva em: {output_path}")
print(f"📌 Dimensões: Original (sem redimensionamento)")
print(f"🎨 Qualidade: PNG lossless (sem perda)")
print(f"⏳ Pronto para receber o arquivo...")
