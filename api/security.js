/**
 * Módulo de Segurança Avançada - MPP Converter
 * Proteção total de credenciais e dados sensíveis
 */

const crypto = require('crypto');

// Configurações de segurança ultra-robustas
const SECURITY_CONFIG = {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    tagLength: 16,
    iterations: 100000,
    hashAlgorithm: 'sha512',
    saltLength: 32
};

/**
 * Gerar hash super seguro de senha com salt
 */
function hashPassword(password, salt = null) {
    if (!salt) {
        salt = crypto.randomBytes(SECURITY_CONFIG.saltLength).toString('hex');
    }
    
    const hash = crypto.pbkdf2Sync(
        password, 
        salt, 
        SECURITY_CONFIG.iterations, 
        64, 
        SECURITY_CONFIG.hashAlgorithm
    ).toString('hex');
    
    return { hash, salt };
}

/**
 * Verificar senha com timing-safe comparison
 */
function verifyPassword(password, hash, salt) {
    const { hash: computedHash } = hashPassword(password, salt);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'));
}

/**
 * Criptografar dados ultra-sensíveis
 */
function encryptSensitiveData(data, masterKey) {
    const iv = crypto.randomBytes(SECURITY_CONFIG.ivLength);
    const cipher = crypto.createCipherGCM(SECURITY_CONFIG.algorithm, Buffer.from(masterKey, 'hex'));
    cipher.setAAD(Buffer.from('mpp-converter-auth'));
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
    };
}

/**
 * Descriptografar dados sensíveis
 */
function decryptSensitiveData(encryptedData, masterKey) {
    try {
        const { encrypted, iv, tag } = encryptedData;
        const decipher = crypto.createDecipherGCM(
            SECURITY_CONFIG.algorithm, 
            Buffer.from(masterKey, 'hex')
        );
        decipher.setAAD(Buffer.from('mpp-converter-auth'));
        decipher.setAuthTag(Buffer.from(tag, 'hex'));
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('❌ TENTATIVA DE DESCRIPTOGRAFIA NÃO AUTORIZADA');
        return null;
    }
}

// Helmet com configurações rigorosas de segurança
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: "same-origin" }
}));

// CORS restritivo
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:3000',
            'https://seu-dominio.com',
            // Adicionar domínios permitidos em produção
        ];
        
        // Permitir requisições sem origin (mobile apps, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Não permitido pelo CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting diferenciado por rota
const generalLimiter = rateLimit(securityConfig.rateLimits.general);
const uploadLimiter = rateLimit({
    ...securityConfig.rateLimits.upload,
    message: 'Muitos uploads. Tente novamente em 5 minutos.',
    standardHeaders: true,
    legacyHeaders: false,
});
const paymentLimiter = rateLimit({
    ...securityConfig.rateLimits.payment,
    message: 'Muitas tentativas de pagamento. Tente novamente em 10 minutos.',
});
const adminLimiter = rateLimit({
    ...securityConfig.rateLimits.admin,
    message: 'Muitas tentativas de acesso admin.',
});

// Aplicar rate limiting
app.use('/api', generalLimiter);
app.use('/api/upload', uploadLimiter);
app.use('/api/payment', paymentLimiter);
app.use('/api/admin', adminLimiter);

// Middleware de sanitização de entrada
const sanitizeInput = (req, res, next) => {
    const sanitizeRecursive = (obj) => {
        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                // Sanitizar XSS
                obj[key] = xss(obj[key]);
                // Limitar tamanho de strings
                if (obj[key].length > 1000) {
                    obj[key] = obj[key].substring(0, 1000);
                }
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                sanitizeRecursive(obj[key]);
            }
        }
    };
    
    if (req.body) sanitizeRecursive(req.body);
    if (req.query) sanitizeRecursive(req.query);
    if (req.params) sanitizeRecursive(req.params);
    
    next();
};

app.use(sanitizeInput);

// Middleware de logging de segurança
const securityLogger = (req, res, next) => {
    const clientIP = getClientIP(req);
    const userAgent = req.get('User-Agent') || 'Unknown';
    const timestamp = new Date().toISOString();
    
    // Log de tentativas suspeitas
    const suspiciousPatterns = [
        /\.\./,  // Path traversal
        /<script/i,  // XSS
        /union.*select/i,  // SQL injection
        /javascript:/i,  // JavaScript injection
        /on\w+\s*=/i,  // Event handlers
    ];
    
    const requestData = JSON.stringify({
        url: req.originalUrl,
        body: req.body,
        query: req.query,
        headers: req.headers
    });
    
    const isSuspicious = suspiciousPatterns.some(pattern => 
        pattern.test(requestData)
    );
    
    if (isSuspicious) {
        console.warn(`🚨 TENTATIVA SUSPEITA: ${timestamp} | IP: ${clientIP} | URL: ${req.originalUrl} | UA: ${userAgent}`);
        // Em produção, enviar alerta para sistema de monitoramento
    }
    
    next();
};

