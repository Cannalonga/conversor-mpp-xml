# Frontend - Conversor de Arquivos Online

## Visão Geral

Este é o frontend completo para a aplicação de conversão de arquivos, desenvolvido com HTML5, CSS3 e JavaScript vanilla. A aplicação oferece 12+ ferramentas de conversão com interface moderna, responsiva e componentes reutilizáveis.

## 🏗️ Estrutura do Projeto

```
frontend/src/
├── components/
│   └── common/
│       ├── NavbarTools.js      # Navegação principal com menus dropdown
│       ├── FileUpload.js       # Componente de upload com drag & drop
│       ├── ConvertButton.js    # Botão de conversão com estados
│       └── Footer.js           # Rodapé reutilizável
├── pages/
│   └── convert/
│       ├── mpp-to-xml.html     # Conversão MPP para XML
│       ├── mpp-to-xml.js       # Controller MPP para XML
│       ├── pdf-to-text.html    # Conversão PDF para texto
│       ├── pdf-to-text.js      # Controller PDF para texto
│       ├── pdf-merge.html      # Juntar múltiplos PDFs
│       ├── pdf-merge.js        # Controller juntar PDFs
│       ├── word-to-pdf.html    # Conversão Word para PDF
│       ├── word-to-pdf.js      # Controller Word para PDF
│       ├── image-converter.html # Conversão de imagens
│       └── image-converter.js  # Controller conversão imagens
├── styles/
│   ├── global.css              # Sistema de design e estilos globais
│   ├── homepage.css            # Estilos específicos da homepage
│   └── conversion.css          # Estilos para páginas de conversão
├── utils/
│   ├── config.js               # Configurações das ferramentas
│   └── router.js               # Sistema de roteamento
├── index.html                  # Homepage principal
└── index.js                    # Controller da homepage
```

## 🔧 Ferramentas de Conversão

### Implementadas:
1. **MPP para XML** - Conversão de arquivos Microsoft Project
2. **PDF para Texto** - Extração de texto de PDFs
3. **Juntar PDFs** - Combinar múltiplos PDFs
4. **Word para PDF** - Conversão de documentos Word
5. **Conversor de Imagens** - Entre JPG, PNG, WEBP, etc.

### Configuradas (prontas para implementação):
6. **Dividir PDF** - Separar páginas de PDF
7. **Comprimir PDF** - Reduzir tamanho de PDFs
8. **PDF OCR** - Reconhecimento de texto em PDFs
9. **Excel para PDF** - Conversão de planilhas
10. **PowerPoint para PDF** - Conversão de apresentações
11. **Redimensionar Imagens** - Alterar dimensões de imagens

## 🎨 Sistema de Design

### CSS Custom Properties
```css
/* Cores */
--primary-color: #4F46E5;
--secondary-color: #7C3AED;
--success-color: #10B981;
--warning-color: #F59E0B;
--error-color: #EF4444;

/* Espaçamento */
--space-1: 0.25rem; /* 4px */
--space-2: 0.5rem;  /* 8px */
--space-3: 0.75rem; /* 12px */
/* ... até --space-20 */

/* Tipografia */
--font-size-xs: 0.75rem;
--font-size-sm: 0.875rem;
--font-size-base: 1rem;
/* ... até --font-size-6xl */
```

### Componentes Reutilizáveis
- **Botões**: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-outline`
- **Cards**: `.card`, `.card-header`, `.card-body`, `.card-footer`
- **Grid**: `.grid`, `.grid-cols-*`, `.gap-*`
- **Utilidades**: `.text-center`, `.hidden`, `.flex`, `.items-center`

## 📱 Responsividade

### Breakpoints
- **Mobile**: `< 480px`
- **Tablet**: `481px - 768px`
- **Desktop**: `769px - 1024px`
- **Large**: `> 1024px`

### Características
- Design mobile-first
- Grids responsivos
- Navegação adaptativa
- Componentes flexíveis

## ⚡ Funcionalidades

### Upload de Arquivos
```javascript
// Configuração do FileUpload
new FileUpload('container-id', {
    acceptedFormats: ['.pdf', '.docx'],
    maxFileSize: 50 * 1024 * 1024, // 50MB
    onFileSelect: (file) => console.log(file),
    onFileRemove: () => console.log('removed')
});
```

### Sistema de Navegação
```javascript
// Navegação entre páginas
ConversionRouter.navigate('/convert/pdf-to-text');

