# Conversor MPP para XML - Instruções do Projeto

## Visão Geral
Este projeto é uma aplicação web para conversão de arquivos .mpp (Microsoft Project) para .xml com sistema de monetização via PIX.

## Características Principais
- Conversão de arquivos .mpp para .xml
- Sistema de pagamento via PIX (R$ 10,00 por conversão)
- Espaços publicitários integrados
- Interface responsiva e moderna
- Painel administrativo para gestão

## Estrutura do Projeto
- `/public` - Frontend (HTML, CSS, JavaScript)
- `/api` - Backend Node.js 
- `/admin` - Painel administrativo
- `/config` - Arquivos de configuração
- `/uploads` - Diretório para arquivos temporários

## Tecnologias
- Frontend: HTML5, CSS3, JavaScript ES6+
- Backend: Node.js, Express.js
- Conversão: Biblioteca para processamento MPP
- Pagamento: PIX API Integration
- Banco de dados: SQLite/PostgreSQL

## Funcionalidades de Monetização
- Cobrança por conversão (R$ 10,00)
- QR Code PIX gerado automaticamente
- Verificação de pagamento em tempo real
- Espaços para Google AdSense ou outros ads

## Setup e Deployment
- Configuração de variáveis de ambiente
- Instruções de deploy em VPS/Cloud
- Configuração de domínio e SSL