/**
 * 💾 STORAGE ADAPTER
 * 
 * Abstração para diferentes backends de storage:
 * - Local filesystem (padrão)
 * - AWS S3
 * - Google Cloud Storage
 * - Azure Blob Storage
 * 
 * Uso:
 *   const storage = require('./storage-adapter').getStorage();
 *   await storage.save('path/to/file', buffer);
 *   const data = await storage.load('path/to/file');
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * Interface base para Storage
 */
class StorageAdapter {
    constructor(options = {}) {
        this.options = options;
        this.basePath = options.basePath || './uploads';
    }

    async save(filePath, data, options = {}) {
        throw new Error('Not implemented');
    }

    async load(filePath) {
        throw new Error('Not implemented');
    }

    async delete(filePath) {
        throw new Error('Not implemented');
    }

    async exists(filePath) {
        throw new Error('Not implemented');
    }

    async list(prefix = '') {
        throw new Error('Not implemented');
    }

    async getUrl(filePath, expiry = 3600) {
        throw new Error('Not implemented');
    }

    async getMetadata(filePath) {
        throw new Error('Not implemented');
    }
}

/**
 * Local Filesystem Storage
 */
class LocalStorage extends StorageAdapter {
    constructor(options = {}) {
        super(options);
        this.type = 'local';
    }

    _getFullPath(filePath) {
        return path.join(this.basePath, filePath);
    }

    async save(filePath, data, options = {}) {
        const fullPath = this._getFullPath(filePath);
        const dir = path.dirname(fullPath);
        
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(fullPath, data);
        
        const stats = await fs.stat(fullPath);
        
        return {
            path: filePath,
            fullPath,
            size: stats.size,
            checksum: this._calculateChecksum(data),
            timestamp: new Date().toISOString()
        };
    }

    async load(filePath) {
        const fullPath = this._getFullPath(filePath);
        return fs.readFile(fullPath);
    }

    async delete(filePath) {
        const fullPath = this._getFullPath(filePath);
        await fs.unlink(fullPath);
        return { deleted: true, path: filePath };
    }

    async exists(filePath) {
        const fullPath = this._getFullPath(filePath);
        try {
            await fs.access(fullPath);
            return true;
        } catch {
            return false;
        }
    }

    async list(prefix = '') {
        const fullPath = this._getFullPath(prefix);
        const files = [];
        
        try {
            const entries = await fs.readdir(fullPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const entryPath = path.join(prefix, entry.name);
                
                if (entry.isDirectory()) {
                    const subFiles = await this.list(entryPath);
                    files.push(...subFiles);
                } else {
                    const stats = await fs.stat(path.join(fullPath, entry.name));
                    files.push({
                        path: entryPath,
                        name: entry.name,
                        size: stats.size,
                        modified: stats.mtime
                    });
                }
            }
        } catch (error) {
            // Directory doesn't exist
        }
        
        return files;
    }

    async getUrl(filePath, expiry = 3600) {
        // Para local, retorna path relativo
        return `file://${this._getFullPath(filePath)}`;
    }

    async getMetadata(filePath) {
        const fullPath = this._getFullPath(filePath);
        const stats = await fs.stat(fullPath);
        
        return {
            path: filePath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory()
        };
    }

    _calculateChecksum(data) {
        return crypto.createHash('md5').update(data).digest('hex');
    }

    async move(sourcePath, destPath) {
        const sourceFullPath = this._getFullPath(sourcePath);
        const destFullPath = this._getFullPath(destPath);
        
        await fs.mkdir(path.dirname(destFullPath), { recursive: true });
        await fs.rename(sourceFullPath, destFullPath);
        
        return { moved: true, from: sourcePath, to: destPath };
    }

    async copy(sourcePath, destPath) {
        const sourceFullPath = this._getFullPath(sourcePath);
        const destFullPath = this._getFullPath(destPath);
        
        await fs.mkdir(path.dirname(destFullPath), { recursive: true });
        await fs.copyFile(sourceFullPath, destFullPath);
        
        return { copied: true, from: sourcePath, to: destPath };
    }

    async createStream(filePath, mode = 'read') {
        const fullPath = this._getFullPath(filePath);
        const fsSync = require('fs');
        
        if (mode === 'read') {
            return fsSync.createReadStream(fullPath);
        } else {
            await fs.mkdir(path.dirname(fullPath), { recursive: true });
            return fsSync.createWriteStream(fullPath);
        }
    }

    getInfo() {
        return {
            type: this.type,
            basePath: this.basePath
        };
    }
}

/**
 * AWS S3 Storage (stub - requer aws-sdk)
 */
class S3Storage extends StorageAdapter {
    constructor(options = {}) {
        super(options);
        this.type = 's3';
        this.bucket = options.bucket;
        this.region = options.region || 'us-east-1';
        this.client = null;
    }

    async _getClient() {
        if (!this.client) {
            try {
                const { S3Client } = await import('@aws-sdk/client-s3');
                this.client = new S3Client({
                    region: this.region,
                    credentials: this.options.credentials
                });
            } catch (error) {
                throw new Error('AWS SDK not installed. Run: npm install @aws-sdk/client-s3');
            }
        }
        return this.client;
    }

    async save(filePath, data, options = {}) {
        const { PutObjectCommand } = await import('@aws-sdk/client-s3');
        const client = await this._getClient();
        
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: filePath,
            Body: data,
            ContentType: options.contentType
        });
        
        await client.send(command);
        
        return {
            path: filePath,
            bucket: this.bucket,
            url: `s3://${this.bucket}/${filePath}`,
            timestamp: new Date().toISOString()
        };
    }

    async load(filePath) {
        const { GetObjectCommand } = await import('@aws-sdk/client-s3');
        const client = await this._getClient();
        
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: filePath
        });
        
        const response = await client.send(command);
        return Buffer.from(await response.Body.transformToByteArray());
    }

    async delete(filePath) {
        const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
        const client = await this._getClient();
        
        const command = new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: filePath
        });
        
        await client.send(command);
        return { deleted: true, path: filePath };
    }

    async exists(filePath) {
        const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
        const client = await this._getClient();
        
        try {
            const command = new HeadObjectCommand({
                Bucket: this.bucket,
                Key: filePath
            });
            await client.send(command);
            return true;
        } catch {
            return false;
        }
    }

    async getUrl(filePath, expiry = 3600) {
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
        const { GetObjectCommand } = await import('@aws-sdk/client-s3');
        const client = await this._getClient();
        
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: filePath
        });
        
        return getSignedUrl(client, command, { expiresIn: expiry });
    }

    getInfo() {
        return {
            type: this.type,
            bucket: this.bucket,
            region: this.region
        };
    }
}

/**
 * Factory para criar storage baseado em configuração
 */
function createStorage(config = {}) {
    const type = config.type || process.env.STORAGE_TYPE || 'local';
    
    switch (type) {
        case 's3':
        case 'aws':
            return new S3Storage({
                bucket: config.bucket || process.env.AWS_S3_BUCKET,
                region: config.region || process.env.AWS_REGION,
                credentials: config.credentials
            });
        
        case 'local':
        default:
            return new LocalStorage({
                basePath: config.basePath || process.env.STORAGE_PATH || './uploads'
            });
    }
}

// Singleton instance
let defaultStorage = null;

function getStorage(config = {}) {
    if (!defaultStorage) {
        defaultStorage = createStorage(config);
    }
    return defaultStorage;
}

module.exports = {
    StorageAdapter,
    LocalStorage,
    S3Storage,
    createStorage,
    getStorage
};
