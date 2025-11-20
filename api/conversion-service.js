/**
 * 🎯 CONVERSION SERVICE
 * 
 * Orquestra o processo de conversão MPP → XML
 * Integrando:
 * - Conversor (converters/mppToXml.js)
 * - Banco de Dados (FileRepository)
 * - Logging (logger-enterprise.js)
 * - Queue (para processamento em background)
 */

const fs = require('fs').promises;
const path = require('path');
const EnterpriseLogger = require('./logger-enterprise');
const { FileRepository, prisma } = require('./database');

// Importar o conversor MPP
const mppConverter = require('../converters/mppToXml');

const logger = new EnterpriseLogger('CONVERSION_SERVICE', {
  logsDir: path.join(__dirname, '../logs'),
});

/**
 * Serviço de Conversão
 * Gerencia todo o fluxo: validação → conversão → armazenamento
 */
class ConversionService {
  constructor(config = {}) {
    this.uploadDir = config.uploadDir || './uploads';
    this.convertedDir = path.join(this.uploadDir, 'converted');
    this.maxRetries = config.maxRetries || 3;
    this.timeout = config.timeout || 300000; // 5 minutos
  }

  /**
   * Iniciar conversão de arquivo
   * @param {number} fileId - ID do arquivo no BD
   * @param {string} inputPath - Caminho do arquivo .mpp
   * @returns {Promise<object>} Resultado da conversão
   */
  async startConversion(fileId, inputPath) {
    const startTime = Date.now();
    let conversion = null;

    try {
      // 1. Marcar como PROCESSING no BD
      conversion = await FileRepository.updateConversionStatus(fileId, 'PROCESSING', {
        startedAt: new Date(),
        startedBy: 'system'
      });

      logger.info('CONVERSION_STARTED', {
        fileId,
        inputPath,
        filename: conversion.originalFilename
      });

      // 2. Validar arquivo de entrada
      const inputExists = await this._fileExists(inputPath);
      if (!inputExists) {
        throw new Error(`Input file not found: ${inputPath}`);
      }

      // 3. Preparar output
      const outputFilename = this._getOutputFilename(conversion.originalFilename);
      const outputPath = path.join(this.convertedDir, outputFilename);

      // 4. Executar conversão
      const conversionResult = await this._executeConversion(
        inputPath,
        outputPath,
        fileId
      );

      // 5. Validar output
      const outputExists = await this._fileExists(outputPath);
      if (!outputExists) {
        throw new Error('Output file was not created');
      }

      // 6. Gerar hash do output
      const outputHash = await this._hashFile(outputPath);

      // 7. Registrar sucesso no BD
      const finalConversion = await FileRepository.updateConversionStatus(
        fileId,
        'COMPLETED',
        {
          outputPath,
          outputHash,
          completedAt: new Date(),
          duration: Date.now() - startTime,
          conversionResult: JSON.stringify(conversionResult),
          isDownloadable: true
        }
      );

      const duration = (Date.now() - startTime) / 1000;

      logger.info('CONVERSION_COMPLETED', {
        fileId,
        duration: `${duration.toFixed(2)}s`,
        inputSize: conversion.fileSizeBytes,
        outputSize: conversionResult.outputSize,
        outputHash
      });

      return {
        success: true,
        fileId,
        status: 'COMPLETED',
        inputFile: path.basename(inputPath),
        outputFile: outputFilename,
        inputSize: conversion.fileSizeBytes,
        outputSize: conversionResult.outputSize,
        duration,
        outputHash,
        downloadUrl: `/api/download/${outputHash}`
      };

    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;

      logger.error('CONVERSION_FAILED', {
        fileId,
        error: error.message,
        duration: `${duration.toFixed(2)}s`,
        stack: error.stack
      });

      // Marcar como FAILED no BD
      try {
        await FileRepository.updateConversionStatus(
          fileId,
          'FAILED',
          {
            completedAt: new Date(),
            duration,
            errorMessage: error.message,
            errorStack: error.stack
          }
        );
      } catch (dbError) {
        logger.error('FAILED_TO_UPDATE_CONVERSION_STATUS', dbError);
      }

      throw error;
    }
  }

