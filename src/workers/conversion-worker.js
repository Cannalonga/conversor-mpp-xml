/**
 * Conversion Worker - Processamento Assíncrono de Conversões MPP→XML
 * Worker dedicado para não bloquear o servidor HTTP principal
 */

const Queue = require('bull');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { Worker, isMainThread, parentPort } = require('worker_threads');
const logger = require('../utils/secure-logger');
const StorageService = require('../services/storage-service');
const ConversionService = require('../services/conversion-service');

class ConversionWorker {
    constructor() {
        this.redisConfig = {
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD || null,
            db: process.env.REDIS_DB || 0
        };

        this.queue = new Queue('conversion', { redis: this.redisConfig });
        this.storage = new StorageService();
        this.converter = new ConversionService();
        
        // Configurações do worker
        this.concurrency = parseInt(process.env.WORKER_CONCURRENCY) || 2;
        this.maxJobTime = parseInt(process.env.MAX_JOB_TIME) || 300000; // 5 min
        
        this.setupWorker();
        
        logger.info('🔄 Conversion Worker iniciado', {
            concurrency: this.concurrency,
            maxJobTime: this.maxJobTime,
            pid: process.pid
        });
    }

    setupWorker() {
        // Processar jobs de conversão
        this.queue.process('convert-mpp-xml', this.concurrency, this.processConversion.bind(this));

        // Event listeners
        this.queue.on('ready', () => {
            logger.info('🟢 Worker conectado ao Redis');
        });

        this.queue.on('error', (error) => {
            logger.error('❌ Erro no worker', { error: error.message });
        });

        this.queue.on('failed', (job, err) => {
            logger.error('💥 Job de conversão falhou', {
                jobId: job.id,
                fileId: job.data.fileId,
                error: err.message,
                attempts: job.attemptsMade
            });
        });

        this.queue.on('completed', (job, result) => {
            logger.info('✅ Conversão concluída', {
                jobId: job.id,
                fileId: job.data.fileId,
                duration: Date.now() - job.timestamp,
                outputSize: result.outputSize
            });
        });

        // Rate limiting para evitar sobrecarga
        this.queue.on('waiting', async (jobId) => {
            const waiting = await this.queue.getWaiting();
            if (waiting.length > 100) {
                logger.warn('⚠️ Fila de conversão com alta demanda', {
                    queueLength: waiting.length,
                    activeJobs: (await this.queue.getActive()).length
                });
            }
        });
    }

    /**
     * Processar job de conversão
     */
    async processConversion(job) {
        const { fileId, originalName, uploadPath, userId, orderId } = job.data;
        
        logger.info('🔄 Iniciando conversão', {
            jobId: job.id,
            fileId: fileId,
            originalName: originalName
        });

        // Atualizar progresso
        await job.progress(10);

        try {
            // 1. Download do arquivo do storage
            const tempDir = path.join(__dirname, '../../temp');
            await fs.mkdir(tempDir, { recursive: true });
            
            const inputFile = path.join(tempDir, `${fileId}.mpp`);
            const outputFile = path.join(tempDir, `${fileId}.xml`);
            
            await this.storage.downloadFile(uploadPath, inputFile);
            await job.progress(25);

            // 2. Validação do arquivo
            const fileStats = await fs.stat(inputFile);
            if (fileStats.size === 0) {
                throw new Error('Arquivo de entrada vazio');
            }

            // 3. Verificar magic header para segurança
            const fileHeader = await this.readFileHeader(inputFile);
            if (!this.isValidMppFile(fileHeader)) {
                throw new Error('Arquivo não é um MPP válido');
            }
            await job.progress(40);

            // 4. Executar conversão em processo isolado
            const conversionResult = await this.runConversionInIsolation({
                inputFile,
                outputFile,
                originalName,
                maxTime: this.maxJobTime
            });
            
            await job.progress(70);

            // 5. Validar output
            const outputStats = await fs.stat(outputFile);
            if (outputStats.size === 0) {
                throw new Error('Conversão gerou arquivo XML vazio');
            }

            // 6. Upload do resultado
            const outputPath = `converted/${fileId}.xml`;
            await this.storage.uploadFile(outputFile, outputPath);
            await job.progress(90);

            // 7. Gerar URL de download com expiração
            const downloadUrl = await this.storage.generateDownloadUrl(outputPath, 3600); // 1 hora

            // 8. Limpeza de arquivos temporários
            await this.cleanupTempFiles([inputFile, outputFile]);
            await job.progress(100);

            // 9. Atualizar ordem no banco
            await this.updateOrderStatus(orderId, 'completed', {
                downloadUrl,
                fileSize: outputStats.size,
                completedAt: new Date()
            });

            logger.audit('CONVERSION_COMPLETED', {
                jobId: job.id,
                fileId: fileId,
                orderId: orderId,
                inputSize: fileStats.size,
                outputSize: outputStats.size,
                duration: Date.now() - job.timestamp
            });

            return {
                success: true,
                fileId: fileId,
                downloadUrl: downloadUrl,
                outputSize: outputStats.size,
                processingTime: Date.now() - job.timestamp
            };

        } catch (error) {
            logger.error('💥 Erro na conversão', {
                jobId: job.id,
                fileId: fileId,
                error: error.message,
                stack: error.stack
            });

            // Atualizar ordem como falha
            await this.updateOrderStatus(orderId, 'failed', {
                error: error.message,
                failedAt: new Date()
            });

            // Limpeza em caso de erro
            await this.cleanupTempFiles([
                path.join(__dirname, '../../temp', `${fileId}.mpp`),
                path.join(__dirname, '../../temp', `${fileId}.xml`)
            ]);

            throw error;
        }
    }

