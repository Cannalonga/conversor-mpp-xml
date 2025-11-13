# 🚀 Conversor MPP → XML

**Sistema web profissional para conversão de arquivos Microsoft Project para XML**

[![Security](https://img.shields.io/badge/Security-Production%20Ready-green)](https://github.com/Cannalonga/conversor-mpp-xml)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://python.org)

## ✨ Características

- 🎯 **Conversão completa**: Arquivos .mpp para XML compatível
- 💳 **Sistema de pagamento**: Integração PIX segura
- 🎨 **Interface moderna**: Design responsivo profissional
- 🔒 **Segurança**: Validação completa de uploads
- 📦 **Download seguro**: Arquivos em formato ZIP
- 🚀 **Production-ready**: Logs, monitoramento e cleanup automático

## 🛠️ Stack Tecnológico

- **Frontend**: HTML5, CSS3, JavaScript ES6+ modular
- **Backend**: Python 3.8+ com servidor HTTP integrado
- **Segurança**: Validação MIME, sanitização, rate limiting
- **Deploy**: Suporte para Docker, Heroku, AWS, Digital Ocean

## 🚀 Instalação e Uso

### Pré-requisitos
- Python 3.8 ou superior
- 512MB RAM disponível
- 1GB espaço em disco

### Instalação Local

```bash
# 1. Clone o repositório
git clone https://github.com/Cannalonga/conversor-mpp-xml.git
cd conversor-mpp-xml

# 2. Crie ambiente virtual
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/Mac

# 3. Instale dependências
pip install -r requirements_professional.txt

# 4. Configure ambiente
cp .env.example .env
# Edite .env com suas configurações

# 5. Execute servidor
python server_professional.py
```

### Acesso
- **Local**: http://localhost:8082
- **Rede**: http://[seu-ip]:8082

## 📁 Estrutura do Projeto

```
├── public/                    # Frontend
│   ├── css/
│   │   └── style_professional.css
│   ├── js/
│   │   └── app_professional.js
│   └── index_professional.html
├── config/
│   └── app_professional.json # Configurações
├── logs/                     # Logs do sistema
├── server_professional.py   # Servidor principal
├── requirements_professional.txt
└── README_PROFESSIONAL.md   # Documentação técnica
```

## 🔒 Segurança

### Medidas Implementadas
- ✅ Validação de tipo MIME e extensão
- ✅ Limite de tamanho de arquivo (100MB)
- ✅ Sanitização de nomes de arquivo
- ✅ Geração de nomes únicos (UUID)
- ✅ Cleanup automático de arquivos temporários
- ✅ Headers de segurança (CORS, XSS, etc)
- ✅ Rate limiting por IP

### Dados Sensíveis
- ❌ Nenhum dado de pagamento no código
- ❌ Nenhum arquivo de usuário no repositório
- ❌ Nenhuma credencial no código-fonte
- ✅ Todas as configurações via variáveis de ambiente

## 🌐 Deploy em Produção

### Variáveis de Ambiente Necessárias

```bash
# .env
PORT=8082
HOST=0.0.0.0
SECRET_KEY=your-secret-key-here
PIX_KEY=configure-in-admin-panel
UPLOAD_LIMIT=104857600
DEBUG=false
```

### Serviços Suportados

- **Heroku**: `Procfile` incluído
- **Digital Ocean**: Guia de deploy disponível
- **AWS/Azure**: Configurações Docker incluídas
- **Vercel/Netlify**: Suporte serverless

## 📋 Configuração de Pagamento

⚠️ **IMPORTANTE**: Configure dados de pagamento via:
1. Painel administrativo (recomendado)
2. Variáveis de ambiente
3. Arquivo de configuração seguro

**NUNCA** coloque chaves PIX diretamente no código!

## 🧪 Testes

```bash
# Teste local
python -m pytest tests/

# Teste de carga
python tests/load_test.py

# Validação de segurança
python tests/security_test.py
```

## 📊 Monitoramento

- **Logs**: `logs/server.log`
- **Métricas**: Endpoint `/health`
- **Status**: Monitoring integrado

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Crie um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

- **Issues**: [GitHub Issues](https://github.com/Cannalonga/conversor-mpp-xml/issues)
- **Documentação**: [Wiki do Projeto](https://github.com/Cannalonga/conversor-mpp-xml/wiki)
- **Email**: Configurar via painel administrativo

---

**🔒 Nota de Segurança**: Este README não contém dados sensíveis. Todas as configurações de pagamento e credenciais devem ser configuradas via variáveis de ambiente ou painel administrativo.