  /**
   * Executar conversão com timeout e retry logic
   * @private
   */
  async _executeConversion(inputPath, outputPath, fileId) {
    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.info('CONVERSION_ATTEMPT', { attempt, fileId });

        // Criar diretório de saída
        await fs.mkdir(path.dirname(outputPath), { recursive: true });

        // Executar conversão com timeout
        const conversionPromise = mppConverter.convertMPPtoXML(inputPath, outputPath);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Conversion timeout after ${this.timeout}ms`)), this.timeout)
        );

        const result = await Promise.race([conversionPromise, timeoutPromise]);
        return result;

      } catch (error) {
        lastError = error;
        logger.warn('CONVERSION_ATTEMPT_FAILED', {
          attempt,
          error: error.message,
          willRetry: attempt < this.maxRetries
        });

        if (attempt < this.maxRetries) {
          // Aguardar antes de retry (backoff exponencial)
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Conversion failed after retries');
  }

  /**
   * Gerar hash SHA-256 do arquivo
   * @private
   */
  async _hashFile(filePath) {
    const crypto = require('crypto');
    const content = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Verificar se arquivo existe
   * @private
   */
  async _fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gerar nome de arquivo de saída
   * @private
   */
  _getOutputFilename(inputFilename) {
    const timestamp = Date.now();
    const cleanName = path.basename(inputFilename, path.extname(inputFilename))
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 100);
    
    return `${cleanName}_${timestamp}.xml`;
  }

  /**
   * Obter status de conversão
   */
  async getStatus(fileId) {
    try {
      const conversion = await FileRepository.getConversionById(fileId);
      
      if (!conversion) {
        throw new Error('Conversion not found');
      }

      return {
        fileId,
        status: conversion.status,
        filename: conversion.originalFilename,
        inputSize: conversion.fileSizeBytes,
        outputSize: conversion.outputSize || null,
        progress: this._calculateProgress(conversion.status),
        isDownloadable: conversion.isDownloadable || false,
        downloadUrl: conversion.status === 'COMPLETED' 
          ? `/api/download/${conversion.outputHash}`
          : null,
        createdAt: conversion.createdAt,
        completedAt: conversion.completedAt,
        error: conversion.errorMessage || null
      };

    } catch (error) {
      logger.error('GET_STATUS_FAILED', { fileId, error: error.message });
      throw error;
    }
  }

  /**
   * Calcular progresso baseado no status
   * @private
   */
  _calculateProgress(status) {
    const progressMap = {
      'PENDING': 10,
      'PROCESSING': 50,
      'COMPLETED': 100,
      'FAILED': 0
    };
    return progressMap[status] || 0;
  }

  /**
   * Listar conversões do usuário
   */
  async listConversions(transactionId, limit = 50, offset = 0) {
    try {
      const conversions = await FileRepository.getConversionsByTransaction(
        transactionId,
        limit,
        offset
      );

      return {
        total: conversions.length,
        items: conversions.map(c => ({
          id: c.id,
          filename: c.originalFilename,
          status: c.status,
          progress: this._calculateProgress(c.status),
          createdAt: c.createdAt,
          completedAt: c.completedAt,
          downloadable: c.status === 'COMPLETED',
          error: c.errorMessage
        }))
      };

    } catch (error) {
      logger.error('LIST_CONVERSIONS_FAILED', error);
      throw error;
    }
  }

  /**
   * Limpar conversões expiradas (> 7 dias)
   */
  async cleanupExpiredConversions() {
    try {
      const expiryDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const conversions = await prisma.fileConversion.findMany({
        where: {
          createdAt: { lt: expiryDate },
          status: 'COMPLETED'
        }
      });

      let deletedCount = 0;
      for (const conversion of conversions) {
        try {
          // Remover arquivo físico
          if (conversion.outputPath) {
            await fs.unlink(conversion.outputPath).catch(() => {});
          }

          // Remover input
          if (conversion.inputPath) {
            await fs.unlink(conversion.inputPath).catch(() => {});
          }

          // Marcar como expirado no BD
          await FileRepository.updateConversionStatus(conversion.id, 'EXPIRED');
          deletedCount++;

        } catch (error) {
          logger.warn('CLEANUP_FAILED_FOR_CONVERSION', {
            conversionId: conversion.id,
            error: error.message
          });
        }
      }

      logger.info('CLEANUP_EXPIRED_CONVERSIONS', {
        deleted: deletedCount,
        before: expiryDate.toISOString()
      });

      return { cleaned: deletedCount };

    } catch (error) {
      logger.error('CLEANUP_FAILED', error);
      throw error;
    }
  }
}

module.exports = ConversionService;
