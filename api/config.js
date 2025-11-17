/**
 * Environment Configuration Validator
 * Ensures all required environment variables are set
 */

class EnvValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
    }

    /**
     * Validate required environment variable
     */
    required(name, defaultValue = null) {
        const value = process.env[name];
        
        if (!value && defaultValue === null) {
            this.errors.push(`Missing required environment variable: ${name}`);
            return null;
        }
        
        return value || defaultValue;
    }

    /**
     * Validate environment variable with options
     */
    oneOf(name, options, defaultValue = null) {
        const value = process.env[name] || defaultValue;
        
        if (!value) {
            this.errors.push(`Missing environment variable: ${name}`);
            return null;
        }
        
        if (!options.includes(value)) {
            this.errors.push(
                `Invalid value for ${name}. Expected one of: ${options.join(', ')}`
            );
            return null;
        }
        
        return value;
    }

    /**
     * Validate integer environment variable
     */
    integer(name, defaultValue = null) {
        const value = process.env[name] || defaultValue;
        
        if (!value) {
            this.errors.push(`Missing environment variable: ${name}`);
            return null;
        }
        
        const parsed = parseInt(value, 10);
        if (isNaN(parsed)) {
            this.errors.push(`${name} must be an integer, got: ${value}`);
            return null;
        }
        
        return parsed;
    }

    /**
     * Validate boolean environment variable
     */
    boolean(name, defaultValue = false) {
        const value = process.env[name];
        
        if (!value) {
            return defaultValue;
        }
        
        return value === 'true' || value === '1' || value === 'yes';
    }

    /**
     * Get all errors
     */
    getErrors() {
        return this.errors;
    }

    /**
     * Get all warnings
     */
    getWarnings() {
        return this.warnings;
    }

    /**
     * Check if validation passed
     */
    isValid() {
        return this.errors.length === 0;
    }

    /**
     * Throw error if validation failed
     */
    validate() {
        if (!this.isValid()) {
            throw new Error(`Environment validation failed:\n${this.errors.join('\n')}`);
        }
        
        if (this.warnings.length > 0) {
            console.warn('Environment warnings:', this.warnings);
        }
    }
}

/**
 * Standard configuration
 */
function loadConfig() {
    const validator = new EnvValidator();
    
    const config = {
        // Server
        NODE_ENV: validator.oneOf('NODE_ENV', ['development', 'production', 'staging'], 'development'),
        PORT: validator.integer('PORT', 3000),
        HOST: validator.required('HOST', 'localhost'),
        
        // Security
        JWT_SECRET: validator.required('JWT_SECRET', 'dev-secret-key'),
        API_KEY: validator.required('API_KEY', 'dev-api-key'),
        SESSION_SECRET: validator.required('SESSION_SECRET', 'dev-session-secret'),
        
        // Database (optional)
        DATABASE_URL: validator.required('DATABASE_URL', null),
        
        // External Services
        PIX_API_URL: validator.required('PIX_API_URL', null),
        PIX_API_KEY: validator.required('PIX_API_KEY', null),
        
        // File Upload
        MAX_FILE_SIZE: validator.integer('MAX_FILE_SIZE', 50 * 1024 * 1024), // 50MB
        UPLOAD_DIR: validator.required('UPLOAD_DIR', './uploads'),
        
        // Logging
        LOG_LEVEL: validator.oneOf('LOG_LEVEL', ['error', 'warn', 'info', 'debug'], 'info'),
        
        // CORS
        ALLOWED_ORIGINS: validator.required(
            'ALLOWED_ORIGINS',
            'http://localhost:3000,http://localhost:3001'
        ),
        
        // Feature Flags
        ENABLE_2FA: validator.boolean('ENABLE_2FA', true),
        ENABLE_RATE_LIMITING: validator.boolean('ENABLE_RATE_LIMITING', true),
        ENABLE_METRICS: validator.boolean('ENABLE_METRICS', true)
    };
    
    validator.validate();
    
    return config;
}

module.exports = {
    EnvValidator,
    loadConfig
};
