const fs = require('fs').promises;
const path = require('path');

/**
 * Conversor de JSON para CSV
 * Suporta arrays de objetos JSON
 */
class JSONToCSVConverter {
  constructor() {
    this.supportedExtensions = ['.json'];
    this.supportedMimeTypes = ['application/json'];
  }

  /**
   * Converte arquivo JSON para CSV
   * @param {string} inputPath - Caminho do arquivo JSON
   * @param {string} outputPath - Caminho de saída do CSV
   * @param {object} options - Opções de conversão
   * @returns {Promise<object>} Resultado da conversão
   */
  async convertJsonToCsv(inputPath, outputPath, options = {}) {
    try {
      console.log(`🔄 Iniciando conversão: ${path.basename(inputPath)} → CSV`);

      // Validar arquivo de entrada
      const inputExists = await this.fileExists(inputPath);
      if (!inputExists) {
        throw new Error(`Arquivo não encontrado: ${inputPath}`);
      }

      // Obter informações do arquivo
      const stats = await fs.stat(inputPath);
      const fileSize = stats.size;
      console.log(`📊 Tamanho do arquivo JSON: ${(fileSize / 1024).toFixed(2)} KB`);

      // Ler arquivo JSON
      const jsonContent = await fs.readFile(inputPath, 'utf8');
      let jsonData;

      try {
        jsonData = JSON.parse(jsonContent);
      } catch (error) {
        throw new Error(`JSON inválido: ${error.message}`);
      }

      // Converter para array se necessário
      let arrayData;
      if (Array.isArray(jsonData)) {
        arrayData = jsonData;
      } else if (typeof jsonData === 'object' && jsonData !== null) {
        // Se for um objeto simples, convertê-lo para array
        arrayData = [jsonData];
      } else {
        throw new Error('JSON deve ser um array ou um objeto');
      }

      if (arrayData.length === 0) {
        throw new Error('JSON array está vazio');
      }

      // Extrair colunas (headers)
      const headers = this._extractHeaders(arrayData, options.flattenDepth);
      
      // Converter dados para CSV
      const csvRows = [headers.join(',')];
      
      for (const item of arrayData) {
        const row = headers.map(header => {
          const value = this._getNestedValue(item, header);
          return this._escapeCsvValue(value);
        });
        csvRows.push(row.join(','));
      }

      const csvData = csvRows.join('\n');

      // Garantir que diretório de saída existe
      const outputDir = path.dirname(outputPath);
      await fs.mkdir(outputDir, { recursive: true });

      // Escrever arquivo CSV
      await fs.writeFile(outputPath, csvData, 'utf8');

      const outputStats = await fs.stat(outputPath);
      const outputSize = outputStats.size;

      console.log(`✅ Conversão concluída: ${path.basename(outputPath)}`);
      console.log(`📊 Tamanho do arquivo CSV: ${(outputSize / 1024).toFixed(2)} KB`);

      return {
        success: true,
        inputFile: path.basename(inputPath),
        outputFile: path.basename(outputPath),
        inputSize: fileSize,
        outputSize: outputSize,
        rowsProcessed: arrayData.length,
        columnsProcessed: headers.length,
        headers: headers,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Erro na conversão:`, error.message);
      throw error;
    }
  }

  /**
   * Extrai headers (colunas) do JSON
   * @private
   */
  _extractHeaders(arrayData, flattenDepth = 0) {
    const headers = new Set();

    for (const item of arrayData) {
      this._collectHeaders(item, '', headers, flattenDepth);
    }

    return Array.from(headers);
  }

  /**
   * Coleta headers recursivamente
   * @private
   */
  _collectHeaders(obj, prefix, headers, maxDepth, currentDepth = 0) {
    if (currentDepth > maxDepth) {
      if (prefix) {
        headers.add(prefix);
      }
      return;
    }

    if (obj === null || obj === undefined) {
      if (prefix) headers.add(prefix);
      return;
    }

    if (typeof obj !== 'object') {
      if (prefix) headers.add(prefix);
      return;
    }

    if (Array.isArray(obj)) {
      if (prefix) headers.add(prefix);
      return;
    }

    const keys = Object.keys(obj);
    if (keys.length === 0 && prefix) {
      headers.add(prefix);
      return;
    }

    for (const key of keys) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];

      if (typeof value === 'object' && value !== null && !Array.isArray(value) && currentDepth < maxDepth) {
        this._collectHeaders(value, newKey, headers, maxDepth, currentDepth + 1);
      } else {
        headers.add(newKey);
      }
    }
  }

  /**
   * Obtém valor aninhado do objeto
   * @private
   */
  _getNestedValue(obj, path) {
    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = value[key];
      } else {
        return '';
      }
    }

    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * Escapa valores para CSV
   * @private
   */
  _escapeCsvValue(value) {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    const stringValue = String(value);

    // Se contém aspas, vírgulas ou quebras de linha, envolver em aspas
    if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }

  /**
   * Verifica se arquivo existe
   * @param {string} filePath
   * @returns {Promise<boolean>}
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = new JSONToCSVConverter();
