const fs = require('fs').promises;
const path = require('path');
const XLSX = require('xlsx');

/**
 * Conversor de Excel (.xlsx, .xls) para CSV
 * Suporta múltiplas abas, com opção de escolher qual converter
 */
class ExcelToCSVConverter {
  constructor() {
    this.supportedExtensions = ['.xlsx', '.xls'];
    this.supportedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
  }

  /**
   * Converte arquivo Excel para CSV
   * @param {string} inputPath - Caminho do arquivo Excel
   * @param {string} outputPath - Caminho de saída do CSV
   * @param {object} options - Opções de conversão
   * @returns {Promise<object>} Resultado da conversão
   */
  async convertExcelToCsv(inputPath, outputPath, options = {}) {
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
      console.log(`📊 Tamanho do arquivo Excel: ${(fileSize / 1024).toFixed(2)} KB`);

      // Ler arquivo Excel
      const workbook = XLSX.readFile(inputPath);
      
      // Selecionar a aba (padrão: primeira aba)
      const sheetName = options.sheetName || workbook.SheetNames[0];
      if (!workbook.SheetNames.includes(sheetName)) {
        throw new Error(`Aba '${sheetName}' não encontrada. Abas disponíveis: ${workbook.SheetNames.join(', ')}`);
      }

      const worksheet = workbook.Sheets[sheetName];
      
      // Converter para CSV
      const csvData = XLSX.utils.sheet_to_csv(worksheet, {
        blankrows: true,
        defval: ''
      });

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
        sheetName: sheetName,
        sheetsAvailable: workbook.SheetNames,
        rowsProcessed: worksheet['!ref'] ? XLSX.utils.decode_range(worksheet['!ref']).e.r + 1 : 0,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Erro na conversão:`, error.message);
      throw error;
    }
  }

  /**
   * Converte CSV para Excel
   * @param {string} inputPath - Caminho do arquivo CSV
   * @param {string} outputPath - Caminho de saída do Excel
   * @param {object} options - Opções de conversão
   * @returns {Promise<object>} Resultado da conversão
   */
  async convertCsvToExcel(inputPath, outputPath, options = {}) {
    try {
      console.log(`🔄 Iniciando conversão: ${path.basename(inputPath)} → Excel`);

      // Validar arquivo de entrada
      const inputExists = await this.fileExists(inputPath);
      if (!inputExists) {
        throw new Error(`Arquivo não encontrado: ${inputPath}`);
      }

      // Obter informações do arquivo
      const stats = await fs.stat(inputPath);
      const fileSize = stats.size;
      console.log(`📊 Tamanho do arquivo CSV: ${(fileSize / 1024).toFixed(2)} KB`);

      // Ler arquivo CSV
      const csvContent = await fs.readFile(inputPath, 'utf8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      // Converter CSV para array de arrays
      const data = lines.map(line => {
        return line.split(',').map(cell => cell.trim().replace(/^"(.*)"$/, '$1'));
      });

      // Criar worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      
      // Ajustar largura das colunas
      const columnWidths = data[0]?.map(cell => ({
        wch: Math.min(Math.max(cell.length + 2, 10), 50)
      })) || [];
      worksheet['!cols'] = columnWidths;

      // Criar workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

      // Garantir que diretório de saída existe
      const outputDir = path.dirname(outputPath);
      await fs.mkdir(outputDir, { recursive: true });

      // Escrever arquivo Excel
      XLSX.writeFile(workbook, outputPath);

      const outputStats = await fs.stat(outputPath);
      const outputSize = outputStats.size;

      console.log(`✅ Conversão concluída: ${path.basename(outputPath)}`);
      console.log(`📊 Tamanho do arquivo Excel: ${(outputSize / 1024).toFixed(2)} KB`);

      return {
        success: true,
        inputFile: path.basename(inputPath),
        outputFile: path.basename(outputPath),
        inputSize: fileSize,
        outputSize: outputSize,
        rowsProcessed: data.length,
        columnsProcessed: data[0]?.length || 0,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Erro na conversão:`, error.message);
      throw error;
    }
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

  /**
   * Lista abas disponíveis no Excel
   * @param {string} inputPath - Caminho do arquivo Excel
   * @returns {Promise<string[]>} Lista de nomes de abas
   */
  async listSheets(inputPath) {
    try {
      const inputExists = await this.fileExists(inputPath);
      if (!inputExists) {
        throw new Error(`Arquivo não encontrado: ${inputPath}`);
      }

      const workbook = XLSX.readFile(inputPath);
      return workbook.SheetNames;
    } catch (error) {
      console.error(`❌ Erro ao listar abas:`, error.message);
      throw error;
    }
  }
}

module.exports = new ExcelToCSVConverter();
