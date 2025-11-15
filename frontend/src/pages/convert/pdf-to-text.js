// PDF to Text Page Controller
class PDFToTextPage {
    constructor() {
        this.fileUpload = null;
        this.convertButton = null;
        this.currentFile = null;
        this.conversionResult = null;
        this.init();
    }

    async init() {
        // Initialize components
        this.initNavbar();
        this.initFileUpload();
        this.initConvertButton();
        this.initRelatedTools();
        
        // Set active page
        this.setActivePage();
        
        console.log('PDF to Text page initialized');
    }

    initNavbar() {
        const navbarContainer = document.getElementById('navbar-container');
        const navbar = new NavbarTools();
        navbar.render(navbarContainer);
        navbar.setActiveItem('/convert/pdf-to-text');
    }

    initFileUpload() {
        const uploadContainer = document.getElementById('file-upload-container');
        
        this.fileUpload = new FileUpload({
            acceptedTypes: ['.pdf'],
            maxFileSize: 40 * 1024 * 1024, // 40MB
            multiple: false,
            uploadText: 'Arraste seu arquivo PDF aqui ou clique para selecionar',
            uploadIcon: '📄',
            showPreview: false,
            onFileSelect: (files) => this.handleFileSelect(files),
            onFileRemove: () => this.handleFileRemove(),
            onError: (error) => this.showError(error)
        });

        this.fileUpload.render(uploadContainer);
    }

    initConvertButton() {
        const buttonContainer = document.getElementById('convert-button-container');
        
        this.convertButton = new ConvertButton({
            text: 'Converter PDF para Texto',
            icon: '🔄',
            size: 'lg',
            disabled: true,
            onClick: () => this.handleConvert()
        });

        this.convertButton.render(buttonContainer);
    }

    initRelatedTools() {
        const relatedContainer = document.getElementById('related-tools');
        const currentTool = getToolById('pdf-to-text');
        const relatedTools = getRecommendedTools('pdf-to-text');

        relatedContainer.innerHTML = relatedTools.map(tool => `
            <a href="${tool.route}" class="related-tool-item">
                <div class="tool-icon">${tool.icon}</div>
                <div class="tool-info">
                    <div class="tool-name">${tool.title}</div>
                    <div class="tool-price">${tool.price}</div>
                </div>
            </a>
        `).join('');
    }

    handleFileSelect(files) {
        if (files.length > 0) {
            this.currentFile = files[0];
            this.convertButton.setDisabled(false);
            this.showConversionControls();
            this.hideResult();
            
            console.log('File selected:', this.currentFile.name);
        }
    }

    handleFileRemove() {
        this.currentFile = null;
        this.convertButton.setDisabled(true);
        this.hideConversionControls();
        this.hideResult();
        
        console.log('File removed');
    }

    async handleConvert() {
        if (!this.currentFile) {
            this.showError('Nenhum arquivo selecionado');
            return;
        }

        try {
            // Get conversion options
            const outputFormat = document.getElementById('output-format').value;
            const encoding = document.getElementById('encoding').value;

            // Create form data
            const formData = new FormData();
            formData.append('file', this.currentFile);
            formData.append('output_format', outputFormat);
            formData.append('encoding', encoding);

            // Make API request
            const response = await fetch(`${API_CONFIG.baseURL}/api/convert/pdf/text`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Erro na conversão: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.conversionResult = result;
                this.showResult(result);
                this.trackConversion('pdf-to-text', true);
            } else {
                throw new Error(result.message || 'Erro desconhecido na conversão');
            }

        } catch (error) {
            console.error('Conversion error:', error);
            this.showError(error.message);
            this.trackConversion('pdf-to-text', false);
            throw error; // Re-throw to trigger button error state
        }
    }

    showConversionControls() {
        const controls = document.getElementById('conversion-controls');
        controls.style.display = 'block';
        controls.classList.add('animate-fade-in');
    }

    hideConversionControls() {
        const controls = document.getElementById('conversion-controls');
        controls.style.display = 'none';
        controls.classList.remove('animate-fade-in');
    }

