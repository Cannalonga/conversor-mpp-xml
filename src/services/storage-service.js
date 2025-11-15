/**
 * Storage Service - Integração com MinIO (S3-compatible)
 * Gerenciamento de arquivos escalável com policies de retenção
 */

const { Client } = require('minio');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/secure-logger');

class StorageService {
    constructor() {
        this.client = new Client({
            endPoint: process.env.MINIO_ENDPOINT || 'localhost',
            port: parseInt(process.env.MINIO_PORT) || 9000,
            useSSL: process.env.MINIO_USE_SSL === 'true',
            accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
            secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123'
        });

        this.buckets = {
            uploads: process.env.MINIO_BUCKET_UPLOADS || 'conversor-uploads',
            converted: process.env.MINIO_BUCKET_CONVERTED || 'conversor-converted',
            temp: process.env.MINIO_BUCKET_TEMP || 'conversor-temp',
            archive: process.env.MINIO_BUCKET_ARCHIVE || 'conversor-archive'
        };

        this.retentionPolicies = {
            uploads: 7 * 24 * 60 * 60, // 7 dias
            converted: 30 * 24 * 60 * 60, // 30 dias  
            temp: 1 * 24 * 60 * 60, // 1 dia
            archive: 365 * 24 * 60 * 60 // 1 ano
        };

        this.init();
    }

    async init() {
        try {
            // Verificar conexão
            await this.client.listBuckets();
            
            // Criar buckets se não existirem
            await this.ensureBuckets();
            
            // Configurar lifecycle policies
            await this.configureBucketPolicies();
            
            logger.info('💾 Storage Service inicializado', {
                endpoint: process.env.MINIO_ENDPOINT,
                buckets: Object.keys(this.buckets)
            });
        } catch (error) {
            logger.error('❌ Falha ao inicializar Storage Service', {
                error: error.message
            });
            throw error;
        }
    }

    async ensureBuckets() {
        for (const [name, bucket] of Object.entries(this.buckets)) {
            const exists = await this.client.bucketExists(bucket);
            if (!exists) {
                await this.client.makeBucket(bucket);
                logger.info(`🪣 Bucket criado: ${bucket}`);
            }
        }
    }

    async configureBucketPolicies() {
        // Configurar políticas de lifecycle para cleanup automático
        for (const [type, bucket] of Object.entries(this.buckets)) {
            if (this.retentionPolicies[type]) {
                const policy = {
                    Rules: [{
                        ID: `${type}-cleanup`,
                        Status: 'Enabled',
                        Expiration: {
                            Days: Math.ceil(this.retentionPolicies[type] / (24 * 60 * 60))
                        }
                    }]
                };

                try {
                    await this.client.setBucketLifecycle(bucket, JSON.stringify(policy));
                    logger.info(`📋 Policy configurada para ${bucket}`, {
                        retentionDays: Math.ceil(this.retentionPolicies[type] / (24 * 60 * 60))
                    });
                } catch (error) {
                    logger.warn(`⚠️ Falha ao configurar policy para ${bucket}`, {
                        error: error.message
                    });
                }
            }
        }
    }

