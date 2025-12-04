/**
 * 🛠️ CONVERTER UTILITIES
 * 
 * Funções utilitárias compartilhadas para todos os conversores.
 * Use estas funções para garantir consistência e segurança.
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { spawn, spawnSync, exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Encontra o caminho de uma ferramenta (cross-platform, síncrono)
 * @param {string} tool - Nome da ferramenta
 * @returns {string|null} - Caminho ou null se não encontrada
 */
function whichSync(tool) {
    try {
        if (process.platform === 'win32') {
            const r = spawnSync('where', [tool], { encoding: 'utf8', windowsHide: true });
            if (r.status === 0 && r.stdout) return r.stdout.split(/\r?\n/)[0].trim();
            return null;
        } else {
            const r = spawnSync('which', [tool], { encoding: 'utf8' });
            if (r.status === 0 && r.stdout) return r.stdout.split(/\r?\n/)[0].trim();
            return null;
        }
    } catch (e) {
        return null;
    }
}

/**
 * Verifica múltiplas dependências de uma vez (cross-platform)
 * @param {string|string[]} list - Lista de ferramentas a verificar
 * @returns {{ present: Array<{tool: string, path: string}>, missing: string[] }}
 * 
 * @example
 * const { present, missing } = checkDependenciesSync(['ffmpeg', 'pdftoppm']);
 * if (missing.length > 0) console.log('Missing:', missing);
 */
function checkDependenciesSync(list) {
    if (!Array.isArray(list)) list = [list];
    const present = [];
    const missing = [];
    for (const tool of list) {
        const p = whichSync(tool);
        if (p) present.push({ tool, path: p });
        else missing.push(tool);
    }
    return { present, missing };
}

/**
 * Cria diretório de forma síncrona se não existir
 * @param {string} dir - Caminho do diretório
 */
function ensureDirSync(dir) {
    if (!fsSync.existsSync(dir)) {
        fsSync.mkdirSync(dir, { recursive: true });
    }
}

/**
 * Verifica se um arquivo existe
 * @param {string} filePath - Caminho do arquivo
 * @returns {Promise<boolean>}
 */
async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

/**
 * Cria diretório de saída se não existir
 * @param {string} outputPath - Caminho do arquivo de saída
 * @returns {Promise<string>} - Diretório criado
 */
async function ensureOutputDir(outputPath) {
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });
    return dir;
}

/**
 * Obtém informações do arquivo
 * @param {string} filePath - Caminho do arquivo
 * @returns {Promise<object>}
 */
async function getFileInfo(filePath) {
    const stats = await fs.stat(filePath);
    return {
        size: stats.size,
        sizeHuman: formatBytes(stats.size),
        created: stats.birthtime,
        modified: stats.mtime,
        extension: path.extname(filePath).toLowerCase(),
        basename: path.basename(filePath),
        dirname: path.dirname(filePath)
    };
}

/**
 * Formata bytes em formato legível
 * @param {number} bytes 
 * @returns {string}
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Verifica se uma ferramenta externa está instalada
 * @param {string} tool - Nome da ferramenta (ex: 'ffmpeg', 'convert')
 * @returns {Promise<{installed: boolean, version?: string, path?: string}>}
 */
async function checkToolInstalled(tool) {
    const commands = {
        win32: `where ${tool}`,
        default: `which ${tool}`
    };
    
    const cmd = commands[process.platform] || commands.default;
    
    try {
        const { stdout } = await execAsync(cmd);
        const toolPath = stdout.trim().split('\n')[0];
        
        // Tentar obter versão
        let version = null;
        try {
            const versionCmd = `${tool} --version`;
            const { stdout: vOut } = await execAsync(versionCmd);
            version = vOut.split('\n')[0].trim();
        } catch {
            // Algumas ferramentas não suportam --version
        }
        
        return { installed: true, path: toolPath, version };
    } catch {
        return { installed: false };
    }
}

/**
 * Executa um comando externo com timeout
 * @param {string} command - Comando a executar
 * @param {string[]} args - Argumentos
 * @param {object} options - Opções
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number}>}
 */
