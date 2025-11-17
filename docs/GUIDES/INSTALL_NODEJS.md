# Conversor MPP para XML - Guia de Instalação do Node.js

## ⚠️ IMPORTANTE: Node.js não detectado!

Para executar este projeto, você precisa instalar o Node.js no seu sistema Windows.

## 📥 Instalação do Node.js

### Opção 1: Download Oficial (Recomendado)
1. Acesse: https://nodejs.org/
2. Baixe a versão **LTS** (Long Term Support)
3. Execute o instalador como Administrador
4. Siga o assistente de instalação
5. Reinicie o terminal/VS Code

### Opção 2: Via Chocolatey (Se você tem chocolatey)
```powershell
choco install nodejs
```

### Opção 3: Via winget (Windows Package Manager)
```powershell
winget install OpenJS.NodeJS
```

## ✅ Verificação da Instalação

Após instalar, abra um novo terminal e execute:
```powershell
node --version
npm --version
```

Você deve ver algo como:
```
v18.18.0
9.8.1
```

## 🚀 Executando o Projeto

Depois de instalar o Node.js:

1. **Instalar dependências:**
```powershell
npm install
```

2. **Criar estrutura de diretórios:**
```powershell
npm run setup-dirs
```

3. **Iniciar servidor de desenvolvimento:**
```powershell
npm run dev
```

4. **Iniciar worker de processamento (em outro terminal):**
```powershell
npm run worker
```

## 🔧 Versões Recomendadas

| Ferramenta | Versão Mínima | Versão Recomendada |
|------------|---------------|--------------------|
| Node.js    | 16.x          | 18.x LTS          |
| npm        | 8.x           | 9.x               |
| Redis      | 6.x           | 7.x (opcional)    |

## 📋 Status do Sistema Atual

✅ **Arquitetura Enterprise Implementada:**
- Sistema de filas com BullMQ
- Processamento em background
- Tokens seguros para download
- Rate limiting e segurança
- Conversão MPP → XML completa

❌ **Pendência:**
- Node.js não instalado no sistema
- Servidor não pode ser executado

## 🆘 Troubleshooting

### Problema: "node não é reconhecido"
**Causa:** Node.js não instalado ou não no PATH
**Solução:** Instale Node.js pelo link oficial acima

### Problema: "Erro de permissão"
**Causa:** Falta de permissões administrativas
**Solução:** Execute terminal como Administrador

### Problema: "npm command failed"
**Causa:** npm cache corrompido
**Solução:** 
```powershell
npm cache clean --force
npm install
```

## 📞 Suporte

Se precisar de ajuda:
1. Verifique os logs em `logs/`
2. Execute `npm run doctor` para diagnóstico
3. Consulte a documentação oficial do Node.js