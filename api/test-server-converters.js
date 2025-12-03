/**
 * 🚀 SERVIDOR DE TESTE - CONVERTERS API
 * 
 * Simples servidor Express para testar os 4 novos conversores via HTTP
 * 
 * Execução: node api/test-server-converters.js
 * 
 * Depois teste com curl ou Postman:
 * POST http://localhost:3001/api/converters/excel-to-csv
 */

const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const converterRoutes = require('./converter-routes');

const app = express();
const PORT = process.env.CONVERTER_TEST_PORT || 3001;

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Criar diretórios necessários
const setupDirs = async () => {
  const dirs = [
    './uploads/converter-temp',
    './temp',
    './logs'
  ];

  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }
};

// Rotas
app.use('/api/converters', converterRoutes);

// Health check geral
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '✅ Servidor de testes dos conversores está online',
    timestamp: new Date().toISOString()
  });
});

// Home - documentação simples
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CannaConverter - API de Testes</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }

    .container {
      background: white;
      border-radius: 10px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 900px;
      width: 100%;
      padding: 40px;
    }

    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 2.5em;
    }

    .subtitle {
      color: #666;
      margin-bottom: 30px;
      font-size: 1.1em;
    }

    .converter-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }

    .converter-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 25px;
      border-radius: 8px;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
      transition: transform 0.3s ease;
    }

    .converter-card:hover {
      transform: translateY(-5px);
    }

    .converter-card h3 {
      margin-bottom: 15px;
      font-size: 1.3em;
    }

    .converter-card code {
      display: block;
      background: rgba(0, 0, 0, 0.2);
      padding: 10px;
      border-radius: 4px;
      margin-bottom: 10px;
      font-size: 0.9em;
      word-break: break-all;
    }

    .converter-card .status {
      display: inline-block;
      background: #4ade80;
      padding: 5px 10px;
      border-radius: 3px;
      font-size: 0.9em;
      margin-top: 10px;
    }

    .test-section {
      background: #f5f5f5;
      padding: 30px;
      border-radius: 8px;
      margin-top: 40px;
    }

    .test-section h2 {
      color: #333;
      margin-bottom: 20px;
    }

    .test-form {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    select, input[type="file"], button {
      padding: 12px;
      border: 2px solid #ddd;
      border-radius: 4px;
      font-size: 1em;
      font-family: inherit;
    }

    button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      cursor: pointer;
      font-weight: bold;
      transition: opacity 0.3s ease;
    }

    button:hover {
      opacity: 0.9;
    }

    .result {
      background: white;
      border: 2px solid #ddd;
      padding: 20px;
      border-radius: 4px;
      margin-top: 20px;
      display: none;
    }

    .result.visible {
      display: block;
    }

    .result.success {
      border-color: #4ade80;
      background: #f0fdf4;
    }

    .result.error {
      border-color: #f87171;
      background: #fef2f2;
    }

    pre {
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
      margin-top: 10px;
    }

    footer {
      text-align: center;
      margin-top: 40px;
      color: #666;
      border-top: 1px solid #ddd;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔄 CannaConverter</h1>
    <p class="subtitle">Plataforma de Conversão de Arquivos - 4 Novos Conversores</p>

    <div class="converter-grid">
      <div class="converter-card">
        <h3>1️⃣  Excel → CSV</h3>
        <code>POST /api/converters/excel-to-csv</code>
        <p>Converte arquivos .xlsx e .xls para CSV</p>
        <span class="status">✅ Online</span>
      </div>

      <div class="converter-card">
        <h3>2️⃣  JSON → CSV</h3>
        <code>POST /api/converters/json-to-csv</code>
        <p>Converte arquivos .json para CSV</p>
        <span class="status">✅ Online</span>
      </div>

      <div class="converter-card">
        <h3>3️⃣  ZIP → XML</h3>
        <code>POST /api/converters/zip-to-xml</code>
        <p>Extrai XMLs de dentro de arquivos .zip</p>
        <span class="status">✅ Online</span>
      </div>

      <div class="converter-card">
        <h3>4️⃣  XML → MPP</h3>
        <code>POST /api/converters/xml-to-mpp</code>
        <p>Converte XML para MPP (formato simulado)</p>
        <span class="status">✅ Online</span>
      </div>
    </div>

    <div class="test-section">
      <h2>🧪 Teste os Conversores</h2>
      <form class="test-form" onsubmit="testConverter(event)">
        <label for="converter">Escolha um conversor:</label>
        <select id="converter" required>
          <option value="">-- Selecione --</option>
          <option value="excel-to-csv">Excel → CSV</option>
          <option value="json-to-csv">JSON → CSV</option>
          <option value="zip-to-xml">ZIP → XML</option>
          <option value="xml-to-mpp">XML → MPP</option>
        </select>

        <label for="file">Enviar arquivo:</label>
        <input type="file" id="file" required>

        <button type="submit">🚀 Testar Conversão</button>
      </form>

      <div class="result" id="result">
        <h3 id="resultTitle"></h3>
        <pre id="resultContent"></pre>
      </div>
    </div>

    <footer>
      <p>CannaConverter © 2025 | Desenvolvido com ❤️</p>
      <p><a href="/api/converters/health" style="color: #667eea; text-decoration: none;">Status dos Conversores →</a></p>
    </footer>
  </div>

  <script>
    async function testConverter(e) {
      e.preventDefault();

      const converter = document.getElementById('converter').value;
      const file = document.getElementById('file').files[0];
      const resultDiv = document.getElementById('result');
      const resultTitle = document.getElementById('resultTitle');
      const resultContent = document.getElementById('resultContent');

      if (!file) {
        alert('Selecione um arquivo!');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      try {
        resultTitle.textContent = '⏳ Processando...';
        resultDiv.className = 'result visible';
        resultContent.textContent = '';

        const response = await fetch(\`/api/converters/\${converter}\`, {
          method: 'POST',
          body: formData
        });

        const data = await response.json();

        if (data.success) {
          resultTitle.textContent = '✅ Conversão Realizada com Sucesso!';
          resultDiv.className = 'result visible success';
        } else {
          resultTitle.textContent = '❌ Erro na Conversão';
          resultDiv.className = 'result visible error';
        }

        resultContent.textContent = JSON.stringify(data, null, 2);
      } catch (error) {
        resultTitle.textContent = '❌ Erro';
        resultDiv.className = 'result visible error';
        resultContent.textContent = error.message;
      }
    }
  </script>
</body>
</html>
  `);
});

// Iniciar servidor
const start = async () => {
  await setupDirs();

  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🚀 SERVIDOR DE TESTES - CONVERTERS API                     ║
║                                                              ║
║  ✅ Servidor online: http://localhost:${PORT}${' '.repeat(12 - String(PORT).length)}║
║                                                              ║
║  📝 Abra no navegador:                                      ║
║     http://localhost:${PORT}${' '.repeat(43 - String(PORT).length)}║
║                                                              ║
║  🔌 API Health:                                             ║
║     http://localhost:${PORT}/api/converters/health${' '.repeat(18 - String(PORT).length)}║
║                                                              ║
║  🎯 Conversores Disponíveis:                                ║
║     1. Excel → CSV   (POST /api/converters/excel-to-csv)   ║
║     2. JSON → CSV    (POST /api/converters/json-to-csv)    ║
║     3. ZIP → XML     (POST /api/converters/zip-to-xml)     ║
║     4. XML → MPP     (POST /api/converters/xml-to-mpp)     ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    `);
  });
};

start().catch(error => {
  console.error('❌ Erro ao iniciar servidor:', error);
  process.exit(1);
});