    /**
     * Upload de arquivo com validação e metadata
     */
    async uploadFile(localPath, objectName, bucketType = 'uploads', metadata = {}) {
        const bucket = this.buckets[bucketType];
        
        try {
            // Validar arquivo local
            const stats = await fs.stat(localPath);
            if (stats.size === 0) {
                throw new Error('Arquivo vazio não pode ser enviado');
            }

            // Calcular hash para integridade
            const fileHash = await this.calculateFileHash(localPath);
            
            // Metadata padrão
            const fullMetadata = {
                'Content-Type': this.getContentType(objectName),
                'Upload-Time': new Date().toISOString(),
                'File-Hash': fileHash,
                'Original-Size': stats.size.toString(),
                ...metadata
            };

            // Upload com stream
            await this.client.fPutObject(bucket, objectName, localPath, fullMetadata);
            
            logger.audit('FILE_UPLOADED', {
                bucket: bucket,
                objectName: objectName,
                size: stats.size,
                hash: fileHash
            });

            return {
                bucket: bucket,
                objectName: objectName,
                size: stats.size,
                hash: fileHash,
                url: await this.generateDownloadUrl(objectName, 3600, bucketType)
            };

        } catch (error) {
            logger.error('❌ Erro no upload', {
                localPath,
                objectName,
                bucket,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Download de arquivo
     */
    async downloadFile(objectName, localPath, bucketType = 'uploads') {
        const bucket = this.buckets[bucketType];
        
        try {
            // Verificar se objeto existe
            await this.client.statObject(bucket, objectName);
            
            // Download
            await this.client.fGetObject(bucket, objectName, localPath);
            
            // Validar integridade se hash disponível
            const objInfo = await this.client.statObject(bucket, objectName);
            if (objInfo.metaData && objInfo.metaData['file-hash']) {
                const downloadHash = await this.calculateFileHash(localPath);
                if (downloadHash !== objInfo.metaData['file-hash']) {
                    throw new Error('Integridade do arquivo comprometida');
                }
            }

            logger.info('⬇️ Arquivo baixado', {
                bucket,
                objectName,
                localPath
            });

            return localPath;

        } catch (error) {
            logger.error('❌ Erro no download', {
                bucket,
                objectName,
                localPath,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Gerar URL de download temporário
     */
    async generateDownloadUrl(objectName, expiry = 3600, bucketType = 'converted') {
        const bucket = this.buckets[bucketType];
        
        try {
            const url = await this.client.presignedGetObject(bucket, objectName, expiry);
            
            logger.info('🔗 URL de download gerada', {
                bucket,
                objectName,
                expiry
            });

            return url;

        } catch (error) {
            logger.error('❌ Erro ao gerar URL', {
                bucket,
                objectName,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Upload direto via stream (para arquivos grandes)
     */
    async uploadStream(stream, objectName, size, bucketType = 'uploads', metadata = {}) {
        const bucket = this.buckets[bucketType];
        
        try {
            const fullMetadata = {
                'Content-Type': this.getContentType(objectName),
                'Upload-Time': new Date().toISOString(),
                'Stream-Upload': 'true',
                'Expected-Size': size.toString(),
                ...metadata
            };

            await this.client.putObject(bucket, objectName, stream, size, fullMetadata);
            
            logger.audit('STREAM_UPLOADED', {
                bucket,
                objectName,
                size
            });

            return {
                bucket,
                objectName,
                size,
                url: await this.generateDownloadUrl(objectName, 3600, bucketType)
            };

        } catch (error) {
            logger.error('❌ Erro no upload por stream', {
                bucket,
                objectName,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Mover arquivo entre buckets
     */
    async moveFile(objectName, fromBucket, toBucket) {
        try {
            const fromBucketName = this.buckets[fromBucket];
            const toBucketName = this.buckets[toBucket];

            // Copiar para novo bucket
            await this.client.copyObject(
                toBucketName,
                objectName,
                `/${fromBucketName}/${objectName}`
            );

            // Remover do bucket original
            await this.client.removeObject(fromBucketName, objectName);

            logger.info('📋 Arquivo movido', {
                objectName,
                from: fromBucketName,
                to: toBucketName
            });

        } catch (error) {
            logger.error('❌ Erro ao mover arquivo', {
                objectName,
                fromBucket,
                toBucket,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Limpar arquivos expirados
     */
    async cleanupExpiredFiles(bucketType, olderThanHours = 24) {
        const bucket = this.buckets[bucketType];
        const cutoffTime = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000));
        
        try {
            const objectsList = [];
            const stream = this.client.listObjectsV2(bucket, '', true);

            for await (const obj of stream) {
                if (obj.lastModified < cutoffTime) {
                    objectsList.push(obj.name);
                }
            }

            if (objectsList.length > 0) {
                await this.client.removeObjects(bucket, objectsList);
                logger.info('🧹 Limpeza de arquivos expirados', {
                    bucket,
                    filesRemoved: objectsList.length,
                    olderThanHours
                });
            }

        } catch (error) {
            logger.error('❌ Erro na limpeza', {
                bucket,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Obter estatísticas de uso do storage
     */
    async getStorageStats() {
        const stats = {};
        
        for (const [type, bucket] of Object.entries(this.buckets)) {
            try {
                let totalSize = 0;
                let objectCount = 0;
                
                const stream = this.client.listObjectsV2(bucket, '', true);
                for await (const obj of stream) {
                    totalSize += obj.size;
                    objectCount++;
                }

                stats[type] = {
                    bucket: bucket,
                    objectCount: objectCount,
                    totalSize: totalSize,
                    totalSizeHuman: this.formatBytes(totalSize)
                };

            } catch (error) {
                stats[type] = { error: error.message };
            }
        }

        return stats;
    }

    /**
     * Calcular hash do arquivo
     */
    async calculateFileHash(filePath) {
        const fileBuffer = await fs.readFile(filePath);
        return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    }

    /**
     * Determinar Content-Type baseado na extensão
     */
    getContentType(filename) {
        const ext = path.extname(filename).toLowerCase();
        const contentTypes = {
            '.mpp': 'application/vnd.ms-project',
            '.xml': 'application/xml',
            '.json': 'application/json',
            '.pdf': 'application/pdf',
            '.zip': 'application/zip'
        };
        return contentTypes[ext] || 'application/octet-stream';
    }

    /**
     * Formatar bytes em formato legível
     */
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
}

module.exports = StorageService;