// Simple Router for Conversion Tools
class ConversionRouter {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.basePath = '/frontend/src';
        
        this.setupRoutes();
        this.init();
    }
    
    init() {
        // Handle browser navigation
        window.addEventListener('popstate', (e) => this.handlePopState(e));
        
        // Handle page links
        document.addEventListener('click', (e) => this.handleLinkClick(e));
        
        // Load initial route
        this.loadCurrentRoute();
    }
    
    setupRoutes() {
        // Define all conversion tool routes
        const tools = [
            { id: 'mpp-to-xml', path: '/convert/mpp-to-xml', file: 'pages/convert/mpp-to-xml.html' },
            { id: 'pdf-to-text', path: '/convert/pdf-to-text', file: 'pages/convert/pdf-to-text.html' },
            { id: 'pdf-merge', path: '/convert/pdf-merge', file: 'pages/convert/pdf-merge.html' },
            { id: 'pdf-split', path: '/convert/pdf-split', file: 'pages/convert/pdf-split.html' },
            { id: 'pdf-compress', path: '/convert/pdf-compress', file: 'pages/convert/pdf-compress.html' },
            { id: 'pdf-ocr', path: '/convert/pdf-ocr', file: 'pages/convert/pdf-ocr.html' },
            { id: 'pdf-to-word', path: '/convert/pdf-to-word', file: 'pages/convert/pdf-to-word.html' },
            { id: 'word-to-pdf', path: '/convert/word-to-pdf', file: 'pages/convert/word-to-pdf.html' },
            { id: 'excel-to-pdf', path: '/convert/excel-to-pdf', file: 'pages/convert/excel-to-pdf.html' },
            { id: 'powerpoint-to-pdf', path: '/convert/powerpoint-to-pdf', file: 'pages/convert/powerpoint-to-pdf.html' },
            { id: 'image-converter', path: '/convert/image-converter', file: 'pages/convert/image-converter.html' },
            { id: 'image-resize', path: '/convert/image-resize', file: 'pages/convert/image-resize.html' }
        ];
        
        // Register routes
        tools.forEach(tool => {
            this.routes.set(tool.path, {
                id: tool.id,
                file: tool.file,
                title: this.getToolTitle(tool.id)
            });
        });
        
        // Home route
        this.routes.set('/', {
            id: 'home',
            file: 'index.html',
            title: 'Conversor de Arquivos Online'
        });
    }
    
    getToolTitle(toolId) {
        const titles = {
            'mpp-to-xml': 'Converter MPP para XML',
            'pdf-to-text': 'PDF para Texto',
            'pdf-merge': 'Juntar PDFs',
            'pdf-split': 'Dividir PDF',
            'pdf-compress': 'Comprimir PDF',
            'pdf-ocr': 'PDF OCR',
            'pdf-to-word': 'PDF para Word',
            'word-to-pdf': 'Word para PDF',
            'excel-to-pdf': 'Excel para PDF',
            'powerpoint-to-pdf': 'PowerPoint para PDF',
            'image-converter': 'Converter Imagens',
            'image-resize': 'Redimensionar Imagens'
        };
        
        return titles[toolId] || 'Conversor de Arquivos';
    }
    
    handleLinkClick(event) {
        const link = event.target.closest('a');
        if (!link) return;
        
        const href = link.getAttribute('href');
        if (!href || href.startsWith('http') || href.startsWith('#') || href.includes('@')) {
            return; // External link, hash link, or email
        }
        
        // Check if it's a route we handle
        const route = this.normalizeRoute(href);
        if (this.routes.has(route)) {
            event.preventDefault();
            this.navigate(route);
        }
    }
    
    handlePopState(event) {
        this.loadCurrentRoute();
    }
    
    navigate(path, updateHistory = true) {
        const route = this.routes.get(path);
        if (!route) {
            console.warn(`Route not found: ${path}`);
            return;
        }
        
        // Update browser history
        if (updateHistory) {
            const fullUrl = window.location.origin + this.basePath + path;
            history.pushState({ route: path }, route.title, path);
        }
        
        // Update page title
        document.title = route.title;
        
        // Load the page content
        this.loadPage(route);
        
        this.currentRoute = path;
    }
    
    loadCurrentRoute() {
        let path = window.location.pathname;
        
        // Remove base path if present
        if (path.startsWith(this.basePath)) {
            path = path.substring(this.basePath.length);
        }
        
        // Normalize path
        path = this.normalizeRoute(path);
        
        // Default to home if route not found
        if (!this.routes.has(path)) {
            path = '/';
        }
        
        this.navigate(path, false);
    }
    
    normalizeRoute(path) {
        // Remove file extensions and normalize
        path = path.replace(/\.html$/, '');
        
        // Ensure leading slash
        if (!path.startsWith('/')) {
            path = '/' + path;
        }
        
        // Remove trailing slash (except for root)
        if (path.length > 1 && path.endsWith('/')) {
            path = path.slice(0, -1);
        }
        
        return path;
    }
    
    async loadPage(route) {
        try {
            // Show loading state
            this.showLoadingState();
            
            // For SPA-style navigation, we would load content dynamically
            // For now, we'll redirect to the actual file
            const fullPath = route.file;
            
            if (route.id === 'home') {
                window.location.href = '../index.html';
            } else {
                // Check if we're already on the right page
                const currentFile = window.location.pathname.split('/').pop();
                const targetFile = route.file.split('/').pop();
                
                if (currentFile !== targetFile) {
                    window.location.href = `./${targetFile}`;
                }
            }
            
        } catch (error) {
            console.error('Error loading page:', error);
            this.showErrorState();
        }
    }
    
    showLoadingState() {
        // Add loading indicator if needed
        const body = document.body;
        body.classList.add('page-loading');
    }
    
    hideLoadingState() {
        const body = document.body;
        body.classList.remove('page-loading');
    }
    
    showErrorState() {
        this.hideLoadingState();
        console.error('Failed to load page');
    }
    
    // Public API methods
    static navigate(path) {
        if (window.conversionRouter) {
            window.conversionRouter.navigate(path);
        }
    }
    
    static getCurrentRoute() {
        return window.conversionRouter ? window.conversionRouter.currentRoute : null;
    }
    
    static getRoutes() {
        return window.conversionRouter ? Array.from(window.conversionRouter.routes.keys()) : [];
    }
}