app.use(securityLogger);

// Configuração segura do multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Criar diretório seguro se não existir
        const uploadDir = path.join(__dirname, '..', 'uploads');
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Nome de arquivo seguro com hash
        const timestamp = Date.now();
        const random = crypto.randomBytes(6).toString('hex');
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${timestamp}-${random}-${safeName}`);
    }
});

// Validação rigorosa de arquivos
const fileFilter = (req, file, cb) => {
    try {
        const allowedExtensions = ['.mpp'];
        const allowedMimeTypes = [
            'application/octet-stream',
            'application/vnd.ms-project'
        ];
        
        const ext = path.extname(file.originalname).toLowerCase();
        const mimeType = file.mimetype.toLowerCase();
        
        // Verificar extensão
        if (!allowedExtensions.includes(ext)) {
            return cb(new Error('INVALID_FILE_TYPE'));
        }
        
        // Verificar MIME type (dupla validação)
        if (!allowedMimeTypes.includes(mimeType)) {
            return cb(new Error('INVALID_MIME_TYPE'));
        }
        
        // Validar nome do arquivo
        if (file.originalname.length > 255) {
            return cb(new Error('FILENAME_TOO_LONG'));
        }
        
        // Verificar caracteres maliciosos no nome
        const dangerousPatterns = [
            /\.\./,  // Path traversal
            /[<>:"|?*\x00-\x1F]/,  // Caracteres perigosos
            /\.(exe|bat|cmd|scr|pif|vbs|js)$/i  // Executáveis
        ];
        
        if (dangerousPatterns.some(pattern => pattern.test(file.originalname))) {
            return cb(new Error('DANGEROUS_FILENAME'));
        }
        
        cb(null, true);
    } catch (error) {
        cb(new Error('FILE_VALIDATION_ERROR'));
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
        files: 1, // Apenas 1 arquivo por vez
        fields: 5, // Limite de campos
        fieldNameSize: 100, // Limite nome dos campos
        fieldSize: 1024 * 1024 // 1MB por campo
    },
    fileFilter: fileFilter
});

// Middleware de autenticação para admin
const authenticateAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token de acesso necessário' });
        }
        
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, securityConfig.JWT_SECRET);
        
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado' });
        }
        
        req.admin = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
};

// Função para obter IP do cliente de forma segura
function getClientIP(req) {
    const xForwardedFor = req.headers['x-forwarded-for'];
    const xRealIP = req.headers['x-real-ip'];
    const connectionRemoteAddr = req.connection?.remoteAddress;
    const socketRemoteAddr = req.socket?.remoteAddress;
    const connectionSocketRemoteAddr = req.connection?.socket?.remoteAddress;
    
    let clientIP = xForwardedFor || xRealIP || connectionRemoteAddr || 
                   socketRemoteAddr || connectionSocketRemoteAddr || '127.0.0.1';
    
    // Se houver múltiplos IPs, pegar o primeiro (cliente real)
    if (clientIP.includes(',')) {
        clientIP = clientIP.split(',')[0].trim();
    }
    
    // Validar formato do IP
    if (!validator.isIP(clientIP)) {
        clientIP = '127.0.0.1';
    }
    
    return clientIP;
}

// Criptografia de dados sensíveis
class SecurityUtils {
    static encrypt(text) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher('aes-256-gcm', securityConfig.ENCRYPTION_KEY);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        return {
            encrypted: encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    }
    
    static decrypt(encryptedData) {
        const decipher = crypto.createDecipher('aes-256-gcm', securityConfig.ENCRYPTION_KEY);
        decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    
    static generateSecureToken() {
        return crypto.randomBytes(32).toString('hex');
    }
    
    static hashPassword(password) {
        return bcrypt.hashSync(password, 12);
    }
    
    static verifyPassword(password, hash) {
        return bcrypt.compareSync(password, hash);
    }
}

// Headers de segurança adicionais
app.use((req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Strict transport security
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    // Remove server information
    res.removeHeader('X-Powered-By');
    
    next();
});

module.exports = {
    app,
    SecurityUtils,
    securityConfig,
    authenticateAdmin,
    getClientIP
};