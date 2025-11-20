/**
 * SaaS Middleware
 * 
 * Isolamento de dados por usuário/cliente
 */

const jwt = require('jsonwebtoken');

/**
 * Middleware: Verificar JWT e extrair userId
 */
function validateSaasToken(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Missing authorization token',
      });
    }

    // Tentar decodificar token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key');
    } catch (error) {
      return res.status(401).json({
        error: 'Invalid or expired token',
      });
    }

    // Extrair userId do token
    req.user = {
      id: decoded.userId || decoded.sub || decoded.id,
      email: decoded.email,
      type: 'saas-user', // Diferencia de admin
    };

    next();
  } catch (error) {
    console.error('[SaasMiddleware] Token validation error:', error);
    res.status(500).json({ error: 'Token validation failed' });
  }
}

/**
 * Middleware: Validar acesso ao recurso (data isolation)
 */
function validateResourceAccess(req, res, next) {
  try {
    const userId = req.user?.id;
    const resourceUserId = req.params.userId || req.body?.userId;

    // Se um userId específico foi solicitado, validar que é do próprio usuário
    if (resourceUserId && resourceUserId !== userId) {
      console.warn(`[SaasMiddleware] Unauthorized access: ${userId} tried to access ${resourceUserId}`);
      return res.status(403).json({
        error: 'Access denied: You can only access your own resources',
      });
    }

    // Atrelar userId ao request automaticamente
    req.user.id = userId;
    req.body.userId = userId;

    next();
  } catch (error) {
    console.error('[SaasMiddleware] Resource access validation error:', error);
    res.status(500).json({ error: 'Access validation failed' });
  }
}

/**
 * Middleware: Validar permissões de admin
 */
function validateAdminAccess(req, res, next) {
  try {
    const adminRole = req.admin?.role;

    if (!adminRole || adminRole !== 'SUPER_ADMIN') {
      return res.status(403).json({
        error: 'Admin access required',
      });
    }

    next();
  } catch (error) {
    console.error('[SaasMiddleware] Admin access validation error:', error);
    res.status(500).json({ error: 'Admin validation failed' });
  }
}

/**
 * Middleware: Validar limite de conversões antes de permitir
 */
async function validateConversionLimit(req, res, next) {
  try {
    const { UsageRepository } = require('./repositories');
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const canConvert = await UsageRepository.canConvert(userId);

    if (!canConvert.allowed) {
      return res.status(403).json({
        error: `Conversion limit exceeded: ${canConvert.reason}`,
      });
    }

    req.user.remainingConversions = canConvert.remaining;
    next();
  } catch (error) {
    console.error('[SaasMiddleware] Conversion limit validation error:', error);
    res.status(500).json({ error: 'Conversion validation failed' });
  }
}

/**
 * Middleware: Rate limiting por usuário
 */
const conversionLimiter = {};

function rateLimitByUser(req, res, next) {
  try {
    const userId = req.user?.id;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minuto
    const maxRequests = 5; // 5 requisições por minuto

    if (!conversionLimiter[userId]) {
      conversionLimiter[userId] = [];
    }

    // Remover requisições fora da janela
    conversionLimiter[userId] = conversionLimiter[userId].filter(
      timestamp => now - timestamp < windowMs
    );

    // Verificar limite
    if (conversionLimiter[userId].length >= maxRequests) {
      return res.status(429).json({
        error: 'Too many conversion requests. Please try again later.',
        retryAfter: Math.ceil((conversionLimiter[userId][0] + windowMs - now) / 1000),
      });
    }

    conversionLimiter[userId].push(now);
    next();
  } catch (error) {
    console.error('[SaasMiddleware] Rate limit error:', error);
    next(); // Não bloquear em caso de erro
  }
}

module.exports = {
  validateSaasToken,
  validateResourceAccess,
  validateAdminAccess,
  validateConversionLimit,
  rateLimitByUser,
};
