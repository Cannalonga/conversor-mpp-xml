// Configuração das ferramentas de conversão
export const CONVERSION_TOOLS = [
    {
        id: 'mpp-to-xml',
        title: 'MPP para XML',
        description: 'Converte arquivos Microsoft Project (.mpp) para XML',
        icon: '📊',
        price: 'R$ 10,00',
        inputFormat: ['.mpp'],
        outputFormat: 'XML',
        category: 'project',
        route: '/convert/mpp-to-xml',
        endpoint: '/api/convert/mpp/xml',
        popular: true
    },
    {
        id: 'pdf-to-text',
        title: 'PDF para Texto',
        description: 'Extrai texto de arquivos PDF de forma rápida e precisa',
        icon: '📄',
        price: 'R$ 3,00',
        inputFormat: ['.pdf'],
        outputFormat: 'TXT',
        category: 'pdf',
        route: '/convert/pdf-to-text',
        endpoint: '/api/convert/pdf/text',
        popular: true
    },
    {
        id: 'pdf-merge',
        title: 'Juntar PDFs',
        description: 'Combina múltiplos arquivos PDF em um único documento',
        icon: '📑',
        price: 'R$ 5,00',
        inputFormat: ['.pdf'],
        outputFormat: 'PDF',
        category: 'pdf',
        route: '/convert/pdf-merge',
        endpoint: '/api/convert/pdf/merge'
    },
    {
        id: 'pdf-split',
        title: 'Dividir PDF',
        description: 'Separa páginas de um PDF em arquivos individuais',
        icon: '✂️',
        price: 'R$ 4,00',
        inputFormat: ['.pdf'],
        outputFormat: 'PDF',
        category: 'pdf',
        route: '/convert/pdf-split',
        endpoint: '/api/convert/pdf/split'
    },
    {
        id: 'pdf-compress',
        title: 'Comprimir PDF',
        description: 'Reduz o tamanho de arquivos PDF mantendo a qualidade',
        icon: '🗜️',
        price: 'R$ 3,00',
        inputFormat: ['.pdf'],
        outputFormat: 'PDF',
        category: 'pdf',
        route: '/convert/pdf-compress',
        endpoint: '/api/convert/pdf/compress'
    },
    {
        id: 'pdf-ocr',
        title: 'PDF OCR',
        description: 'Extrai texto de PDFs digitalizados usando OCR',
        icon: '🔍',
        price: 'R$ 7,00',
        inputFormat: ['.pdf'],
        outputFormat: 'TXT/PDF',
        category: 'pdf',
        route: '/convert/pdf-ocr',
        endpoint: '/api/convert/pdf/ocr'
    },
    {
        id: 'pdf-to-word',
        title: 'PDF para Word',
        description: 'Converte PDF para documento Word editável',
        icon: '📝',
        price: 'R$ 6,00',
        inputFormat: ['.pdf'],
        outputFormat: 'DOCX',
        category: 'document',
        route: '/convert/pdf-to-word',
        endpoint: '/api/convert/pdf/word'
    },
    {
        id: 'image-to-pdf',
        title: 'Imagem para PDF',
        description: 'Converte imagens (JPG, PNG) para PDF',
        icon: '🖼️',
        price: 'R$ 2,00',
        inputFormat: ['.jpg', '.jpeg', '.png', '.bmp'],
        outputFormat: 'PDF',
        category: 'image',
        route: '/convert/image-to-pdf',
        endpoint: '/api/convert/image/pdf'
    },
    {
        id: 'image-format',
        title: 'Converter Imagem',
        description: 'Converte entre formatos de imagem (JPG, PNG, WebP)',
        icon: '🎨',
        price: 'R$ 1,50',
        inputFormat: ['.jpg', '.jpeg', '.png', '.bmp', '.webp'],
        outputFormat: 'JPG/PNG/WebP',
        category: 'image',
        route: '/convert/image-format',
        endpoint: '/api/convert/image/format'
    },
    {
        id: 'docx-to-pdf',
        title: 'Word para PDF',
        description: 'Converte documentos Word para PDF',
        icon: '📄',
        price: 'R$ 4,00',
        inputFormat: ['.docx', '.doc'],
        outputFormat: 'PDF',
        category: 'document',
        route: '/convert/docx-to-pdf',
        endpoint: '/api/convert/docx/pdf'
    },
    {
        id: 'xlsx-to-csv',
        title: 'Excel para CSV',
        description: 'Converte planilhas Excel para formato CSV',
        icon: '📊',
        price: 'R$ 3,00',
        inputFormat: ['.xlsx', '.xls'],
        outputFormat: 'CSV',
        category: 'spreadsheet',
        route: '/convert/xlsx-to-csv',
        endpoint: '/api/convert/xlsx/csv'
    },
    {
        id: 'csv-to-xlsx',
        title: 'CSV para Excel',
        description: 'Converte arquivos CSV para planilha Excel',
        icon: '📈',
        price: 'R$ 3,00',
        inputFormat: ['.csv'],
        outputFormat: 'XLSX',
        category: 'spreadsheet',
        route: '/convert/csv-to-xlsx',
        endpoint: '/api/convert/csv/xlsx'
    }
];

// Configurações da API
export const API_CONFIG = {
    baseURL: 'http://localhost:8000',
    timeout: 30000,
    maxFileSize: 40 * 1024 * 1024, // 40MB
    supportedFormats: {
        pdf: ['.pdf'],
        image: ['.jpg', '.jpeg', '.png', '.bmp', '.webp'],
        document: ['.docx', '.doc', '.txt'],
        spreadsheet: ['.xlsx', '.xls', '.csv'],
        project: ['.mpp']
    }
};

// Utilitários para buscar ferramentas
export const getToolById = (id) => CONVERSION_TOOLS.find(tool => tool.id === id);
export const getToolsByCategory = (category) => CONVERSION_TOOLS.filter(tool => tool.category === category);
export const getPopularTools = () => CONVERSION_TOOLS.filter(tool => tool.popular);
export const getRecommendedTools = (currentToolId) => {
    const currentTool = getToolById(currentToolId);
    const sameCategory = getToolsByCategory(currentTool?.category || '');
    return sameCategory.filter(tool => tool.id !== currentToolId).slice(0, 4);
};