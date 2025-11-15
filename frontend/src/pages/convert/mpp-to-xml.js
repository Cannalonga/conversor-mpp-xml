// MPP to XML Conversion Page Controller
class MPPToXMLConverter {
    constructor() {
        this.fileUpload = null;
        this.convertButton = null;
        this.currentFile = null;
        this.conversionOptions = {};
        
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
                acceptedFormats: ['.mpp'],
                maxFileSize: 100 * 1024 * 1024, // 100MB
                icon: 'fas fa-project-diagram',
                title: 'Selecione seu arquivo MPP',
                subtitle: 'Arraste e solte ou clique para selecionar',
                description: 'Suporte para Microsoft Project 2007-365 (até 100MB)',
                onFileSelect: (file) => this.handleFileSelect(file),
                onFileRemove: () => this.handleFileRemove()
            });
        }
        
        // Load Convert Button Component
        if (window.ConvertButton) {
            this.convertButton = new ConvertButton('convert-button-container', {
                text: 'Converter MPP para XML',
                price: 10.00,
                icon: 'fas fa-code',
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
        
        const copyXmlBtn = document.getElementById('copy-xml');
        if (copyXmlBtn) {
            copyXmlBtn.addEventListener('click', () => this.copyXmlToClipboard());
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
            const toolConfig = window.CONVERSION_TOOLS.find(tool => tool.id === 'mpp-to-xml');
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
            metaItems[0].innerHTML = `<i class="fas fa-file-archive"></i><span>Entrada: ${config.input}</span>`;
            metaItems[1].innerHTML = `<i class="fas fa-code"></i><span>Saída: ${config.output}</span>`;
        }
        
        // Update pricing
        if (this.convertButton) {
            this.convertButton.updatePrice(config.price);
        }
        
        const priceDisplay = document.querySelector('.amount');
        if (priceDisplay) {
            priceDisplay.textContent = config.price.toString().split('.')[0];
        }
    }
    
    handleFileSelect(file) {
        this.currentFile = file;
        
        // Validate file type
        if (!file.name.toLowerCase().endsWith('.mpp')) {
            this.showError('Por favor, selecione um arquivo .mpp válido.');
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
    }
    
    handleFileRemove() {
        this.currentFile = null;
        
        // Hide conversion options
        const optionsSection = document.getElementById('conversion-options');
        if (optionsSection) {
            optionsSection.style.display = 'none';
        }
        
        // Disable convert button
        if (this.convertButton) {
            this.convertButton.disable();
        }
        
        // Reset any previous results
        this.hideResults();
    }
    
    updateFileInfo(file) {
        // Add file analysis preview
        const fileSize = this.formatFileSize(file.size);
        console.log(`Selected MPP file: ${file.name} (${fileSize})`);
    }
    
    handleOptionChange(event) {
        const { name, value, checked, type } = event.target;
        
        if (type === 'checkbox') {
            this.conversionOptions[name] = checked;
        } else {
            this.conversionOptions[name] = value;
        }
        
        console.log('Conversion options updated:', this.conversionOptions);
    }
    
    async startConversion() {
        if (!this.currentFile) {
            this.showError('Nenhum arquivo selecionado.');
            return;
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
            { step: 1, percentage: 25, text: 'Fazendo upload do arquivo...' },
            { step: 2, percentage: 50, text: 'Analisando estrutura do projeto...' },
            { step: 3, percentage: 75, text: 'Convertendo para XML...' },
            { step: 4, percentage: 100, text: 'Finalizando conversão...' }
        ];
        
        for (const progress of progressSteps) {
            await new Promise(resolve => setTimeout(resolve, 800));
            this.updateProgress(progress.percentage, progress.text, progress.step);
        }
        
        // Simulate successful conversion
        this.conversionResult = {
            filename: this.currentFile.name.replace('.mpp', '.xml'),
            size: Math.round(this.currentFile.size * 0.8), // XML typically smaller
            downloadUrl: '#',
            xmlContent: this.generateSampleXml(),
            stats: {
                tasks: Math.floor(Math.random() * 50) + 20,
                resources: Math.floor(Math.random() * 15) + 5,
                milestones: Math.floor(Math.random() * 10) + 3,
                dependencies: Math.floor(Math.random() * 30) + 10
            },
            conversionTime: (Math.random() * 3 + 1).toFixed(1) + 's'
        };
    }
    
    generateSampleXml() {
        return `<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://schemas.microsoft.com/project">
    <Name>${this.currentFile.name.replace('.mpp', '')}</Name>
    <CreationDate>${new Date().toISOString()}</CreationDate>
    <LastSaved>${new Date().toISOString()}</LastSaved>
    
    <Tasks>
        <Task ID="1">
            <Name>Planejamento do Projeto</Name>
            <Start>2024-01-15T09:00:00</Start>
            <Duration>P5D</Duration>
            <PercentComplete>100</PercentComplete>
        </Task>
        <Task ID="2">
            <Name>Análise de Requisitos</Name>
            <Start>2024-01-22T09:00:00</Start>
            <Duration>P3D</Duration>
            <PercentComplete>75</PercentComplete>
            <PredecessorLink>
                <PredecessorUID>1</PredecessorUID>
                <Type>1</Type>
            </PredecessorLink>
        </Task>
        <Task ID="3">
            <Name>Desenvolvimento</Name>
            <Start>2024-01-25T09:00:00</Start>
            <Duration>P10D</Duration>
            <PercentComplete>30</PercentComplete>
        </Task>
    </Tasks>
    
    <Resources>
        <Resource ID="1">
            <Name>Gerente de Projeto</Name>
            <Type>1</Type>
            <MaxUnits>1</MaxUnits>
            <StandardRate>150</StandardRate>
        </Resource>
        <Resource ID="2">
            <Name>Desenvolvedor Senior</Name>
            <Type>1</Type>
            <MaxUnits>1</MaxUnits>
            <StandardRate>120</StandardRate>
        </Resource>
    </Resources>
    
    <Assignments>
        <Assignment>
            <TaskUID>1</TaskUID>
            <ResourceUID>1</ResourceUID>
            <Units>1</Units>
        </Assignment>
        <Assignment>
            <TaskUID>3</TaskUID>
            <ResourceUID>2</ResourceUID>
            <Units>1</Units>
        </Assignment>
    </Assignments>
</Project>`;
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
        
        // Update statistics
        const stats = result.stats;
        const tasksCount = document.getElementById('tasks-count');
        const resourcesCount = document.getElementById('resources-count');
        const milestonesCount = document.getElementById('milestones-count');
        const dependenciesCount = document.getElementById('dependencies-count');
        
        if (tasksCount) tasksCount.textContent = stats.tasks;
        if (resourcesCount) resourcesCount.textContent = stats.resources;
        if (milestonesCount) milestonesCount.textContent = stats.milestones;
        if (dependenciesCount) dependenciesCount.textContent = stats.dependencies;
    }
    
    hideResults() {
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) {
            resultsSection.style.display = 'none';
        }
    }
    
    showPreview() {
        const modal = document.getElementById('preview-modal');
        const xmlContent = document.getElementById('xml-content');
        
        if (modal && xmlContent && this.conversionResult) {
            xmlContent.textContent = this.conversionResult.xmlContent;
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
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
    
    async copyXmlToClipboard() {
        if (this.conversionResult && this.conversionResult.xmlContent) {
            try {
                await navigator.clipboard.writeText(this.conversionResult.xmlContent);
                
                // Show feedback
                const copyBtn = document.getElementById('copy-xml');
                if (copyBtn) {
                    const originalText = copyBtn.innerHTML;
                    copyBtn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
                    copyBtn.classList.add('success');
                    
                    setTimeout(() => {
                        copyBtn.innerHTML = originalText;
                        copyBtn.classList.remove('success');
                    }, 2000);
                }
            } catch (error) {
                console.error('Failed to copy to clipboard:', error);
                this.showError('Erro ao copiar para a área de transferência.');
            }
        }
    }
    
    downloadResult() {
        if (this.conversionResult) {
            // Create download link
            const blob = new Blob([this.conversionResult.xmlContent], { type: 'application/xml' });
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
                    event_label: 'mpp-to-xml'
                });
            }
        }
    }
    
    shareResult() {
        if (navigator.share && this.conversionResult) {
            navigator.share({
                title: 'Conversão MPP para XML concluída',
                text: `Converti meu arquivo ${this.currentFile.name} para XML usando o Conversor Online`,
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
        
        // Reset form
        const optionsForm = document.querySelector('.conversion-options');
        if (optionsForm) {
            optionsForm.reset();
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
    }
    
    // Utility methods
    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
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
    new MPPToXMLConverter();
});

// Also handle case where script loads after DOM is ready
if (document.readyState !== 'loading') {
    new MPPToXMLConverter();
}