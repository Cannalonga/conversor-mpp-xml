/**
 * ESLint Configuration - ENTERPRISE STANDARD
 * High-quality code standards for production-grade applications
 */

module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  
  extends: [
    'eslint:recommended'
  ],
  
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  
  rules: {
    // ==========================================
    // BEST PRACTICES & CODE QUALITY
    // ==========================================
    
    // Error Prevention
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    'no-debugger': 'error',
    'no-unused-vars': ['error', { 
      args: 'after-used',
      argsIgnorePattern: '^_'
    }],
    'no-undef': 'error',
    'no-empty': ['error', { allowEmptyCatch: true }],
    'no-duplicate-imports': 'error',
    
    // Security
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-with': 'error',
    
    // Code Style
    'semi': ['error', 'always'],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'indent': ['error', 4, { SwitchCase: 1 }],
    'comma-dangle': ['error', 'never'],
    'no-trailing-spaces': 'error',
    'eol-last': ['error', 'always'],
    'no-multiple-empty-lines': ['error', { max: 2 }],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'arrow-spacing': 'error',
    'key-spacing': ['error', { beforeColon: false, afterColon: true }],
    'no-multi-spaces': 'error',
    
    // ==========================================
    // BEST PRACTICES
    // ==========================================
    
    'curly': ['error', 'all'],
    'eqeqeq': ['error', 'always'],
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': 'warn',
    'no-nested-ternary': 'warn',
    'complexity': ['warn', 15],
    'max-depth': ['warn', 4],
    'max-nested-callbacks': ['warn', 3],
    'max-len': ['warn', { code: 120 }],
    'no-shadow': ['error', { builtinGlobals: false }],
    'no-param-reassign': ['error', { props: true }],
    'require-await': 'error',
    'no-constant-condition': ['error', { checkLoops: false }]
  },
  
  overrides: [
    {
      files: ['**/*.test.js', '**/*.spec.js'],
      rules: {
        'no-console': 'off'
      }
    }
  ]
};
