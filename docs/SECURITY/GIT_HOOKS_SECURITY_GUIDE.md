# 🔐 Git Hooks Security Guide

## Visão Geral

Este projeto implementa dois níveis de proteção contra código malicioso via Git Hooks:

1. **Pre-Commit Hook** - Valida código antes de commitar
2. **Pre-Push Hook** - Valida código antes de fazer push

---

## 📦 Instalação

Os hooks estão localizados em:
- `.git/hooks/pre-commit`
- `.git/hooks/pre-push`

### Para UNIX/Linux/macOS

```bash
# Tornar hooks executáveis
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/pre-push

# Verificar instalação
ls -la .git/hooks/pre-*
```

### Para Windows (PowerShell)

```powershell
# Verificar se os hooks existem
Get-Item .\.git\hooks\pre-commit
Get-Item .\.git\hooks\pre-push

# Tornar executável (se necessário)
# Git no Windows detecta automaticamente shell scripts
```

---

## 🛡️ Padrões de Detecção

Os hooks detectam e bloqueiam os seguintes padrões:

### Código Malicioso Específico
- ✋ `logging persistente` - Injeção de logging
- ✋ `execucoes_python` - Arquivo de log suspeito
- ✋ `Invoke-Expression` - Execução dinâmica PowerShell
- ✋ `IEX ` - Alias perigoso do PowerShell
- ✋ `WScript.Shell` - COM object suspeito (Windows)

### Spawning de Processos
- ✋ `spawn.*python` - Spawning Python
- ✋ `exec.*python` - Execução Python
- ✋ `powershell.*-c` - Command invocation
- ✋ `cmd /c.*python` - CMD invocation

### Execução Dinâmica
- ✋ `import sys, os, datetime` - Pattern específico de injeção

---

## 📋 Como Funcionam

### Pre-Commit Hook

```
Git Workflow:
  git add arquivo.js
           ↓
    [PRE-COMMIT HOOK]
    ✓ Verificar malware
    ✓ Verificar primeira linha
    ✓ Verificar padrões suspeitos
           ↓
  ✅ PASS → git commit allowed
  ❌ FAIL → commit blocked, arquivo listado
```

### Pre-Push Hook

```
Git Workflow:
  git push origin main
           ↓
    [PRE-PUSH HOOK]
    ✓ Verificar todos commits
    ✓ Verificar histórico completo
    ✓ Validar cada mudança
           ↓
  ✅ PASS → push allowed
  ❌ FAIL → push blocked, commits suspeitos listados
```

---

## ✅ Exemplos de Uso

### Cenário 1: Commit Legítimo

```bash
# Editar arquivo legítimo
echo "console.log('Hello');" > app.js

# Tentar commitar
git add app.js
git commit -m "Add hello world"

# Resultado:
# 🔍 Verificando código malicioso...
# ✅ All files passed security check
# [main 1a2b3c4] Add hello world
```

### Cenário 2: Commit com Código Malicioso (BLOQUEADO)

```bash
# Editar arquivo com código suspeito
echo "; # logging persistente para rastreamento" > check-system.ps1

# Tentar commitar
git add check-system.ps1
git commit -m "Add logging"

# Resultado:
# 🔍 Verificando código malicioso...
# ❌ MALICIOUS CODE DETECTED in check-system.ps1
#    Pattern: logging persistente para rastreamento de execu
# 
# 🚫 COMMIT BLOCKED - Malicious code detected!
#    Please review your changes before committing.
```

### Cenário 3: Push Bloqueado

```bash
# Tentar fazer push com commits suspeitos
git push origin main

# Resultado:
# 🔐 Pre-push security check
# Checking commits: origin/main..HEAD
#   Checking a1b2c3d... ❌
#       ❌ MALICIOUS PATTERN: logging persistente
# 
# 🚫 PUSH BLOCKED - Malicious code detected in commits!
```

---

## 🔧 Troubleshooting

### Problema: Hook não executa no Windows

**Solução**:
```powershell
# Git no Windows às vezes não executa shell scripts
# Converter para PowerShell ou batch

# OU usar WSL (Windows Subsystem for Linux)
wsl bash
cd "/mnt/c/path/to/project"
git commit -m "message"
```

### Problema: Permissão negada

**Solução (Unix/Linux/macOS)**:
```bash
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/pre-push
```

### Problema: Hook muito lento

**Solução**: O hook é otimizado para 1000+ arquivos. Se muito lento:
- Verificar espaço em disco
- Verificar performance do git
- Rodar manualmente: `.git/hooks/pre-commit`

### Problema: False positives

Se o hook bloqueia código legítimo:
1. Revisar o padrão suspeito
2. Considerar se é realmente necessário
3. Se legítimo, documentar por que é seguro

---

## 🚀 Contorno de Segurança (Apenas Emergência)

Se absolutamente necessário contornar o hook (risco muito alto):

```bash
# PRÉ-COMMIT (NÃO RECOMENDADO)
git commit --no-verify -m "message"

# PRÉ-PUSH (NÃO RECOMENDADO)
git push --no-verify origin main
```

⚠️ **AVISO**: Usar `--no-verify` apenas em emergências críticas com aprovação de segurança.

---

## 📊 Monitoramento

Para monitorar hooks e atividades suspeitas:

```bash
# Ver logs de commits
git log --oneline -20

# Ver todas as mudanças recentes
git diff HEAD~5

# Verificar branches remotas
git branch -a

# Auditar histórico completo
git log --all --oneline | grep -i "security\|fix\|revert"
```

---

## 🔐 Boas Práticas

### ✅ FAÇA

- ✅ Sempre revisar mudanças antes de commitar
- ✅ Usar descritivas commit messages
- ✅ Manter hooks atualizados
- ✅ Reportar código suspeito

### ❌ NÃO FAÇA

- ❌ Usar `--no-verify` sem necessidade
- ❌ Desabilitar hooks por comodidade
- ❌ Ignorar alertas de segurança
- ❌ Commitar sem revisar

---

## 📞 Suporte

Se encontrar problemas:

1. **Verificar status dos hooks**:
   ```bash
   ls -la .git/hooks/
   ```

2. **Executar hook manualmente**:
   ```bash
   .git/hooks/pre-commit
   ```

3. **Ver log de erro**:
   ```bash
   git log --oneline
   ```

4. **Contactar time de segurança** se bloqueia código legítimo

---

## 📚 Referências

- [Git Hooks Documentation](https://git-scm.com/docs/githooks)
- [Pre-commit Hook Guide](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)
- [Security Best Practices](https://owasp.org/www-community/attacks/Code_Injection)

---

**Última Atualização**: 18/11/2025  
**Status**: ✅ ATIVO  
**Proteção**: 🔐 HABILITADA
