/**
 * 💰 Credit Plans Configuration
 * =============================
 * 
 * Define os pacotes de créditos disponíveis para compra
 * e a lógica de preços do sistema CannaConvert
 */

const CREDIT_PLANS = {
  // 📦 Pacote Básico - Para uso casual
  basic: {
    id: 'basic',
    name: 'Básico',
    credits: 50,
    price: 9.90,
    pricePerCredit: 0.198,
    description: 'Ideal para uso casual',
    features: [
      '50 créditos',
      'Todos os conversores',
      'Arquivos até 100MB',
      'Suporte por email',
    ],
    popular: false,
    badge: null,
  },

  // 🚀 Pacote Pro - Melhor custo-benefício
  pro: {
    id: 'pro',
    name: 'Profissional',
    credits: 200,
    price: 29.90,
    pricePerCredit: 0.1495,
    description: 'Melhor custo-benefício',
    features: [
      '200 créditos',
      'Economia de 25%',
      'Arquivos até 500MB',
      'Suporte prioritário',
      'Fila prioritária',
    ],
    popular: true,
    badge: 'Mais Popular',
  },

  // 🏢 Pacote Business - Para uso intensivo
  business: {
    id: 'business',
    name: 'Business',
    credits: 500,
    price: 59.90,
    pricePerCredit: 0.1198,
    description: 'Para uso intensivo',
    features: [
      '500 créditos',
      'Economia de 40%',
      'Arquivos até 1GB',
      'Suporte 24/7',
      'Fila prioritária',
      'API Access',
    ],
    popular: false,
    badge: 'Melhor Valor',
  },

  // 🏆 Pacote Enterprise - Máximo volume
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    credits: 2000,
    price: 199.90,
    pricePerCredit: 0.09995,
    description: 'Máximo volume com desconto',
    features: [
      '2000 créditos',
      'Economia de 50%',
      'Arquivos ilimitados',
      'Suporte dedicado',
      'Prioridade máxima',
      'API Access ilimitado',
      'Relatórios de uso',
    ],
    popular: false,
    badge: 'Enterprise',
  },
};

/**
 * Custo de cada tipo de conversão em créditos
 */
const CONVERSION_COSTS = {
  // Documentos
  'mpp-to-xml': 2,
  'xml-to-mpp': 2,
  'docx-to-pdf': 1,
  'pdf-to-text': 1,
  'xlsx-to-csv': 1,
  'json-to-csv': 1,
  
  // Imagens (baixo custo)
  'png-to-jpg': 1,
  'jpg-to-png': 1,
  'jpg-to-webp': 1,
  'image-to-pdf': 1,
  'image-optimize-whatsapp': 1,
  'pdf-to-image': 1,
  
  // Vídeo (alto custo - processamento pesado)
  'video-to-mp4': 3,
  'video-compress-whatsapp': 3,
  'video-to-social': 3,
  
  // Compressão
  'pdf-compress': 1,
  'zip-to-xml': 1,
  
  // Default
  'default': 1,
};

/**
 * Obter plano por ID
 */
function getPlanById(planId) {
  return CREDIT_PLANS[planId] || null;
}

/**
 * Obter todos os planos como array
 */
function getAllPlans() {
  return Object.values(CREDIT_PLANS);
}

/**
 * Obter custo de um conversor
 */
function getConversionCost(converterId) {
  return CONVERSION_COSTS[converterId] || CONVERSION_COSTS.default;
}

/**
 * Validar se um plano existe
 */
function isValidPlan(planId) {
  return planId in CREDIT_PLANS;
}

/**
 * Créditos bônus para novos usuários
 */
const WELCOME_BONUS = {
  enabled: true,
  credits: 5,
  description: 'Bônus de boas-vindas',
};

/**
 * Configurações de créditos gratuitos por dia (para usuários não-premium)
 */
const FREE_TIER = {
  enabled: true,
  dailyCredits: 3,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  description: 'Conversões gratuitas por dia',
};

module.exports = {
  CREDIT_PLANS,
  CONVERSION_COSTS,
  WELCOME_BONUS,
  FREE_TIER,
  getPlanById,
  getAllPlans,
  getConversionCost,
  isValidPlan,
};
