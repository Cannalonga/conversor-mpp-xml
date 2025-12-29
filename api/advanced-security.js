/**
 * 🛡️ ADVANCED SECURITY MIDDLEWARE
 * ================================
 * 
 * Protege aplicação contra ataques comuns:
 * - SQL Injection
 * - XSS (Cross-Site Scripting)
 * - CSRF (Cross-Site Request Forgery)
 * - Rate limiting
 * - Input validation
 * - Output sanitization
 */

const crypto = require('crypto');

// Store para rate limiting (em produção usar Redis)
const requestLimits = new Map();

class SecurityMiddleware {
  /**
   * Rate limiting por IP
   */
  static rateLimitByIP(maxRequests = 100, windowMs = 60000) {
    return (req, res, next) => {
      const ip = req.ip || req.connection.remoteAddress;
      const now = Date.now();
      
      if (!requestLimits.has(ip)) {
        requestLimits.set(ip, []);
      }
      
      const requests = requestLimits.get(ip);
      const recentRequests = requests.filter(time => now - time < windowMs);
      
      if (recentRequests.length >= maxRequests) {
        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil((recentRequests[0] + windowMs - now) / 1000)
        });
      }
      
      recentRequests.push(now);
      requestLimits.set(ip, recentRequests);
      next();
    };
  }

  /**
   * Sanitizar input contra XSS e SQL injection
   */
  static sanitizeInput() {
    return (req, res, next) => {
      // Sanitizar body
      if (req.body) {
        req.body = sanitizeObject(req.body);
      }
      
      // Sanitizar query
      if (req.query) {
        req.query = sanitizeObject(req.query);
      }
      
      // Sanitizar params
      if (req.params) {
        req.params = sanitizeObject(req.params);
      }
      
      next();
    };
  }

  /**
   * CSRF Protection
   */
  static csrfProtection() {
    return (req, res, next) => {
      // Gerar token CSRF se não existir
      if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');
      }
      
      // Métodos seguros (GET, HEAD, OPTIONS)
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }
      
      // Validar token CSRF
      const token = req.headers['x-csrf-token'] || req.body._csrf;
      
      if (!token || token !== req.session.csrfToken) {
        return res.status(403).json({
          error: 'CSRF token validation failed',
          code: 'CSRF_INVALID'
        });
      }
      
      next();
    };
  }

  /**
   * Validar Content-Type
   */
  static validateContentType(...allowedTypes) {
    return (req, res, next) => {
      if (req.method === 'GET') return next();
      
      const contentType = req.get('content-type') || '';
      const isAllowed = allowedTypes.some(type => contentType.includes(type));
      
      if (!isAllowed) {
        return res.status(415).json({
          error: 'Unsupported Media Type',
          allowed: allowedTypes
        });
      }
      
      next();
    };
  }

  /**
   * Validar tamanho do payload
   */
  static validatePayloadSize(maxSizeMB = 10) {
    return (req, res, next) => {
      const contentLength = parseInt(req.get('content-length'), 10);
      const maxBytes = maxSizeMB * 1024 * 1024;
      
      if (contentLength && contentLength > maxBytes) {
        return res.status(413).json({
          error: 'Payload Too Large',
          maxSize: `${maxSizeMB}MB`
        });
      }
      
      next();
    };
  }

  /**
   * Validar formato de email
   */
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validar CPF (validação numérica básica)
   */
  static validateCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    
    // Validação de dígitos verificadores
    let sum = 0;
    let remainder;
    
    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cpf.substring(i - 1, i), 10) * (11 - i);
    }
    
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10), 10)) return false;
    
    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cpf.substring(i - 1, i), 10) * (12 - i);
    }
    
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11), 10)) return false;
    
    return true;
  }

  /**
   * Audit logging
   */
  static auditLog() {
    return (req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        const log = {
          timestamp: new Date().toISOString(),
          method: req.method,
          path: req.path,
          ip: req.ip,
          status: res.statusCode,
          duration: `${duration}ms`,
          user: req.user?.id || 'anonymous'
        };
        
        // Log sensitivo (não logar dados de usuário)
        if (res.statusCode >= 400) {
          console.log('🚨 Request auditado:', JSON.stringify(log));
        }
      });
      
      next();
    };
  }
}

/**
 * Sanitizar objeto recursivamente
 */
function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
  }
  return sanitized;
}

/**
 * Sanitizar string contra XSS
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  
  // Remover caracteres perigosos
  return str
    .replace(/[<>\"'`]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Escapar string para HTML (encoding)
 */
function escapeHtml(str) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return str.replace(/[&<>"']/g, m => map[m]);
}

module.exports = {
  SecurityMiddleware,
  sanitizeString,
  sanitizeObject,
  escapeHtml
};
