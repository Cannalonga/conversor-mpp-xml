// Word to PDF Conversion Page Controller
class WordToPDFConverter {
    constructor() {
        this.fileUpload = null;
        this.convertButton = null;
        this.currentFile = null;
        this.conversionOptions = {};
        this.currentZoom = 1;
        
        this.init();
    }
    
    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupPage());
        } else {
            this.setupPage();
        }
    }
    
    setupPage() {
        this.loadComponents();
        this.setupEventListeners();
        this.loadPageConfig();
    }
    
    loadComponents() {
        // Load Navigation
        if (window.NavbarTools) {
            new NavbarTools('navbar-container');
        }
        
        // Load Footer
        if (window.Footer) {
            new Footer('footer-container');
        }
        
        // Load File Upload Component
        if (window.FileUpload) {
            this.fileUpload = new FileUpload('file-upload-container', {
                acceptedFormats: ['.doc', '.docx'],
                maxFileSize: 50 * 1024 * 1024, // 50MB
                icon: 'fas fa-file-word',
                title: 'Selecione seu documento Word',
                subtitle: 'Arraste e solte ou clique para selecionar',
                description: 'Suporte para DOC e DOCX (até 50MB)',
                onFileSelect: (file) => this.handleFileSelect(file),
                onFileRemove: () => this.handleFileRemove()
            });
        }
        
        // Load Convert Button Component
        if (window.ConvertButton) {
            this.convertButton = new ConvertButton('convert-button-container', {
                text: 'Converter Word para PDF',
                price: 5.00,
                icon: 'fas fa-file-pdf',
                onClick: () => this.startConversion(),
                disabled: true
            });
        }
    }
    
    setupEventListeners() {
        // Conversion options
        const optionsForm = document.querySelector('.conversion-options');
        if (optionsForm) {
            optionsForm.addEventListener('change', (e) => this.handleOptionChange(e));
        }
        
        // Password protection toggle
        const passwordCheckbox = document.querySelector('input[name="password-protect"]');
        if (passwordCheckbox) {
            passwordCheckbox.addEventListener('change', (e) => {
                const passwordSection = document.getElementById('password-section');
                if (passwordSection) {
                    passwordSection.style.display = e.target.checked ? 'block' : 'none';
                }
            });
        }
        
        // Results actions
        const convertAnotherBtn = document.getElementById('convert-another-btn');
        if (convertAnotherBtn) {
            convertAnotherBtn.addEventListener('click', () => this.resetPage());
        }
        
        const shareBtn = document.getElementById('share-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => this.shareResult());
        }
        
        // Preview modal
        const previewBtn = document.getElementById('preview-btn');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => this.showPreview());
        }
        
        const closePreviewBtn = document.getElementById('close-preview');
        if (closePreviewBtn) {
            closePreviewBtn.addEventListener('click', () => this.hidePreview());
        }
        
        // Zoom controls
        const zoomInBtn = document.getElementById('zoom-in');
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => this.zoomIn());
        }
        
        const zoomOutBtn = document.getElementById('zoom-out');
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => this.zoomOut());
        }
        
        // Download button
        const downloadBtn = document.getElementById('download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.downloadResult());
        }
        
        // Modal background click
        const previewModal = document.getElementById('preview-modal');
        if (previewModal) {
            previewModal.addEventListener('click', (e) => {
                if (e.target === previewModal) {
                    this.hidePreview();
                }
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }
    
    loadPageConfig() {
        // Get tool config from global config
        if (window.CONVERSION_TOOLS) {
            const toolConfig = window.CONVERSION_TOOLS.find(tool => tool.id === 'word-to-pdf');
            if (toolConfig) {
                this.toolConfig = toolConfig;
                this.updatePageWithConfig(toolConfig);
            }
        }
    }
    
    updatePageWithConfig(config) {
        // Update meta information
        const metaItems = document.querySelectorAll('.meta-item');
        if (metaItems.length >= 2) {
            metaItems[0].innerHTML = `<i class="fas fa-file-word"></i><span>Entrada: ${config.input || 'DOC, DOCX'}</span>`;
            metaItems[1].innerHTML = `<i class="fas fa-file-pdf"></i><span>Saída: ${config.output || 'PDF'}</span>`;
        }
        
        // Update pricing
        if (this.convertButton) {
            this.convertButton.updatePrice(config.price || 5.00);
        }
        
        const priceDisplay = document.querySelector('.amount');
        if (priceDisplay) {
            priceDisplay.textContent = (config.price || 5).toString().split('.')[0];
        }
    }
    
    handleFileSelect(file) {
        this.currentFile = file;
        
        // Validate file type
        const validExtensions = ['.doc', '.docx'];
        const fileName = file.name.toLowerCase();
        const isValidFile = validExtensions.some(ext => fileName.endsWith(ext));
        
        if (!isValidFile) {
            this.showError('Por favor, selecione um arquivo Word válido (.doc ou .docx).');
            return;
        }
        
        // Show conversion options
        const optionsSection = document.getElementById('conversion-options');
        if (optionsSection) {
            optionsSection.style.display = 'block';
            this.animateElement(optionsSection);
        }
        
        // Enable convert button
        if (this.convertButton) {
            this.convertButton.enable();
        }
        
        // Update file info display
        this.updateFileInfo(file);
        
        // Analyze document
        this.analyzeDocument(file);
    }
    
    handleFileRemove() {
        this.currentFile = null;
        
        // Hide conversion options
        const optionsSection = document.getElementById('conversion-options');
        if (optionsSection) {
            optionsSection.style.display = 'none';
        }
        
        // Hide password section
        const passwordSection = document.getElementById('password-section');
        if (passwordSection) {
            passwordSection.style.display = 'none';
        }
        
        // Disable convert button
        if (this.convertButton) {
            this.convertButton.disable();
        }
        
        // Reset any previous results
        this.hideResults();
    }
    
    updateFileInfo(file) {
        const fileSize = this.formatFileSize(file.size);
        console.log(`Selected Word file: ${file.name} (${fileSize})`);
    }
    
    analyzeDocument(file) {
        // Simulate document analysis
        const analysisData = {
            estimatedPages: Math.floor(Math.random() * 20) + 5,
            estimatedWords: Math.floor(Math.random() * 3000) + 1000,
            hasImages: Math.random() > 0.5,
            hasTables: Math.random() > 0.7,
            documentType: file.name.toLowerCase().endsWith('.docx') ? 'DOCX (Word 2007+)' : 'DOC (Word 97-2003)'
        };
        
        console.log('Document analysis:', analysisData);
    }
    
    handleOptionChange(event) {
        const { name, value, checked, type } = event.target;
        
        if (type === 'checkbox') {
            this.conversionOptions[name] = checked;
        } else {
            this.conversionOptions[name] = value;
        }
        
        // Show/hide password section
        if (name === 'password-protect') {
            const passwordSection = document.getElementById('password-section');
            if (passwordSection) {
                passwordSection.style.display = checked ? 'block' : 'none';
                if (checked) {
                    this.animateElement(passwordSection);
                }
            }
        }
        
        console.log('Conversion options updated:', this.conversionOptions);
    }
    
    async startConversion() {
        if (!this.currentFile) {
            this.showError('Nenhum arquivo selecionado.');
            return;
        }
        
        // Validate password if protection is enabled
        if (this.conversionOptions['password-protect']) {
            const passwordField = document.querySelector('input[name="pdf-password"]');
            const password = passwordField ? passwordField.value : '';
            
            if (!password || password.length < 6) {
                this.showError('Digite uma senha válida com pelo menos 6 caracteres.');
                passwordField.focus();
                return;
            }
        }
        
        try {
            // Disable convert button
            if (this.convertButton) {
                this.convertButton.setLoading(true);
            }
            
            // Show progress
            this.showProgress();
            
            // Simulate conversion process
            await this.performConversion();
            
            // Show results
            this.showResults();
            
        } catch (error) {
            console.error('Conversion error:', error);
            this.showError('Erro durante a conversão. Tente novamente.');
        } finally {
            // Re-enable convert button
            if (this.convertButton) {
                this.convertButton.setLoading(false);
            }
        }
    }
    
    async performConversion() {
        // Simulate API call to backend
        const formData = new FormData();
        formData.append('file', this.currentFile);
        formData.append('options', JSON.stringify(this.conversionOptions));
        
        // Progress simulation
        const progressSteps = [
            { step: 1, percentage: 25, text: 'Fazendo upload do documento...' },
            { step: 2, percentage: 50, text: 'Analisando conteúdo e formatação...' },
            { step: 3, percentage: 75, text: 'Convertendo para PDF...' },
            { step: 4, percentage: 100, text: 'Finalizando conversão...' }
        ];
        
        for (const progress of progressSteps) {
            await new Promise(resolve => setTimeout(resolve, 900));
            this.updateProgress(progress.percentage, progress.text, progress.step);
        }
        
        // Calculate estimated output size based on quality setting
        const qualityMultiplier = this.getQualityMultiplier();
        const estimatedSize = Math.round(this.currentFile.size * qualityMultiplier);
        
        // Calculate compression ratio
        const compressionRatio = Math.round((1 - qualityMultiplier) * 100);
        
        // Simulate successful conversion
        this.conversionResult = {
            filename: this.currentFile.name.replace(/\.(doc|docx)$/i, '.pdf'),
            size: estimatedSize,
            downloadUrl: '#',
            pdfContent: this.generateSamplePDF(),
            stats: {
                pages: Math.floor(Math.random() * 15) + 8,
                words: Math.floor(Math.random() * 2500) + 1500,
                images: Math.floor(Math.random() * 8) + 2,
                compressionRatio: compressionRatio
            },
            conversionTime: (Math.random() * 2.5 + 1).toFixed(1) + 's',
            quality: this.getQualityDescription()
        };
    }
    
    getQualityMultiplier() {
        const quality = this.conversionOptions['pdf-quality'] || 'medium';
        const multipliers = {
            'high': 0.9,
            'medium': 0.7,
            'standard': 0.6,
            'compressed': 0.4
        };
        return multipliers[quality] || 0.7;
    }
    
    getQualityDescription() {
        const quality = this.conversionOptions['pdf-quality'] || 'medium';
        const descriptions = {
            'high': 'Excelente',
            'medium': 'Boa',
            'standard': 'Padrão',
            'compressed': 'Comprimida'
        };
        return descriptions[quality] || 'Boa';
    }
    
    generateSamplePDF() {
        // This would contain the actual PDF content in a real implementation
        return {
            pages: [
                {
                    content: 'Primeira página do documento convertido...',
                    pageNumber: 1
                },
                {
                    content: 'Segunda página do documento convertido...',
                    pageNumber: 2
                }
            ]
        };
    }
    
    showProgress() {
        const progressSection = document.getElementById('progress-section');
        if (progressSection) {
            progressSection.style.display = 'block';
            this.animateElement(progressSection);
            
            // Scroll to progress
            progressSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        this.hideResults();
    }
    
    updateProgress(percentage, text, currentStep) {
        const progressFill = document.getElementById('progress-fill');
        if (progressFill) {
            progressFill.style.width = percentage + '%';
        }
        
        const progressPercentage = document.querySelector('.progress-percentage');
        if (progressPercentage) {
            progressPercentage.textContent = percentage + '%';
        }
        
        const progressHeader = document.querySelector('.progress-header h4');
        if (progressHeader) {
            progressHeader.innerHTML = `<i class="fas fa-sync fa-spin"></i> ${text}`;
        }
        
        // Update step indicators
        const steps = document.querySelectorAll('.step');
        steps.forEach((step, index) => {
            const stepNumber = index + 1;
            if (stepNumber <= currentStep) {
                step.classList.add('active');
                if (stepNumber === currentStep) {
                    step.classList.add('current');
                } else {
                    step.classList.remove('current');
                    step.classList.add('completed');
                }
            }
        });
    }
    
    showResults() {
        // Hide progress
        const progressSection = document.getElementById('progress-section');
        if (progressSection) {
            progressSection.style.display = 'none';
        }
        
        // Show results
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) {
            resultsSection.style.display = 'block';
            this.animateElement(resultsSection);
            
            // Update result information
            this.updateResultsDisplay();
            
            // Scroll to results
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    updateResultsDisplay() {
        const result = this.conversionResult;
        
        // Update filename
        const filenameElement = document.getElementById('output-filename');
        if (filenameElement) {
            filenameElement.textContent = result.filename;
        }
        
        // Update file size
        const sizeElement = document.getElementById('output-size');
        if (sizeElement) {
            sizeElement.textContent = this.formatFileSize(result.size);
        }
        
        // Update conversion time
        const timeElement = document.getElementById('conversion-time');
        if (timeElement) {
            timeElement.textContent = result.conversionTime;
        }
        
        // Update quality indicator
        const qualityElement = document.querySelector('.quality');
        if (qualityElement) {
            qualityElement.textContent = result.quality;
            // Update class based on quality
            qualityElement.className = 'quality ' + (result.quality === 'Excelente' ? 'excellent' : 
                                                    result.quality === 'Boa' ? 'good' : 
                                                    result.quality === 'Padrão' ? 'standard' : 'compressed');
        }
        
        // Update statistics
        const stats = result.stats;
        const pagesCount = document.getElementById('pages-count');
        const wordsCount = document.getElementById('words-count');
        const imagesCount = document.getElementById('images-count');
        const compressionRatio = document.getElementById('compression-ratio');
        
        if (pagesCount) pagesCount.textContent = stats.pages;
        if (wordsCount) wordsCount.textContent = this.formatNumber(stats.words);
        if (imagesCount) imagesCount.textContent = stats.images;
        if (compressionRatio) compressionRatio.textContent = stats.compressionRatio + '%';
    }
    
    hideResults() {
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) {
            resultsSection.style.display = 'none';
        }
    }
    
    showPreview() {
        const modal = document.getElementById('preview-modal');
        
        if (modal && this.conversionResult) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            // Reset zoom
            this.currentZoom = 1;
            this.updatePreviewZoom();
            
            // Animate modal
            requestAnimationFrame(() => {
                modal.classList.add('show');
            });
        }
    }
    
    hidePreview() {
        const modal = document.getElementById('preview-modal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
    }
    
    zoomIn() {
        this.currentZoom = Math.min(this.currentZoom + 0.2, 2);
        this.updatePreviewZoom();
    }
    
    zoomOut() {
        this.currentZoom = Math.max(this.currentZoom - 0.2, 0.5);
        this.updatePreviewZoom();
    }
    
    updatePreviewZoom() {
        const pdfPage = document.querySelector('.pdf-page');
        if (pdfPage) {
            pdfPage.style.transform = `scale(${this.currentZoom})`;
            pdfPage.style.transformOrigin = 'center top';
        }
    }
    
    downloadResult() {
        if (this.conversionResult) {
            // In a real implementation, this would download the actual PDF
            // For now, we'll create a sample PDF content
            const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Documento convertido de Word para PDF) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000000367 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
446
%%EOF`;
            
            // Create download
            const blob = new Blob([pdfContent], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = this.conversionResult.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            // Track download
            if (window.gtag) {
                gtag('event', 'download', {
                    event_category: 'conversion',
                    event_label: 'word-to-pdf'
                });
            }
            
            this.showSuccess('Download iniciado com sucesso!');
        }
    }
    
    shareResult() {
        if (navigator.share && this.conversionResult) {
            navigator.share({
                title: 'Conversão Word para PDF concluída',
                text: `Converti meu documento ${this.currentFile.name} para PDF usando o Conversor Online`,
                url: window.location.href
            }).catch(console.error);
        } else {
            // Fallback: copy link to clipboard
            navigator.clipboard.writeText(window.location.href).then(() => {
                this.showSuccess('Link copiado para a área de transferência!');
            });
        }
    }
    
    resetPage() {
        // Reset file upload
        if (this.fileUpload) {
            this.fileUpload.reset();
        }
        
        // Reset current file
        this.currentFile = null;
        this.conversionResult = null;
        this.conversionOptions = {};
        this.currentZoom = 1;
        
        // Hide sections
        this.hideResults();
        const progressSection = document.getElementById('progress-section');
        if (progressSection) {
            progressSection.style.display = 'none';
        }
        
        const optionsSection = document.getElementById('conversion-options');
        if (optionsSection) {
            optionsSection.style.display = 'none';
        }
        
        const passwordSection = document.getElementById('password-section');
        if (passwordSection) {
            passwordSection.style.display = 'none';
        }
        
        // Reset form
        const optionsForm = document.querySelector('.conversion-options');
        if (optionsForm) {
            optionsForm.reset();
        }
        
        // Reset password checkbox
        const passwordCheckbox = document.querySelector('input[name="password-protect"]');
        if (passwordCheckbox) {
            passwordCheckbox.checked = false;
        }
        
        // Disable convert button
        if (this.convertButton) {
            this.convertButton.disable();
        }
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    handleKeyboard(event) {
        // ESC key closes modal
        if (event.key === 'Escape') {
            this.hidePreview();
        }
        
        // Ctrl+Enter starts conversion
        if (event.ctrlKey && event.key === 'Enter' && this.currentFile) {
            event.preventDefault();
            this.startConversion();
        }
        
        // Plus key zooms in (in preview)
        if (event.key === '+' || event.key === '=') {
            const modal = document.getElementById('preview-modal');
            if (modal && modal.style.display === 'flex') {
                event.preventDefault();
                this.zoomIn();
            }
        }
        
        // Minus key zooms out (in preview)
        if (event.key === '-') {
            const modal = document.getElementById('preview-modal');
            if (modal && modal.style.display === 'flex') {
                event.preventDefault();
                this.zoomOut();
            }
        }
    }
    
    // Utility methods
    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    
    animateElement(element) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        
        requestAnimationFrame(() => {
            element.style.transition = 'all 0.3s ease';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        });
    }
    
    showError(message) {
        // Create or update error notification
        let errorDiv = document.querySelector('.error-notification');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-notification';
            document.body.appendChild(errorDiv);
        }
        
        errorDiv.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-exclamation-circle"></i>
                <span>${message}</span>
                <button class="close-notification">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        errorDiv.classList.add('show');
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            errorDiv.classList.remove('show');
        }, 5000);
        
        // Close button
        const closeBtn = errorDiv.querySelector('.close-notification');
        closeBtn.addEventListener('click', () => {
            errorDiv.classList.remove('show');
        });
    }
    
    showSuccess(message) {
        // Create or update success notification
        let successDiv = document.querySelector('.success-notification');
        if (!successDiv) {
            successDiv = document.createElement('div');
            successDiv.className = 'success-notification';
            document.body.appendChild(successDiv);
        }
        
        successDiv.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-check-circle"></i>
                <span>${message}</span>
                <button class="close-notification">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        successDiv.classList.add('show');
        
        // Auto hide after 3 seconds
        setTimeout(() => {
            successDiv.classList.remove('show');
        }, 3000);
        
        // Close button
        const closeBtn = successDiv.querySelector('.close-notification');
        closeBtn.addEventListener('click', () => {
            successDiv.classList.remove('show');
        });
    }
}

// Initialize the page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new WordToPDFConverter();
});

// Also handle case where script loads after DOM is ready
if (document.readyState !== 'loading') {
    new WordToPDFConverter();
}