// Obter rota atual
const currentRoute = ConversionRouter.getCurrentRoute();
```

### Componentes de Estado
- **Loading**: Estados de carregamento com animações
- **Progress**: Barras de progresso com etapas
- **Success/Error**: Notificações de feedback
- **Modal**: Janelas modais para previews

## 🔗 Integração com Backend

### APIs Configuradas
```javascript
// config.js
const API_CONFIG = {
    baseUrl: '/api',
    endpoints: {
        'mpp-to-xml': '/convert/mpp-xml',
        'pdf-to-text': '/convert/pdf-text',
        // ... outros endpoints
    }
};
```

### Método de Conversão
```javascript
async performConversion() {
    const formData = new FormData();
    formData.append('file', this.currentFile);
    formData.append('options', JSON.stringify(this.options));
    
    const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
    });
    
    return response.json();
}
```

## 🛠️ Como Usar

### 1. Estrutura de Página
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <link rel="stylesheet" href="../styles/global.css">
    <link rel="stylesheet" href="../styles/conversion.css">
</head>
<body>
    <nav id="navbar-container"></nav>
    <main>
        <div id="file-upload-container"></div>
        <div id="convert-button-container"></div>
    </main>
    <footer id="footer-container"></footer>
    
    <script src="../components/common/NavbarTools.js"></script>
    <script src="../components/common/FileUpload.js"></script>
    <script src="../components/common/ConvertButton.js"></script>
    <script src="./page-controller.js"></script>
</body>
</html>
```

### 2. Controller de Página
```javascript
class PageConverter {
    constructor() {
        this.loadComponents();
        this.setupEventListeners();
    }
    
    loadComponents() {
        new NavbarTools('navbar-container');
        this.fileUpload = new FileUpload('file-upload-container', options);
        this.convertButton = new ConvertButton('convert-button-container', options);
    }
}

new PageConverter();
```

## 🎯 SEO e Performance

### Meta Tags Otimizadas
- **Title**: Específico para cada ferramenta
- **Description**: Focada na conversão específica
- **Open Graph**: Compartilhamento social
- **Structured Data**: Schema.org para ferramentas

### Performance
- **CSS**: Minificado e otimizado
- **JavaScript**: Modular e lazy loading
- **Imagens**: Lazy loading e formatos modernos
- **Fonts**: Preload de fontes críticas

## 🔧 Desenvolvimento

### Adicionando Nova Ferramenta
1. **Configurar ferramenta** em `utils/config.js`
2. **Criar página HTML** usando template base
3. **Desenvolver controller JavaScript** específico
4. **Atualizar sistema de roteamento**
5. **Testar responsividade e funcionalidade**

### Estrutura do Controller
```javascript
class NewToolConverter {
    constructor() {
        this.currentFile = null;
        this.toolConfig = null;
        this.init();
    }
    
    init() {
        this.loadComponents();
        this.setupEventListeners();
        this.loadPageConfig();
    }
    
    // Métodos principais:
    // - handleFileSelect()
    // - startConversion()
    // - showProgress()
    // - showResults()
    // - resetPage()
}
```

## 📊 Analytics

### Eventos Rastreados
```javascript
// Google Analytics 4
gtag('event', 'conversion_started', {
    event_category: 'conversion',
    event_label: 'mpp-to-xml',
    tool_name: 'MPP to XML'
});

gtag('event', 'download', {
    event_category: 'conversion',
    event_label: 'mpp-to-xml',
    file_size: 1024000
});
```

## 🚀 Deploy e Produção

### Checklist de Deploy
- [ ] Minificar CSS e JavaScript
- [ ] Otimizar imagens
- [ ] Configurar CDN para assets
- [ ] Configurar cache headers
- [ ] Testar em diferentes browsers
- [ ] Validar acessibilidade
- [ ] Verificar performance (Lighthouse)

### Configurações de Produção
```javascript
const PRODUCTION_CONFIG = {
    apiUrl: 'https://api.conversor.com',
    analyticsId: 'G-XXXXXXXXXX',
    enableCompression: true,
    cacheVersion: '1.0.0'
};
```

## 🧪 Testes

### Testes Responsivos
- Chrome DevTools
- Firefox Responsive Design
- Safari Web Inspector
- Dispositivos físicos

### Compatibilidade
- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

## 📈 Próximos Passos

1. **Implementar páginas restantes** (PDF Split, Compress, etc.)
2. **Otimizar performance** (lazy loading, code splitting)
3. **Adicionar testes automatizados**
4. **Implementar PWA** (Service Worker, offline support)
5. **Adicionar internacionalização** (i18n)

## 📝 Notas de Desenvolvimento

- **Padrão de código**: ES6+ com classes
- **Nomenclatura**: camelCase para JS, kebab-case para CSS
- **Comentários**: JSDoc para funções principais
- **Git**: Commits semânticos com prefixos

---

**Desenvolvido com ❤️ para conversão eficiente de arquivos**