    showResult(result) {
        const resultSection = document.getElementById('result-section');
        const resultContent = document.getElementById('result-content');

        resultContent.innerHTML = `
            <div class="result-success">
                <div class="result-header">
                    <div class="result-icon">✅</div>
                    <div class="result-info">
                        <h4>Conversão Concluída!</h4>
                        <p>Texto extraído com sucesso do seu PDF</p>
                    </div>
                </div>

                <div class="result-stats">
                    <div class="stat-item">
                        <span class="stat-label">Arquivo:</span>
                        <span class="stat-value">${result.filename}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Tamanho:</span>
                        <span class="stat-value">${this.formatFileSize(result.file_size)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Caracteres extraídos:</span>
                        <span class="stat-value">${result.text_length.toLocaleString()}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">ID da conversão:</span>
                        <span class="stat-value">${result.conversion_id}</span>
                    </div>
                </div>

                <div class="result-preview">
                    <h5>Prévia do texto extraído:</h5>
                    <div class="text-preview">
                        ${this.truncateText(result.extracted_text, 500)}
                    </div>
                    ${result.extracted_text.length > 500 ? '<p class="preview-note">Mostrando apenas os primeiros 500 caracteres...</p>' : ''}
                </div>

                <div class="result-actions">
                    <button class="btn btn-success btn-lg" onclick="pdfToTextPage.downloadText()">
                        <span class="btn-icon">⬇️</span>
                        <span class="btn-text">Baixar Arquivo de Texto</span>
                    </button>
                    
                    <button class="btn btn-outline" onclick="pdfToTextPage.copyToClipboard()">
                        <span class="btn-icon">📋</span>
                        <span class="btn-text">Copiar Texto</span>
                    </button>
                    
                    <button class="btn btn-secondary" onclick="pdfToTextPage.convertAnother()">
                        <span class="btn-icon">🔄</span>
                        <span class="btn-text">Converter Outro PDF</span>
                    </button>
                </div>

                <div class="payment-info">
                    <div class="payment-icon">💰</div>
                    <div class="payment-text">
                        <strong>Valor da conversão: ${result.price}</strong>
                        <p>Pagamento seguro via PIX</p>
                    </div>
                </div>
            </div>
        `;

        resultSection.style.display = 'block';
        resultSection.classList.add('animate-fade-in');
        
        // Scroll to result
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    hideResult() {
        const resultSection = document.getElementById('result-section');
        resultSection.style.display = 'none';
        resultSection.classList.remove('animate-fade-in');
    }

    downloadText() {
        if (!this.conversionResult) {
            this.showError('Nenhum resultado para download');
            return;
        }

        const text = this.conversionResult.extracted_text;
        const filename = this.conversionResult.filename.replace('.pdf', '.txt');
        
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        
        this.showSuccess('Download iniciado!');
        this.trackDownload('pdf-to-text');
    }

    async copyToClipboard() {
        if (!this.conversionResult) {
            this.showError('Nenhum texto para copiar');
            return;
        }

        try {
            await navigator.clipboard.writeText(this.conversionResult.extracted_text);
            this.showSuccess('Texto copiado para a área de transferência!');
        } catch (error) {
            console.error('Copy to clipboard failed:', error);
            this.showError('Erro ao copiar texto');
        }
    }

    convertAnother() {
        // Reset form
        this.fileUpload.clear();
        this.currentFile = null;
        this.conversionResult = null;
        this.convertButton.setDisabled(true);
        this.hideConversionControls();
        this.hideResult();
        
        // Reset form values
        document.getElementById('output-format').value = 'txt';
        document.getElementById('encoding').value = 'utf-8';
        
        // Scroll to top
        document.querySelector('.page-header').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
        
        this.showSuccess('Pronto para nova conversão!');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existing = document.querySelector('.notification');
        if (existing) {
            existing.remove();
        }

        // Create notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) {
            return text.replace(/\n/g, '<br>');
        }
        return text.substring(0, maxLength).replace(/\n/g, '<br>') + '...';
    }

    setActivePage() {
        document.body.classList.add('page-pdf-to-text');
    }

    // Analytics tracking
    trackConversion(tool, success) {
        // Analytics tracking would go here
        console.log(`Conversion tracked: ${tool}, success: ${success}`);
    }

    trackDownload(tool) {
        // Analytics tracking would go here
        console.log(`Download tracked: ${tool}`);
    }
}

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.pdfToTextPage = new PDFToTextPage();
});