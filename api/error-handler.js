/**
 * Error Handling Middleware - ENTERPRISE STANDARD
 * Centralized error handling with proper HTTP status codes
 */

const Logger = require('./logger');
const logger = new Logger('ErrorHandler');

/**
 * Custom Error Class
 */
class AppError extends Error {
    constructor(message, statusCode, details = {}) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * Global Error Handler Middleware
 * FIX #2: Medium priority security fix - Enhanced error code mapping
 */
const globalErrorHandler = (err, req, res, next) => {
    // Default error values
    let statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    const isDevelopment = process.env.NODE_ENV !== 'production';

    // MÉDIO FIX #2: Map file system and validation errors to proper HTTP codes
    if (err.code === 'ENOENT') {
        statusCode = 404; // File not found
    } else if (err.code === 'EACCES') {
        statusCode = 403; // Permission denied
    } else if (err.name === 'ValidationError') {
        statusCode = 400; // Bad request
    } else if (err.type === 'entity.too.large') {
        statusCode = 413; // Payload too large
    } else if (err.code === 'ENOSPC') {
        statusCode = 507; // Insufficient storage
    } else if (!err.statusCode && err.name === 'Error') {
        // Generic unhandled error
        statusCode = 500;
    }

    // Log error
    logger.error(message, err, {
        statusCode,
        path: req.path,
        method: req.method,
        ip: req.ip,
        details: err.details || {}
    });

    // Response body
    const response = {
        success: false,
        error: {
            message,
            code: err.code || 'INTERNAL_ERROR',
            statusCode
        }
    };

    // Include stack trace in development only
    if (isDevelopment) {
        response.error.stack = err.stack;
        response.error.details = err.details;
    }

    // Send response
    res.status(statusCode).json(response);
};

/**
 * 404 Handler
 */
const notFoundHandler = (req, res) => {
    const error = new AppError(`Route not found: ${req.method} ${req.path}`, 404, {
        method: req.method,
        path: req.path
    });
    globalErrorHandler(error, req, res, null);
};

/**
 * Async Error Wrapper
 * Wraps async route handlers to catch errors
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Specific Error Classes
 */
class ValidationError extends AppError {
    constructor(message, details = {}) {
        super(message, 400, details);
        this.code = 'VALIDATION_ERROR';
    }
}

class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed', details = {}) {
        super(message, 401, details);
        this.code = 'AUTH_ERROR';
    }
}

class AuthorizationError extends AppError {
    constructor(message = 'Access denied', details = {}) {
        super(message, 403, details);
        this.code = 'AUTH_FORBIDDEN';
    }
}

class NotFoundError extends AppError {
    constructor(resource = 'Resource', details = {}) {
        super(`${resource} not found`, 404, details);
        this.code = 'NOT_FOUND';
    }
}

class ConflictError extends AppError {
    constructor(message, details = {}) {
        super(message, 409, details);
        this.code = 'CONFLICT';
    }
}

class InternalError extends AppError {
    constructor(message = 'Internal server error', details = {}) {
        super(message, 500, details);
        this.code = 'INTERNAL_ERROR';
    }
}

class ServiceUnavailableError extends AppError {
    constructor(message = 'Service unavailable', details = {}) {
        super(message, 503, details);
        this.code = 'SERVICE_UNAVAILABLE';
    }
}

module.exports = {
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    InternalError,
    ServiceUnavailableError,
    globalErrorHandler,
    notFoundHandler,
    asyncHandler
};
