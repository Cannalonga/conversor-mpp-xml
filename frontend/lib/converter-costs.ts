/**
 * Converter Costs Configuration
 * 
 * Each converter has a credit cost based on:
 * - Processing complexity
 * - Resource usage
 * - Market value
 * 
 * Costs are in "credits" (1 credit ≈ R$ 0.20)
 */

export interface ConverterCostConfig {
  cost: number;
  name: string;
  category: string;
}

export const converterCosts: Record<string, ConverterCostConfig> = {
  // Image Converters (low cost - fast processing)
  'png-to-jpg': {
    cost: 1,
    name: 'PNG para JPG',
    category: 'Imagens',
  },
  'jpg-to-webp': {
    cost: 1,
    name: 'JPG para WebP',
    category: 'Imagens',
  },
  'image-to-pdf': {
    cost: 2,
    name: 'Imagem para PDF',
    category: 'Imagens',
  },
  'image-optimize-whatsapp': {
    cost: 2,
    name: 'Otimizar para WhatsApp',
    category: 'Imagens',
  },
  'pdf-to-image': {
    cost: 2,
    name: 'PDF para Imagem',
    category: 'Imagens',
  },

  // Document Converters (medium cost)
  'docx-to-pdf': {
    cost: 3,
    name: 'DOCX para PDF',
    category: 'Documentos',
  },
  'pdf-compress': {
    cost: 3,
    name: 'Comprimir PDF',
    category: 'Documentos',
  },
  'excel-to-csv': {
    cost: 2,
    name: 'Excel para CSV',
    category: 'Documentos',
  },
  'json-to-csv': {
    cost: 1,
    name: 'JSON para CSV',
    category: 'Documentos',
  },

  // Video Converters (high cost - heavy processing)
  'video-to-mp4': {
    cost: 5,
    name: 'Vídeo para MP4',
    category: 'Vídeos',
  },
  'video-to-social': {
    cost: 5,
    name: 'Vídeo para Redes Sociais',
    category: 'Vídeos',
  },
  'video-compress-whatsapp': {
    cost: 4,
    name: 'Comprimir para WhatsApp',
    category: 'Vídeos',
  },

  // Project Converters (specialized - premium)
  'mpp-to-xml': {
    cost: 4,
    name: 'MPP para XML',
    category: 'Projetos',
  },
  'xml-to-mpp': {
    cost: 4,
    name: 'XML para MPP',
    category: 'Projetos',
  },
  'zip-to-xml': {
    cost: 3,
    name: 'ZIP para XML',
    category: 'Projetos',
  },
};

/**
 * Get cost for a specific converter
 */
export function getConverterCost(converterId: string): number {
  return converterCosts[converterId]?.cost ?? 1;
}

/**
 * Get all costs as simple map
 */
export function getAllCosts(): Record<string, number> {
  return Object.fromEntries(
    Object.entries(converterCosts).map(([key, config]) => [key, config.cost])
  );
}

/**
 * Credit packages for purchase
 */
export const creditPackages = [
  {
    id: 'credits_50',
    credits: 50,
    price: 10.00, // R$ 10,00
    priceId: process.env.STRIPE_PRICE_50 || '',
    popular: false,
    description: 'Pacote básico',
  },
  {
    id: 'credits_200',
    credits: 200,
    price: 30.00, // R$ 30,00 (desconto de 25%)
    priceId: process.env.STRIPE_PRICE_200 || '',
    popular: true,
    description: 'Melhor custo-benefício',
  },
  {
    id: 'credits_500',
    credits: 500,
    price: 60.00, // R$ 60,00 (desconto de 40%)
    priceId: process.env.STRIPE_PRICE_500 || '',
    popular: false,
    description: 'Para uso intensivo',
  },
];

export default converterCosts;
