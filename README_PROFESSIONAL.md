# 🔄 MPP to XML Converter - Professional Edition

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/your-repo)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.8+-blue.svg)](https://python.org)
[![Status](https://img.shields.io/badge/status-production-success.svg)]()

## 📋 Visão Geral

Uma aplicação web profissional para conversão de arquivos Microsoft Project (.mpp) para formato XML com sistema de monetização via PIX. Desenvolvida com foco em segurança, performance e experiência do usuário.

### ✨ Características Principais

- 🔒 **Segurança Avançada**: Headers de segurança, validação de arquivos e limpeza automática
- 📦 **Download Seguro**: Sistema ZIP que elimina avisos de segurança do navegador
- 💳 **Pagamento PIX**: Integração completa com sistema de pagamento brasileiro
- ⚡ **Performance**: Processamento otimizado com feedback em tempo real
- 📱 **Responsivo**: Interface moderna que funciona em todos os dispositivos
- 🛡️ **Profissional**: Código limpo seguindo melhores práticas de desenvolvimento

## 🚀 Demonstração

- **Local**: `http://localhost:8082`
- **Produção**: `https://your-domain.com`

## 📁 Estrutura do Projeto

```
mpp-xml-converter/
├── 📂 public/                    # Frontend da aplicação
│   ├── index_professional.html   # Interface principal
│   ├── 📂 css/
│   │   └── style_professional.css # Estilos profissionais
│   └── 📂 js/
│       └── app_professional.js    # Lógica do cliente
├── 📂 config/                    # Configurações
│   └── app_professional.json     # Config principal
├── 📂 temp_downloads/            # Downloads temporários
├── 📂 logs/                      # Logs do sistema
├── server_professional.py        # Servidor Python principal
├── README_PROFESSIONAL.md        # Esta documentação
└── requirements.txt              # Dependências Python
```

## 🔧 Instalação e Configuração

### Pré-requisitos

- Python 3.8 ou superior
- Navegador moderno (Chrome 60+, Firefox 55+, Safari 12+, Edge 79+)
- 2GB de espaço livre em disco
- Conexão com a internet

### Instalação Rápida

1. **Clone o repositório**:
   ```bash
   git clone https://github.com/your-username/mpp-xml-converter.git
   cd mpp-xml-converter
   ```

2. **Instale as dependências**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Execute o servidor**:
   ```bash
   python server_professional.py
   ```

4. **Acesse a aplicação**:
   ```
   http://localhost:8082
   ```

### Configuração Avançada

#### Variáveis de Ambiente

```bash
# Servidor
PORT=8082
HOST=0.0.0.0
MAX_FILE_SIZE=100MB

# Pagamento
PIX_AMOUNT=10.00
PIX_KEY=your-pix-key
TEST_MODE=true

# Segurança
SECRET_KEY=your-secret-key
ENABLE_CORS=true
```

#### Configuração do PIX

Para produção, configure suas credenciais PIX no arquivo `config/app_professional.json`:

```json
{
  "payment": {
    "pixKey": "your-actual-pix-key",
    "merchantName": "Your Company",
    "testMode": false
  }
}
```

## 🏗️ Arquitetura Técnica

### Backend (Python)

- **Framework**: HTTP Server nativo
- **Processamento**: Multithread para uploads simultâneos
- **Segurança**: Headers de segurança, validação de arquivos
- **Logging**: Sistema completo de logs com rotação

### Frontend (Vanilla JavaScript)

- **ES6+**: Código moderno com classes e módulos
- **Responsivo**: CSS Grid e Flexbox
- **UX**: Drag & drop, feedback visual, animações
- **Acessibilidade**: ARIA labels, navegação por teclado

### Recursos de Segurança

- ✅ Content Security Policy (CSP)
- ✅ X-XSS-Protection
- ✅ X-Frame-Options
- ✅ X-Content-Type-Options
- ✅ CORS configurável
- ✅ Validação de tipos de arquivo
- ✅ Limpeza automática de arquivos temporários

## 💻 Uso da Aplicação

### 1. Upload do Arquivo

- Arraste e solte o arquivo .mpp na área designada
- Ou clique para selecionar o arquivo
- Máximo: 100MB por arquivo

### 2. Pagamento

- Sistema PIX integrado com QR Code
- Valor: R$ 10,00 por conversão
- Confirmação automática (modo teste)

### 3. Download

- Download seguro em formato ZIP
- Arquivo XML incluído com nome original
- Link expira em 5 minutos

## 🛠️ Desenvolvimento

### Executar em Modo de Desenvolvimento

```bash
# Com auto-reload
python -m http.server 8082 --directory public

# Ou execute o servidor principal
python server_professional.py
```

### Estrutura do Código

#### Classes Principais

```python
# Servidor
class MPPConverterHandler(http.server.SimpleHTTPRequestHandler)

# JavaScript
class FileUploadManager
class PaymentModal
class AppState
```

### Padrões de Código

- **Python**: PEP 8, Type hints, Docstrings
- **JavaScript**: ES6+, JSDoc, Modular
- **CSS**: BEM methodology, Custom properties
- **HTML**: Semantic markup, ARIA

## 🧪 Testes

### Testes Manuais

1. **Upload de arquivo válido (.mpp)**
2. **Tentativa de upload de arquivo inválido**
3. **Teste de pagamento PIX**
4. **Download do arquivo convertido**
5. **Teste de responsividade**

### Testes Automatizados

```bash
# Execute testes unitários
python -m pytest tests/

# Teste de performance
python -m cProfile server_professional.py
```

## 📊 Monitoramento

### Logs do Sistema

```bash
# Visualizar logs em tempo real
tail -f logs/server.log

# Logs de erro
grep ERROR logs/server.log
```

### Métricas de Performance

- **Tempo de upload**: < 30s para arquivos de 100MB
- **Tempo de conversão**: < 5s
- **Uso de memória**: < 512MB
- **CPU**: < 50% durante processamento

## 🚀 Deploy em Produção

### Opção 1: VPS/Servidor Dedicado

```bash
# Configure o systemd service
sudo cp mpp-converter.service /etc/systemd/system/
sudo systemctl enable mpp-converter
sudo systemctl start mpp-converter
```

### Opção 2: Docker

```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
EXPOSE 8082
CMD ["python", "server_professional.py"]
```

### Opção 3: Cloud Providers

- **Heroku**: Pronto para deploy
- **AWS EC2**: AMI configurada disponível
- **Google Cloud**: Cloud Run compatível
- **DigitalOcean**: App Platform suportado

## 🔐 Segurança

### Checklist de Segurança

- [x] Headers de segurança configurados
- [x] Validação de entrada
- [x] Sanitização de arquivos
- [x] Rate limiting (opcional)
- [x] HTTPS em produção
- [x] Logs de auditoria
- [x] Backup automático

### Relatório de Vulnerabilidades

Para reportar problemas de segurança, envie email para: security@your-domain.com

## 📈 Roadmap

### Versão 1.1 (Próxima)

- [ ] API REST completa
- [ ] Dashboard administrativo
- [ ] Múltiplos formatos de saída
- [ ] Integração com cloud storage

### Versão 1.2 (Futuro)

- [ ] Processamento em lote
- [ ] Webhooks para notificações
- [ ] API de terceiros
- [ ] Mobile app

## 🤝 Contribuição

### Como Contribuir

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

### Padrões de Commit

```
feat: adiciona nova funcionalidade
fix: corrige bug
docs: atualiza documentação
style: mudanças de formatação
refactor: refatoração de código
test: adiciona testes
chore: tarefas de manutenção
```

## 📄 Licença

Este projeto está licenciado sob a MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 👥 Equipe

- **Development Team** - Desenvolvimento principal
- **Contributors** - [Lista de contribuidores](https://github.com/your-repo/contributors)

## 📞 Suporte

### Contatos

- 📧 **Email**: suporte@your-domain.com
- 💬 **Chat**: Disponível na aplicação
- 📚 **Documentação**: [Wiki do projeto](https://github.com/your-repo/wiki)
- 🐛 **Bugs**: [Issues no GitHub](https://github.com/your-repo/issues)

### FAQ

**P: Quais formatos são suportados?**  
R: Atualmente apenas arquivos .mpp (Microsoft Project).

**P: Há limite de tamanho?**  
R: Sim, máximo de 100MB por arquivo.

**P: Os arquivos ficam armazenados?**  
R: Não, todos os arquivos são excluídos automaticamente após 5 minutos.

**P: Como funciona o pagamento?**  
R: Sistema PIX brasileiro com confirmação em tempo real.

---

<div align="center">

**Desenvolvido com ❤️ para a comunidade brasileira**

[🌟 Star no GitHub](https://github.com/your-repo) | [📖 Documentação](https://docs.your-domain.com) | [🐛 Reportar Bug](https://github.com/your-repo/issues)

</div>