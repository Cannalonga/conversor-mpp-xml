/**
 * 💳 Mercado Pago Payment Module
 * ===============================
 * 
 * Módulo unificado para integração com Mercado Pago.
 * 
 * Exports:
 * - Status normalizer
 * - Logger padronizado
 * - Payment service
 */

const normalizeMpStatus = require('./normalizeMpStatus');
const mpLogger = require('./mpLogger');
const paymentService = require('./paymentService');

module.exports = {
  // Status normalizer
  ...normalizeMpStatus,
  
  // Logger
  ...mpLogger,
  
  // Payment service
  ...paymentService,
};