    /**
     * Executar conversão em processo isolado para segurança
     */
    async runConversionInIsolation({ inputFile, outputFile, originalName, maxTime }) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                worker.terminate();
                reject(new Error('Conversão excedeu tempo limite'));
            }, maxTime);

            const worker = new Worker(__filename, {
                workerData: {
                    task: 'convert',
                    inputFile,
                    outputFile,
                    originalName
                }
            });

            worker.on('message', (result) => {
                clearTimeout(timeout);
                if (result.error) {
                    reject(new Error(result.error));
                } else {
                    resolve(result);
                }
            });

            worker.on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });

            worker.on('exit', (code) => {
                clearTimeout(timeout);
                if (code !== 0) {
                    reject(new Error(`Worker parou com código ${code}`));
                }
            });
        });
    }

    /**
     * Ler header do arquivo para validação
     */
    async readFileHeader(filePath) {
        const file = await fs.open(filePath, 'r');
        const buffer = Buffer.alloc(4);
        await file.read(buffer, 0, 4, 0);
        await file.close();
        return buffer;
    }

    /**
     * Validar se é arquivo MPP genuíno
     */
    isValidMppFile(header) {
        // MPP files são baseados em formato ZIP
        const zipSignatures = [
            Buffer.from([0x50, 0x4B, 0x03, 0x04]), // ZIP local file header
            Buffer.from([0x50, 0x4B, 0x05, 0x06]), // ZIP central directory
            Buffer.from([0x50, 0x4B, 0x07, 0x08])  // ZIP data descriptor
        ];

        return zipSignatures.some(sig => header.equals(sig));
    }

    /**
     * Limpeza de arquivos temporários
     */
    async cleanupTempFiles(files) {
        const cleanupPromises = files.map(async (file) => {
            try {
                await fs.unlink(file);
                logger.debug('🗑️ Arquivo temporário removido', { file });
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    logger.warn('⚠️ Falha ao remover arquivo temporário', {
                        file,
                        error: error.message
                    });
                }
            }
        });

        await Promise.all(cleanupPromises);
    }

    /**
     * Atualizar status da ordem no banco
     */
    async updateOrderStatus(orderId, status, data = {}) {
        // Implementar update no banco de dados
        // Placeholder - integrar com seu banco de dados
        logger.info('📝 Status da ordem atualizado', {
            orderId,
            status,
            data
        });
    }

    /**
     * Shutdown graceful
     */
    async shutdown() {
        logger.info('🛑 Iniciando shutdown do worker...');
        await this.queue.close();
        logger.info('✅ Worker finalizado');
    }
}

// Worker thread para conversão isolada
if (!isMainThread) {
    const { workerData } = require('worker_threads');
    
    if (workerData.task === 'convert') {
        const { inputFile, outputFile, originalName } = workerData;
        
        try {
            // Implementar conversão real aqui
            // Por enquanto, placeholder que cria XML básico
            const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Project>
    <Name>${originalName}</Name>
    <ConvertedAt>${new Date().toISOString()}</ConvertedAt>
    <Status>Converted</Status>
    <!-- Conteúdo real da conversão MPP seria inserido aqui -->
</Project>`;

            require('fs').writeFileSync(outputFile, xmlContent, 'utf8');
            
            parentPort.postMessage({
                success: true,
                outputSize: Buffer.byteLength(xmlContent, 'utf8')
            });
        } catch (error) {
            parentPort.postMessage({
                error: error.message
            });
        }
    }
    process.exit(0);
}

// Instanciar e iniciar worker
const worker = new ConversionWorker();

// Graceful shutdown
process.on('SIGTERM', async () => {
    await worker.shutdown();
    process.exit(0);
});

process.on('SIGINT', async () => {
    await worker.shutdown();
    process.exit(0);
});

module.exports = ConversionWorker;