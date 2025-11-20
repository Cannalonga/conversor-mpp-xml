#!/bin/bash
# Script para desabilitar extensões Python problemáticas no VS Code
# Causa: Disparos de 2.367+ processos Python ao abrir o workspace

VSCODE_EXTENSIONS_DIR="$HOME/.vscode/extensions"
PYTHON_EXTENSIONS=(
  "ms-python.python*"
  "ms-python.vscode-pylance*"
  "ms-python.debugpy*"
  "ms-python.isort*"
  "ms-python.vscode-python-envs*"
  "ms-python.python-environment-manager*"
  "donjayamanne.python-extension-pack*"
  "donjayamanne.githistory*"
  "kevinrose.vsc-python-indent*"
)

echo "🔍 Procurando extensões Python problemáticas..."

for pattern in "${PYTHON_EXTENSIONS[@]}"; do
  # Encontrar extensões que correspondem ao padrão
  for ext_dir in $VSCODE_EXTENSIONS_DIR/$pattern; do
    if [ -d "$ext_dir" ]; then
      ext_name=$(basename "$ext_dir")
      ext_disabled="${ext_dir}.disabled"
      
      echo "🚫 Desabilitando: $ext_name"
      if [ -d "$ext_disabled" ]; then
        echo "   (Já estava desabilitada)"
      else
        mv "$ext_dir" "$ext_disabled"
        echo "   ✅ Desabilitada com sucesso"
      fi
    fi
  done
done

echo ""
echo "✅ Extensões Python desabilitadas!"
echo ""
echo "💡 Próximos passos:"
echo "   1. Feche o VS Code completamente"
echo "   2. Reabra o VS Code"
echo "   3. Verifique que não há mais disparos de Python"
echo ""
echo "🔄 Para reabilitar as extensões:"
echo "   1. Localize os diretórios com sufixo '.disabled'"
echo "   2. Renomeie removendo '.disabled'"
echo "   3. Reinicie VS Code"
