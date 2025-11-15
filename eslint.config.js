// ESLint configuration for security-focused static analysis
const js = require('@eslint/js');
const security = require('eslint-plugin-security');

module.exports = [
  js.configs.recommended,
  {
    plugins: {
      security,
    },
    rules: {
      // Security-focused rules
      'security/detect-unsafe-regex': 'error',
      'security/detect-buffer-noassert': 'error', 
      'security/detect-child-process': 'error',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-non-literal-regexp': 'error',
      'security/detect-non-literal-require': 'warn',
      'security/detect-object-injection': 'error',
      'security/detect-possible-timing-attacks': 'error',
      'security/detect-pseudoRandomBytes': 'error',
      
      // General code quality with security implications
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      
      // Prevent common injection patterns
      'no-console': 'warn', // logs can leak sensitive info
      'no-unused-vars': 'error',
      'strict': ['error', 'global'],
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        Buffer: 'readonly',
        setInterval: 'readonly',
        setTimeout: 'readonly',
        clearInterval: 'readonly',
        clearTimeout: 'readonly'
      }
    },
    ignores: [
      'node_modules/**',
      'uploads/**',
      '*.min.js',
      'coverage/**',
      '.venv/**'
    ]
  }
];