/**
 * 🔄 Mercado Pago Status Normalizer
 * ==================================
 * 
 * Normaliza status do Mercado Pago para status interno padronizado.
 * Usado em: webhook, rota de status, addCreditsFromPurchase
 * 
 * Status Mercado Pago → Status Interno
 * ------------------------------------
 * approved      → paid
 * authorized    → paid
 * pending       → pending
 * in_process    → pending
 * rejected      → failed
 * cancelled     → failed
 * refunded      → refunded
 * charged_back  → refunded
 */

/**
 * Status internos padronizados
 * @readonly
 * @enum {string}
 */
const InternalStatus = {
  PAID: 'paid',
  PENDING: 'pending',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  UNKNOWN: 'unknown',
};

/**
 * Mapeamento de status do Mercado Pago para status interno
 * @readonly
 */
const MP_STATUS_MAP = {
  // Pagamento aprovado
  'approved': InternalStatus.PAID,
  'authorized': InternalStatus.PAID,
  
  // Pagamento pendente
  'pending': InternalStatus.PENDING,
  'in_process': InternalStatus.PENDING,
  'in_mediation': InternalStatus.PENDING,
  
  // Pagamento falhou
  'rejected': InternalStatus.FAILED,
  'cancelled': InternalStatus.FAILED,
  
  // Reembolso
  'refunded': InternalStatus.REFUNDED,
  'charged_back': InternalStatus.REFUNDED,
};

/**
 * Normaliza status do Mercado Pago para status interno
 * 
 * @param {string} mpStatus - Status retornado pelo Mercado Pago
 * @returns {string} Status interno normalizado
 * 
 * @example
 * normalizeMpStatus('approved')    // → 'paid'
 * normalizeMpStatus('in_process')  // → 'pending'
 * normalizeMpStatus('rejected')    // → 'failed'
 */
function normalizeMpStatus(mpStatus) {
  if (!mpStatus || typeof mpStatus !== 'string') {
    return InternalStatus.UNKNOWN;
  }

  const normalized = mpStatus.toLowerCase().trim();
  return MP_STATUS_MAP[normalized] || InternalStatus.UNKNOWN;
}

/**
 * Verifica se o status indica pagamento aprovado/pago
 * 
 * @param {string} mpStatus - Status do Mercado Pago
 * @returns {boolean}
 */
function isPaid(mpStatus) {
  return normalizeMpStatus(mpStatus) === InternalStatus.PAID;
}

/**
 * Verifica se o status indica pagamento pendente
 * 
 * @param {string} mpStatus - Status do Mercado Pago
 * @returns {boolean}
 */
function isPending(mpStatus) {
  return normalizeMpStatus(mpStatus) === InternalStatus.PENDING;
}

/**
 * Verifica se o status indica falha
 * 
 * @param {string} mpStatus - Status do Mercado Pago
 * @returns {boolean}
 */
function isFailed(mpStatus) {
  return normalizeMpStatus(mpStatus) === InternalStatus.FAILED;
}

/**
 * Verifica se o status indica reembolso
 * 
 * @param {string} mpStatus - Status do Mercado Pago
 * @returns {boolean}
 */
function isRefunded(mpStatus) {
  return normalizeMpStatus(mpStatus) === InternalStatus.REFUNDED;
}

/**
 * Verifica se créditos devem ser aplicados para este status
 * Créditos só são aplicados para status 'paid'
 * 
 * @param {string} mpStatus - Status do Mercado Pago
 * @returns {boolean}
 */
function shouldApplyCredits(mpStatus) {
  return isPaid(mpStatus);
}

/**
 * Retorna objeto completo com status normalizado e flags
 * 
 * @param {string} mpStatus - Status do Mercado Pago
 * @returns {{
 *   original: string,
 *   normalized: string,
 *   isPaid: boolean,
 *   isPending: boolean,
 *   isFailed: boolean,
 *   isRefunded: boolean,
 *   shouldApplyCredits: boolean
 * }}
 */
function getStatusInfo(mpStatus) {
  const normalized = normalizeMpStatus(mpStatus);
  
  return {
    original: mpStatus,
    normalized,
    isPaid: normalized === InternalStatus.PAID,
    isPending: normalized === InternalStatus.PENDING,
    isFailed: normalized === InternalStatus.FAILED,
    isRefunded: normalized === InternalStatus.REFUNDED,
    shouldApplyCredits: normalized === InternalStatus.PAID,
  };
}

module.exports = {
  InternalStatus,
  MP_STATUS_MAP,
  normalizeMpStatus,
  isPaid,
  isPending,
  isFailed,
  isRefunded,
  shouldApplyCredits,
  getStatusInfo,
};
