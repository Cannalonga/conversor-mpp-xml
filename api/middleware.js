/**
 * Middleware Utilities - ENTERPRISE STANDARD
 * Request tracking, security headers, rate limiting, validation
 */

const Logger = require('./logger');
const logger = new Logger('Middleware');
const { ValidationError } = require('./error-handler');
const rateLimit = require('express-rate-limit');

/**
 * Request ID Middleware
 * Adds unique ID to each request for tracing
 */
const requestIdMiddleware = (req, res, next) => {
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    req.id = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
};

/**
 * Request Logging Middleware
 */
const requestLoggingMiddleware = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.http(
            req.method,
            req.path,
            res.statusCode,
            duration
        );
    });
    
    next();
};

/**
 * Security Headers Middleware
 */
const securityHeadersMiddleware = (req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Content Security Policy
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"
    );
    
    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions Policy (formerly Feature Policy)
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // HSTS for HTTPS
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    next();
};

/**
 * CORS Middleware (Production Safe)
 */
const corsMiddleware = (req, res, next) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        res.header('Access-Control-Allow-Origin', origin || '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
        res.header('Access-Control-Allow-Credentials', 'true');
    }
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
};

/**
 * Request Body Size Limiter
 */
const bodyLimitMiddleware = (maxSize = '10mb') => {
    return (req, res, next) => {
        const size = parseInt(req.headers['content-length'] || 0);
        const maxBytes = parseInt(maxSize) * 1024 * 1024;
        
        if (size > maxBytes) {
            throw new ValidationError('Request body too large', {
                maxSize,
                receivedSize: `${(size / 1024 / 1024).toFixed(2)}mb`
            });
        }
        
        next();
    };
};

/**
 * Rate Limiting (Simple Implementation)
 */
class RateLimiter {
    constructor(options = {}) {
        this.windowMs = options.windowMs || 60 * 1000; // 1 minute
        this.maxRequests = options.maxRequests || 100;
        this.store = new Map();
    }

    middleware() {
        return (req, res, next) => {
            const key = req.ip || req.connection.remoteAddress;
            const now = Date.now();
            
            if (!this.store.has(key)) {
                this.store.set(key, []);
            }
            
            const requests = this.store.get(key);
            const recentRequests = requests.filter((time) => now - time < this.windowMs);
            
            if (recentRequests.length >= this.maxRequests) {
                logger.security('RATE_LIMIT_EXCEEDED', { ip: key });
                return res.status(429).json({
                    success: false,
                    error: {
                        message: 'Too many requests, please try again later',
                        retryAfter: Math.ceil(this.windowMs / 1000)
                    }
                });
            }
            
            recentRequests.push(now);
            this.store.set(key, recentRequests);
            
            // Clean up old entries periodically
            if (Math.random() < 0.01) {
                this.store.forEach((times, ip) => {
                    const valid = times.filter((time) => now - time < this.windowMs);
                    if (valid.length === 0) {
                        this.store.delete(ip);
                    } else {
                        this.store.set(ip, valid);
                    }
                });
            }
            
            next();
        };
    }
}

/**
 * Input Validation Middleware
 */
const validateInput = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });
        
        if (error) {
            const messages = error.details.map((d) => d.message).join(', ');
            throw new ValidationError(`Validation failed: ${messages}`, {
                details: error.details
            });
        }
        
        req.body = value;
        next();
    };
};

/**
 * Authentication Check Middleware
 */
const requireAuth = (req, res, next) => {
    const { AuthenticationError } = require('./error-handler');
    
    if (!req.user && !req.headers.authorization) {
        throw new AuthenticationError('Authorization required');
    }
    
    next();
};

/**
 * API Rate Limiter Middleware
 * Prevents abuse by limiting requests per IP
 */
const apiRateLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute default
    max: parseInt(process.env.RATE_LIMIT_MAX || '60'), // 60 requests per window
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    message: { 
        success: false, 
        error: 'Too many requests, please slow down.' 
    },
    skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health';
    },
    keyGenerator: (req, res) => {
        // Use IP address as key (or X-Forwarded-For if behind proxy)
        return req.ip || req.connection.remoteAddress;
    }
});

/**
 * Upload Rate Limiter (stricter for file uploads)
 * Prevents abuse of upload endpoint
 */
const uploadRateLimiter = rateLimit({
    windowMs: parseInt(process.env.UPLOAD_RATE_LIMIT_WINDOW_MS || '300000'), // 5 minutes default
    max: parseInt(process.env.UPLOAD_RATE_LIMIT_MAX || '10'), // 10 uploads per 5 minutes per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { 
        success: false, 
        error: 'Too many upload requests, please wait before trying again.' 
    }
});

module.exports = {
    requestIdMiddleware,
    requestLoggingMiddleware,
    securityHeadersMiddleware,
    corsMiddleware,
    bodyLimitMiddleware,
    RateLimiter,
    validateInput,
    requireAuth,
    apiRateLimiter,
    uploadRateLimiter
};
