const { Worker } = require('bullmq');
const Redis = require('ioredis');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

const converter = require('../converters/mppToXml');
const uploadUtils = require('../api/upload-utils');

// Configuração do Redis
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    lazyConnect: true
});

class FileConversionWorker {
    constructor() {
        this.setupDirectories();
        this.createWorker();
    }

    /**
     * Configura diretórios necessários
     */
    async setupDirectories() {
        const dirs = [
            'uploads/incoming',
            'uploads/processing', 
            'uploads/converted',
            'uploads/quarantine'
        ];

        for (const dir of dirs) {
            await uploadUtils.ensureDirectory(dir);
        }
        
        console.log('📁 Diretórios de upload configurados');
    }

    /**
     * Cria o worker
     */
    createWorker() {
        this.worker = new Worker('file-conversion', this.processJob.bind(this), {
            connection: redisConnection,
            concurrency: 2, // Processar até 2 jobs simultaneamente
            removeOnComplete: 10,
            removeOnFail: 20
        });

        this.setupEventHandlers();
        console.log('🔧 Worker de conversão iniciado');
    }

    /**
     * Processa job de conversão
     * @param {object} job - Job do BullMQ
     */
    async processJob(job) {
        const { filename, originalName } = job.data;
        
        try {
            console.log(`🔄 Processando job ${job.id}: ${filename}`);
            
            // Atualizar progresso
            await job.updateProgress(10);
            
            // Caminhos dos arquivos
            const incomingPath = path.join('uploads/incoming', filename);
            const processingPath = path.join('uploads/processing', filename);
            const convertedPath = path.join('uploads/converted', filename.replace('.mpp', '.xml'));
            
            // Verificar se arquivo existe em incoming
            const fileExists = await this.fileExists(incomingPath);
            if (!fileExists) {
                throw new Error(`Arquivo não encontrado em incoming: ${filename}`);
            }

            await job.updateProgress(20);

            // Mover para processing
            await fs.rename(incomingPath, processingPath);
            console.log(`📂 Arquivo movido para processing: ${filename}`);
            
            await job.updateProgress(40);

            // Converter arquivo
            console.log(`🔄 Iniciando conversão: ${filename}`);
            const conversionResult = await converter.convertMPPtoXML(processingPath, convertedPath);
            
            await job.updateProgress(80);

            // Remover arquivo de processing
            await fs.unlink(processingPath);
            console.log(`🗑️ Arquivo removido de processing: ${filename}`);

            await job.updateProgress(100);

            const result = {
                success: true,
                originalFile: filename,
                convertedFile: path.basename(convertedPath),
                originalName: originalName,
                conversionResult,
                completedAt: new Date().toISOString()
            };

            console.log(`✅ Job ${job.id} concluído: ${filename} → ${path.basename(convertedPath)}`);
            return result;

        } catch (error) {
            console.error(`❌ Erro no job ${job.id}:`, error);
            
            // Mover arquivo para quarentena em caso de erro
            await this.quarantineFile(filename);
            
            throw error;
        }
    }

    /**
     * Move arquivo para quarentena
     * @param {string} filename 
     */
    async quarantineFile(filename) {
        try {
            const processingPath = path.join('uploads/processing', filename);
            const quarantinePath = path.join('uploads/quarantine', filename);
            
            const exists = await this.fileExists(processingPath);
            if (exists) {
                await fs.rename(processingPath, quarantinePath);
                console.log(`🚨 Arquivo movido para quarentena: ${filename}`);
            }
        } catch (error) {
            console.error('❌ Erro ao mover para quarentena:', error);
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
     * Configura handlers de eventos
     */
    setupEventHandlers() {
        this.worker.on('completed', (job) => {
            console.log(`✅ Worker: Job ${job.id} completado`);
        });

        this.worker.on('failed', (job, err) => {
            console.error(`❌ Worker: Job ${job?.id} falhou:`, err.message);
        });

        this.worker.on('progress', (job, progress) => {
            console.log(`📊 Worker: Job ${job.id} progresso: ${progress}%`);
        });

        this.worker.on('error', (err) => {
            console.error('❌ Worker error:', err);
        });

        this.worker.on('ready', () => {
            console.log('🟢 Worker pronto para processar jobs');
        });
    }

    /**
     * Para o worker graciosamente
     */
    async stop() {
        console.log('⏹️ Parando worker...');
        await this.worker.close();
        console.log('✅ Worker parado');
    }
}

// Inicializar worker se arquivo for executado diretamente
if (require.main === module) {
    console.log('🚀 Iniciando File Conversion Worker...');
    
    const worker = new FileConversionWorker();
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n📋 Sinal de interrupção recebido');
        await worker.stop();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('\n📋 Sinal de término recebido');
        await worker.stop();
        process.exit(0);
    });
}

module.exports = FileConversionWorker;