const fs = require('fs').promises;
const path = require('path');
const unzipper = require('unzipper');
const { createReadStream } = require('fs');

/**
 * Conversor de ZIP para XML
 * Extrai arquivos XML de dentro de um ZIP
 */
class ZIPToXMLConverter {
  constructor() {
    this.supportedExtensions = ['.zip'];
    this.supportedMimeTypes = ['application/zip', 'application/x-zip-compressed'];
  }

  /**
   * Extrai XML de arquivo ZIP
   * @param {string} inputPath - Caminho do arquivo ZIP
   * @param {string} outputPath - Caminho de saída (diretório)
   * @param {object} options - Opções de conversão
   * @returns {Promise<object>} Resultado da conversão
   */
  async convertZipToXml(inputPath, outputPath, options = {}) {
    try {
      console.log(`🔄 Iniciando extração: ${path.basename(inputPath)} → XML`);

      // Validar arquivo de entrada
      const inputExists = await this.fileExists(inputPath);
      if (!inputExists) {
        throw new Error(`Arquivo não encontrado: ${inputPath}`);
      }

      // Obter informações do arquivo
      const stats = await fs.stat(inputPath);
      const fileSize = stats.size;
      console.log(`📊 Tamanho do arquivo ZIP: ${(fileSize / 1024).toFixed(2)} KB`);

      // Criar diretório de saída
      const outputDir = outputPath;
      await fs.mkdir(outputDir, { recursive: true });

      // Extrair ZIP
      const extractedFiles = await this._extractZip(inputPath, outputDir, options);

      if (extractedFiles.xmlFiles.length === 0) {
        throw new Error('Nenhum arquivo XML encontrado dentro do ZIP');
      }

      console.log(`✅ Extração concluída: ${extractedFiles.xmlFiles.length} arquivo(s) XML extraído(s)`);

      return {
        success: true,
        inputFile: path.basename(inputPath),
        outputDirectory: outputDir,
        inputSize: fileSize,
        filesExtracted: extractedFiles.totalFiles,
        xmlFilesExtracted: extractedFiles.xmlFiles.length,
        xmlFiles: extractedFiles.xmlFiles,
        otherFiles: extractedFiles.otherFiles,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Erro na extração:`, error.message);
      throw error;
    }
  }

  /**
   * Extrai arquivo ZIP
   * @private
   */
  async _extractZip(zipPath, outputDir, options = {}) {
    return new Promise((resolve, reject) => {
      const xmlFiles = [];
      const otherFiles = [];
      let totalFiles = 0;

      createReadStream(zipPath)
        .pipe(unzipper.Parse())
        .on('entry', async (entry) => {
          const fileName = entry.path;
          const fileType = entry.type; // 'File' ou 'Directory'

          if (fileType === 'File') {
            totalFiles++;
            const outputFilePath = path.join(outputDir, fileName);
            const fileExt = path.extname(fileName).toLowerCase();

            // Criar diretórios se necessário
            const fileDirPath = path.dirname(outputFilePath);
            await fs.mkdir(fileDirPath, { recursive: true });

            // Escrever arquivo
            const writeStream = require('fs').createWriteStream(outputFilePath);
            entry.pipe(writeStream);

            // Rastrear XMLs
            if (fileExt === '.xml') {
              xmlFiles.push(fileName);
            } else {
              otherFiles.push(fileName);
            }

            await new Promise((resolveWrite, rejectWrite) => {
              writeStream.on('finish', resolveWrite);
              writeStream.on('error', rejectWrite);
            });
          } else {
            // É um diretório, apenas criar
            const outputDirPath = path.join(outputDir, fileName);
            await fs.mkdir(outputDirPath, { recursive: true });
            entry.autodrain();
          }
        })
        .on('error', reject)
        .on('close', () => {
          resolve({
            totalFiles,
            xmlFiles,
            otherFiles
          });
        });
    });
  }

  /**
   * Lista arquivos dentro de um ZIP sem extrair
   * @param {string} zipPath - Caminho do arquivo ZIP
   * @returns {Promise<object>} Lista de arquivos
   */
  async listZipContents(zipPath) {
    try {
      const zipExists = await this.fileExists(zipPath);
      if (!zipExists) {
        throw new Error(`Arquivo não encontrado: ${zipPath}`);
      }

      const files = [];
      const xmlFiles = [];

      return new Promise((resolve, reject) => {
        createReadStream(zipPath)
          .pipe(unzipper.Parse())
          .on('entry', (entry) => {
            const fileName = entry.path;
            const fileType = entry.type;

            if (fileType === 'File') {
              const fileExt = path.extname(fileName).toLowerCase();
              
              files.push({
                name: fileName,
                isXml: fileExt === '.xml'
              });

              if (fileExt === '.xml') {
                xmlFiles.push(fileName);
              }
            }

            entry.autodrain();
          })
          .on('error', reject)
          .on('close', () => {
            resolve({
              totalFiles: files.length,
              xmlFiles,
              allFiles: files
            });
          });
      });
    } catch (error) {
      console.error(`❌ Erro ao listar ZIP:`, error.message);
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
}

module.exports = new ZIPToXMLConverter();
