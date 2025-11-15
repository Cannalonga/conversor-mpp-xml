// PDF Merge Conversion Page Controller
class PDFMergeConverter {
    constructor() {
        this.fileUpload = null;
        this.convertButton = null;
        this.selectedFiles = [];
        this.conversionOptions = {};
        this.conversionResult = null;
        
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
        
        // Load File Upload Component for multiple files
        if (window.FileUpload) {
            this.fileUpload = new FileUpload('file-upload-container', {
                acceptedFormats: ['.pdf'],
                maxFileSize: 50 * 1024 * 1024, // 50MB per file
                maxFiles: 50,
                multiple: true,
                icon: 'fas fa-file-pdf',
                title: 'Selecione seus arquivos PDF',
                subtitle: 'Arraste e solte múltiplos PDFs ou clique para selecionar',
                description: 'Suporte para até 50 arquivos PDF (máximo 50MB cada)',
                onFileSelect: (files) => this.handleFilesSelect(files),
                onFileRemove: (file) => this.handleFileRemove(file),
                onAllFilesRemove: () => this.handleAllFilesRemove()
            });
        }
        
        // Load Convert Button Component
        if (window.ConvertButton) {
            this.convertButton = new ConvertButton('convert-button-container', {
                text: 'Juntar PDFs',
                price: 0.00,
                icon: 'fas fa-layer-group',
                onClick: () => this.startMerge(),
                disabled: true,
                free: true
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
        const mergeMoreBtn = document.getElementById('merge-more-btn');
        if (mergeMoreBtn) {
            mergeMoreBtn.addEventListener('click', () => this.resetPage());
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
        
        // File list drag and drop reordering
        this.setupFileReordering();
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }
    
    setupFileReordering() {
        const fileItems = document.getElementById('file-items');
        if (fileItems) {
            // Enable drag and drop for reordering files
            fileItems.addEventListener('dragstart', (e) => this.handleDragStart(e));
            fileItems.addEventListener('dragover', (e) => this.handleDragOver(e));
            fileItems.addEventListener('drop', (e) => this.handleDrop(e));
            fileItems.addEventListener('dragend', (e) => this.handleDragEnd(e));
        }
    }
    
    loadPageConfig() {
        // Get tool config from global config
        if (window.CONVERSION_TOOLS) {
            const toolConfig = window.CONVERSION_TOOLS.find(tool => tool.id === 'pdf-merge');
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
            metaItems[0].innerHTML = `<i class="fas fa-file-pdf"></i><span>Entrada: ${config.input}</span>`;
            metaItems[1].innerHTML = `<i class="fas fa-layer-group"></i><span>Saída: ${config.output}</span>`;
        }
        
        // Update pricing (free tool)
        if (this.convertButton) {
            this.convertButton.updatePrice(0.00);
        }
    }
    
    handleFilesSelect(files) {
        // Handle multiple file selection
        if (Array.isArray(files)) {
            this.selectedFiles = [...files];
        } else {
            this.selectedFiles = [files];
        }
        
        // Validate PDF files
        this.selectedFiles = this.selectedFiles.filter(file => {
            if (!file.name.toLowerCase().endsWith('.pdf')) {
                this.showError(`O arquivo ${file.name} não é um PDF válido.`);
                return false;
            }
            return true;
        });
        
        if (this.selectedFiles.length === 0) {
            this.handleAllFilesRemove();
            return;
        }
        
        // Update file list display
        this.updateFileList();
        
        // Show conversion options
        const optionsSection = document.getElementById('conversion-options');
        if (optionsSection) {
            optionsSection.style.display = 'block';
            this.animateElement(optionsSection);
        }
        
        // Enable convert button if we have files
        if (this.convertButton && this.selectedFiles.length > 1) {
            this.convertButton.enable();
        } else if (this.selectedFiles.length === 1) {
            this.showError('Selecione pelo menos 2 arquivos PDF para juntar.');
            this.convertButton.disable();
        }
    }
    
    handleFileRemove(file) {
        this.selectedFiles = this.selectedFiles.filter(f => f !== file);
        
        if (this.selectedFiles.length < 2) {
            this.handleAllFilesRemove();
            return;
        }
        
        this.updateFileList();
    }
    
    handleAllFilesRemove() {
        this.selectedFiles = [];
        
        // Hide file list
        const fileList = document.getElementById('file-list');
        if (fileList) {
            fileList.style.display = 'none';
        }
        
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
    
    updateFileList() {
        const fileList = document.getElementById('file-list');
        const fileItems = document.getElementById('file-items');
        const fileCount = document.querySelector('.file-count');
        
        if (!fileList || !fileItems || !fileCount) return;
        
        // Show file list
        fileList.style.display = 'block';
        
        // Update count
        fileCount.textContent = `${this.selectedFiles.length} arquivos`;
        
        // Clear existing items
        fileItems.innerHTML = '';
        
        // Add file items
        this.selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.draggable = true;
            fileItem.dataset.index = index;
            
            fileItem.innerHTML = `
                <div class="file-drag-handle">
                    <i class="fas fa-grip-vertical"></i>
                </div>
                <div class="file-info">
                    <div class="file-icon">
                        <i class="fas fa-file-pdf"></i>
                    </div>
                    <div class="file-details">
                        <div class="file-name">${file.name}</div>
                        <div class="file-size">${this.formatFileSize(file.size)}</div>
                    </div>
                </div>
                <div class="file-order">
                    <span class="order-number">${index + 1}</span>
                </div>
                <div class="file-actions">
                    <button class="btn-small btn-outline" onclick="pdfMergeConverter.moveFileUp(${index})" ${index === 0 ? 'disabled' : ''}>
                        <i class="fas fa-arrow-up"></i>
                    </button>
                    <button class="btn-small btn-outline" onclick="pdfMergeConverter.moveFileDown(${index})" ${index === this.selectedFiles.length - 1 ? 'disabled' : ''}>
                        <i class="fas fa-arrow-down"></i>
                    </button>
                    <button class="btn-small btn-danger" onclick="pdfMergeConverter.removeFile(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            
            fileItems.appendChild(fileItem);
        });
        
        this.animateElement(fileList);
    }
    
    moveFileUp(index) {
        if (index > 0) {
            [this.selectedFiles[index], this.selectedFiles[index - 1]] = [this.selectedFiles[index - 1], this.selectedFiles[index]];
            this.updateFileList();
        }
    }
    
    moveFileDown(index) {
        if (index < this.selectedFiles.length - 1) {
            [this.selectedFiles[index], this.selectedFiles[index + 1]] = [this.selectedFiles[index + 1], this.selectedFiles[index]];
            this.updateFileList();
        }
    }
    
    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        
        if (this.selectedFiles.length < 2) {
            this.handleAllFilesRemove();
        } else {
            this.updateFileList();
        }
    }
    
    // Drag and drop handlers
    handleDragStart(e) {
        if (e.target.closest('.file-item')) {
            e.target.closest('.file-item').classList.add('dragging');
            e.dataTransfer.setData('text/plain', e.target.closest('.file-item').dataset.index);
        }
    }
    
    handleDragOver(e) {
        e.preventDefault();
        const afterElement = this.getDragAfterElement(e.clientY);
        const draggingElement = document.querySelector('.dragging');
        const container = document.getElementById('file-items');
        
        if (afterElement == null) {
            container.appendChild(draggingElement);
        } else {
            container.insertBefore(draggingElement, afterElement);
        }
    }
    
    handleDrop(e) {
        e.preventDefault();
        this.reorderFilesFromDOM();
    }
    
    handleDragEnd(e) {
        const draggingElement = document.querySelector('.dragging');
        if (draggingElement) {
            draggingElement.classList.remove('dragging');
        }
    }
    
    getDragAfterElement(y) {
        const draggableElements = [...document.querySelectorAll('.file-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    
    reorderFilesFromDOM() {
        const fileItems = document.querySelectorAll('.file-item');
        const newOrder = [];
        
        fileItems.forEach(item => {
            const index = parseInt(item.dataset.index);
            newOrder.push(this.selectedFiles[index]);
        });
        
        this.selectedFiles = newOrder;
        this.updateFileList();
    }
    
    handleOptionChange(event) {
        const { name, value, checked, type } = event.target;
        
        if (type === 'checkbox') {
            this.conversionOptions[name] = checked;
        } else {
            this.conversionOptions[name] = value;
        }
        
        // Handle merge order change
        if (name === 'merge-order' && value !== 'custom') {
            this.reorderFiles(value);
        }
        
        console.log('Merge options updated:', this.conversionOptions);
    }
    
    reorderFiles(order) {
        switch (order) {
            case 'alphabetical':
                this.selectedFiles.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'alphabetical-desc':
                this.selectedFiles.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'original':
            default:
                // Keep current order or restore original if we had it stored
                break;
        }
        
        this.updateFileList();
    }
    
    async startMerge() {
        if (this.selectedFiles.length < 2) {
            this.showError('Selecione pelo menos 2 arquivos PDF para juntar.');
            return;
        }
        
        try {
            // Disable convert button
            if (this.convertButton) {
                this.convertButton.setLoading(true);
            }
            
            // Show progress
            this.showProgress();
            
            // Perform merge
            await this.performMerge();
            
            // Show results
            this.showResults();
            
        } catch (error) {
            console.error('Merge error:', error);
            this.showError('Erro durante a combinação dos PDFs. Tente novamente.');
        } finally {
            // Re-enable convert button
            if (this.convertButton) {
                this.convertButton.setLoading(false);
            }
        }
    }
    
    async performMerge() {
        // Simulate API call to backend
        const formData = new FormData();
        this.selectedFiles.forEach((file, index) => {
            formData.append(`file_${index}`, file);
        });
        formData.append('options', JSON.stringify(this.conversionOptions));
        
        // Progress simulation
        const progressSteps = [
            { step: 1, percentage: 25, text: 'Fazendo upload dos arquivos...' },
            { step: 2, percentage: 50, text: 'Organizando documentos...' },
            { step: 3, percentage: 75, text: 'Combinando PDFs...' },
            { step: 4, percentage: 100, text: 'Finalizando documento...' }
        ];
        
        for (const progress of progressSteps) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.updateProgress(progress.percentage, progress.text, progress.step);
        }
        
        // Calculate merged file stats
        const totalSize = this.selectedFiles.reduce((sum, file) => sum + file.size, 0);
        const outputFilename = (this.conversionOptions['output-filename'] || 'documento-combinado') + '.pdf';
        
        // Simulate successful merge
        this.conversionResult = {
            filename: outputFilename,
            size: Math.round(totalSize * 0.95), // Slight size optimization
            downloadUrl: '#',
            stats: {
                filesCount: this.selectedFiles.length,
                totalPages: this.selectedFiles.length * Math.floor(Math.random() * 10 + 5), // Estimate pages
                compressionRatio: Math.floor(Math.random() * 20 + 5), // 5-25% compression
                bookmarksCount: this.conversionOptions['bookmarks-handling'] === 'create-files' ? this.selectedFiles.length : Math.floor(Math.random() * 8)
            },
            mergeTime: (Math.random() * 2 + 0.5).toFixed(1) + 's',
            fileList: this.selectedFiles.map(file => ({
                name: file.name,
                size: this.formatFileSize(file.size)
            }))
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
        
        // Update merge time
        const timeElement = document.getElementById('merge-time');
        if (timeElement) {
            timeElement.textContent = result.mergeTime;
        }
        
        // Update statistics
        const stats = result.stats;
        const filesCountEl = document.getElementById('files-count');
        const totalPagesEl = document.getElementById('total-pages');
        const compressionRatioEl = document.getElementById('compression-ratio');
        const bookmarksCountEl = document.getElementById('bookmarks-count');
        
        if (filesCountEl) filesCountEl.textContent = stats.filesCount;
        if (totalPagesEl) totalPagesEl.textContent = stats.totalPages;
        if (compressionRatioEl) compressionRatioEl.textContent = stats.compressionRatio + '%';
        if (bookmarksCountEl) bookmarksCountEl.textContent = stats.bookmarksCount;
    }
    
    hideResults() {
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) {
            resultsSection.style.display = 'none';
        }
    }
    
    showPreview() {
        const modal = document.getElementById('preview-modal');
        const previewPages = document.getElementById('preview-pages');
        const previewSize = document.getElementById('preview-size');
        const previewFiles = document.getElementById('preview-files');
        const previewFileList = document.getElementById('preview-file-list');
        
        if (modal && this.conversionResult) {
            const result = this.conversionResult;
            
            // Update preview stats
            if (previewPages) previewPages.textContent = result.stats.totalPages;
            if (previewSize) previewSize.textContent = this.formatFileSize(result.size);
            if (previewFiles) previewFiles.textContent = result.stats.filesCount;
            
            // Update file list
            if (previewFileList) {
                previewFileList.innerHTML = result.fileList.map((file, index) => `
                    <div class="preview-file-item">
                        <span class="file-order">${index + 1}.</span>
                        <span class="file-name">${file.name}</span>
                        <span class="file-size">${file.size}</span>
                    </div>
                `).join('');
            }
            
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
    
    downloadResult() {
        if (this.conversionResult) {
            // In a real application, this would download the actual merged PDF
            // For now, we'll simulate the download
            const link = document.createElement('a');
            link.href = '#'; // Would be the actual file URL
            link.download = this.conversionResult.filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            
            // Simulate download
            this.showSuccess('Download do PDF combinado iniciado!');
            
            // Track download
            if (window.gtag) {
                gtag('event', 'download', {
                    event_category: 'merge',
                    event_label: 'pdf-merge'
                });
            }
            
            document.body.removeChild(link);
        }
    }
    
    shareResult() {
        if (navigator.share && this.conversionResult) {
            navigator.share({
                title: 'PDFs Combinados com Sucesso',
                text: `Juntei ${this.selectedFiles.length} arquivos PDF em um documento usando o Conversor Online`,
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
        
        // Reset selected files
        this.selectedFiles = [];
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
        
        const fileList = document.getElementById('file-list');
        if (fileList) {
            fileList.style.display = 'none';
        }
        
        // Reset form
        const optionsForm = document.querySelector('.conversion-options');
        if (optionsForm) {
            optionsForm.reset();
            // Reset default filename
            const filenameInput = document.querySelector('input[name="output-filename"]');
            if (filenameInput) {
                filenameInput.value = 'documento-combinado';
            }
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
        
        // Ctrl+Enter starts merge
        if (event.ctrlKey && event.key === 'Enter' && this.selectedFiles.length >= 2) {
            event.preventDefault();
            this.startMerge();
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

// Global reference for onclick handlers
let pdfMergeConverter;

// Initialize the page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    pdfMergeConverter = new PDFMergeConverter();
});

// Also handle case where script loads after DOM is ready
if (document.readyState !== 'loading') {
    pdfMergeConverter = new PDFMergeConverter();
}