async function executeCommand(command, args = [], options = {}) {
    const {
        timeout = 60000,
        cwd = process.cwd(),
        env = process.env
    } = options;

    return new Promise((resolve, reject) => {
        let stdout = '';
        let stderr = '';
        let killed = false;

        const proc = spawn(command, args, {
            cwd,
            env,
            shell: process.platform === 'win32'
        });

        const timer = setTimeout(() => {
            killed = true;
            proc.kill('SIGTERM');
            reject(new Error(`Command timed out after ${timeout}ms`));
        }, timeout);

        proc.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        proc.on('close', (code) => {
            clearTimeout(timer);
            if (!killed) {
                resolve({ stdout, stderr, exitCode: code });
            }
        });

        proc.on('error', (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

/**
 * Valida arquivo de entrada
 * @param {string} inputPath - Caminho do arquivo
 * @param {string[]} allowedExtensions - Extensões permitidas
 * @returns {Promise<{valid: boolean, error?: string, info?: object}>}
 */
async function validateInput(inputPath, allowedExtensions = []) {
    // Verificar existência
    if (!(await fileExists(inputPath))) {
        return { valid: false, error: `Input file not found: ${inputPath}` };
    }

    // Verificar extensão
    const ext = path.extname(inputPath).toLowerCase();
    if (allowedExtensions.length > 0 && !allowedExtensions.includes(ext)) {
        return {
            valid: false,
            error: `Invalid file extension: ${ext}. Allowed: ${allowedExtensions.join(', ')}`
        };
    }

    // Obter info do arquivo
    const info = await getFileInfo(inputPath);

    // Verificar se não está vazio
    if (info.size === 0) {
        return { valid: false, error: 'Input file is empty' };
    }

    return { valid: true, info };
}

/**
 * Cria arquivo placeholder para dry-run mode
 * @param {string} outputPath - Caminho do arquivo de saída
 * @param {object} metadata - Metadados para incluir
 * @returns {Promise<void>}
 */
async function createDryRunOutput(outputPath, metadata = {}) {
    await ensureOutputDir(outputPath);
    
    const content = JSON.stringify({
        dryRun: true,
        timestamp: new Date().toISOString(),
        outputPath,
        metadata,
        message: 'This is a dry-run placeholder file. Real conversion was skipped.'
    }, null, 2);
    
    await fs.writeFile(outputPath, content, 'utf8');
}

/**
 * Logger estruturado para conversores
 */
const logger = {
    info: (converter, message, data = {}) => {
        console.log(JSON.stringify({
            level: 'info',
            converter,
            message,
            ...data,
            timestamp: new Date().toISOString()
        }));
    },
    
    warn: (converter, message, data = {}) => {
        console.warn(JSON.stringify({
            level: 'warn',
            converter,
            message,
            ...data,
            timestamp: new Date().toISOString()
        }));
    },
    
    error: (converter, message, error, data = {}) => {
        console.error(JSON.stringify({
            level: 'error',
            converter,
            message,
            error: error?.message || error,
            stack: error?.stack,
            ...data,
            timestamp: new Date().toISOString()
        }));
    },
    
    debug: (converter, message, data = {}) => {
        if (process.env.DEBUG || process.env.LOG_LEVEL === 'debug') {
            console.log(JSON.stringify({
                level: 'debug',
                converter,
                message,
                ...data,
                timestamp: new Date().toISOString()
            }));
        }
    }
};

/**
 * Mede o tempo de execução de uma função async
 * @param {Function} fn - Função a medir
 * @returns {Promise<{result: any, duration: number}>}
 */
async function measureTime(fn) {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    return { result, duration };
}

/**
 * Limpa arquivos temporários
 * @param {string[]} paths - Caminhos dos arquivos a remover
 */
async function cleanupTempFiles(paths) {
    for (const p of paths) {
        try {
            await fs.unlink(p);
        } catch {
            // Ignorar erros de limpeza
        }
    }
}

module.exports = {
    // Novas funções cross-platform
    whichSync,
    checkDependenciesSync,
    ensureDirSync,
    // Funções existentes
    fileExists,
    ensureOutputDir,
    getFileInfo,
    formatBytes,
    checkToolInstalled,
    executeCommand,
    validateInput,
    createDryRunOutput,
    logger,
    measureTime,
    cleanupTempFiles
};