// URL Helper Functions
class URLHelper {
    static getToolUrl(toolId) {
        const toolRoutes = {
            'mpp-to-xml': '/convert/mpp-to-xml',
            'pdf-to-text': '/convert/pdf-to-text',
            'pdf-merge': '/convert/pdf-merge',
            'pdf-split': '/convert/pdf-split',
            'pdf-compress': '/convert/pdf-compress',
            'pdf-ocr': '/convert/pdf-ocr',
            'pdf-to-word': '/convert/pdf-to-word',
            'word-to-pdf': '/convert/word-to-pdf',
            'excel-to-pdf': '/convert/excel-to-pdf',
            'powerpoint-to-pdf': '/convert/powerpoint-to-pdf',
            'image-converter': '/convert/image-converter',
            'image-resize': '/convert/image-resize'
        };
        
        return toolRoutes[toolId] || '/';
    }
    
    static getToolFile(toolId) {
        return `./${toolId}.html`;
    }
    
    static buildUrl(path, params = {}) {
        const url = new URL(path, window.location.origin);
        Object.keys(params).forEach(key => {
            url.searchParams.set(key, params[key]);
        });
        return url.toString();
    }
    
    static getUrlParams() {
        const params = {};
        const urlParams = new URLSearchParams(window.location.search);
        for (const [key, value] of urlParams) {
            params[key] = value;
        }
        return params;
    }
    
    static updateUrlParams(params) {
        const url = new URL(window.location);
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                url.searchParams.set(key, params[key]);
            } else {
                url.searchParams.delete(key);
            }
        });
        history.replaceState({}, '', url);
    }
}

// Navigation Helper for updating links dynamically
class NavigationHelper {
    static updateToolLinks() {
        // Update all tool links to use correct paths
        const toolLinks = document.querySelectorAll('[data-tool-id]');
        toolLinks.forEach(link => {
            const toolId = link.getAttribute('data-tool-id');
            const toolUrl = URLHelper.getToolFile(toolId);
            link.href = toolUrl;
        });
    }
    
    static updateBreadcrumbs(currentTool = null) {
        const breadcrumb = document.querySelector('.breadcrumb');
        if (!breadcrumb) return;
        
        let breadcrumbHTML = '<a href="../index.html">Início</a>';
        breadcrumbHTML += '<span class="separator">›</span>';
        breadcrumbHTML += '<a href="../index.html#tools">Conversores</a>';
        
        if (currentTool) {
            const toolConfig = window.CONVERSION_TOOLS?.find(tool => tool.id === currentTool);
            if (toolConfig) {
                breadcrumbHTML += '<span class="separator">›</span>';
                breadcrumbHTML += `<span class="current">${toolConfig.name}</span>`;
            }
        }
        
        breadcrumb.innerHTML = breadcrumbHTML;
    }
    
    static highlightActiveNavItem(currentTool = null) {
        // Remove active class from all nav items
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => item.classList.remove('active'));
        
        // Add active class to current tool
        if (currentTool) {
            const activeItem = document.querySelector(`[data-tool-id="${currentTool}"]`);
            if (activeItem) {
                const navItem = activeItem.closest('.nav-item');
                if (navItem) {
                    navItem.classList.add('active');
                }
            }
        }
    }
}

// Initialize router when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're in a conversion page context
    if (window.location.pathname.includes('/convert/') || window.location.pathname.includes('index.html')) {
        window.conversionRouter = new ConversionRouter();
        
        // Update navigation helpers
        NavigationHelper.updateToolLinks();
        
        // Extract tool ID from current page
        const currentFile = window.location.pathname.split('/').pop();
        const currentTool = currentFile.replace('.html', '');
        
        if (currentTool && currentTool !== 'index') {
            NavigationHelper.updateBreadcrumbs(currentTool);
            NavigationHelper.highlightActiveNavItem(currentTool);
        }
    }
});

// Export for use in other modules
window.ConversionRouter = ConversionRouter;
window.URLHelper = URLHelper;
window.NavigationHelper = NavigationHelper;