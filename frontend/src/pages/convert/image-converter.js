// Image Converter Page Controller
class ImageConverter {
    constructor() {
        this.fileUpload = null;
        this.convertButton = null;
        this.selectedFiles = [];
        this.conversionOptions = {
            outputFormat: 'jpg',
            quality: 85,
            resizeMode: 'none',
            width: null,
            height: null,
            maintainAspect: true,
            backgroundColor: '#ffffff',
            progressiveJpeg: false,
            preserveMetadata: false,
            optimize: true
        };
        this.previewModal = null;
        
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
                acceptedFormats: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tiff'],
                maxFileSize: 50 * 1024 * 1024, // 50MB
                icon: 'fas fa-image',
                title: 'Selecione suas imagens',
                subtitle: 'Arraste e solte ou clique para selecionar múltiplas imagens',
                description: 'Suporte para JPG, PNG, WEBP, SVG, GIF, BMP, TIFF (até 50MB cada)',
                multiple: true,
                onFileSelect: (files) => this.handleFileSelect(files),
                onFileRemove: () => this.handleFileRemove()
            });
        }
        
        // Load Convert Button Component
        if (window.ConvertButton) {
            this.convertButton = new ConvertButton('convert-button-container', {
                text: 'Converter Imagens',
                price: 2.00,
                icon: 'fas fa-magic',
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
        
        // Output format change
        const formatSelect = document.querySelector('select[name="output-format"]');
        if (formatSelect) {
            formatSelect.addEventListener('change', (e) => this.handleFormatChange(e.target.value));
        }
        
        // Quality slider
        const qualitySlider = document.querySelector('input[name="image-quality"]');
        if (qualitySlider) {
            qualitySlider.addEventListener('input', (e) => this.updateQualityDisplay(e.target.value));
        }
        
        // Resize mode change
        const resizeModeSelect = document.querySelector('select[name="resize-mode"]');
        if (resizeModeSelect) {
            resizeModeSelect.addEventListener('change', (e) => this.handleResizeModeChange(e.target.value));
        }
        
        // Color picker
        const colorPicker = document.querySelector('input[name="background-color"]');
        if (colorPicker) {
            colorPicker.addEventListener('change', (e) => this.updateColorLabel(e.target.value));
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
        
        const downloadAllBtn = document.getElementById('download-all-btn');
        if (downloadAllBtn) {
            downloadAllBtn.addEventListener('click', () => this.downloadAllImages());
        }
        
        // Preview modal
        const closePreviewBtn = document.getElementById('close-preview');
        if (closePreviewBtn) {
            closePreviewBtn.addEventListener('click', () => this.hidePreviewModal());
        }
        
        // Click outside modal to close
        const modal = document.getElementById('image-preview-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hidePreviewModal();
                }
            });
        }
    }
    
    handleFileSelect(files) {
        this.selectedFiles = Array.from(files);
        this.updateFileInfo();
        this.generateImagePreviews();
        this.showConversionOptions();
        this.updateConvertButton();
        this.calculatePrice();
    }
    
    handleFileRemove() {
        this.selectedFiles = [];
        this.hideImagePreview();
        this.hideConversionOptions();
        this.updateConvertButton();
    }
    
    updateFileInfo() {
        const totalImagesSpan = document.getElementById('total-images');
        const totalSizeSpan = document.getElementById('total-size');
        
        if (totalImagesSpan) {
            const imageText = this.selectedFiles.length === 1 ? 'imagem selecionada' : 'imagens selecionadas';
            totalImagesSpan.textContent = `${this.selectedFiles.length} ${imageText}`;
        }
        
        if (totalSizeSpan) {
            const totalSize = this.selectedFiles.reduce((total, file) => total + file.size, 0);
            totalSizeSpan.textContent = this.formatFileSize(totalSize);
        }
    }
    
    generateImagePreviews() {
        const gallery = document.getElementById('image-gallery');
        const previewSection = document.getElementById('image-preview-section');
        
        if (!gallery || !previewSection) return;
        
        gallery.innerHTML = '';
        
        this.selectedFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const previewItem = this.createImagePreviewItem(file, e.target.result, index);
                gallery.appendChild(previewItem);
            };
            reader.readAsDataURL(file);
        });
        
        previewSection.style.display = 'block';
    }
    
    createImagePreviewItem(file, dataUrl, index) {
        const item = document.createElement('div');
        item.className = 'image-preview-item';
        item.dataset.index = index;
        
        // Get image dimensions
        const img = new Image();
        img.onload = () => {
            const dimensionsSpan = item.querySelector('.dimensions');
            if (dimensionsSpan) {
                dimensionsSpan.textContent = `${img.width}x${img.height}`;
            }
        };
        img.src = dataUrl;
        
        item.innerHTML = `
            <div class="preview-thumbnail">
                <img src="${dataUrl}" alt="${file.name}">
                <div class="image-overlay">
                    <button class="preview-btn" onclick="imageConverter.showImagePreview(${index})">
                        <i class="fas fa-search-plus"></i>
                    </button>
                    <button class="remove-btn" onclick="imageConverter.removeImage(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="preview-info">
                <div class="filename">${file.name}</div>
                <div class="file-stats">
                    <span class="format">${this.getFileExtension(file.name).toUpperCase()}</span>
                    <span class="separator">•</span>
                    <span class="size">${this.formatFileSize(file.size)}</span>
                    <span class="separator">•</span>
                    <span class="dimensions">Carregando...</span>
                </div>
            </div>
        `;
        
        return item;
    }
    
    showImagePreview(index) {
        const file = this.selectedFiles[index];
        if (!file) return;
        
        const modal = document.getElementById('image-preview-modal');
        const originalImg = document.getElementById('original-preview');
        const originalFormat = document.getElementById('original-format');
        const originalSize = document.getElementById('original-size');
        const originalDimensions = document.getElementById('original-dimensions');
        
        if (!modal || !originalImg) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            originalImg.src = e.target.result;
            
            // Get image dimensions
            const img = new Image();
            img.onload = () => {
                if (originalDimensions) {
                    originalDimensions.textContent = `${img.width}x${img.height}`;
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
        
        if (originalFormat) {
            originalFormat.textContent = this.getFileExtension(file.name).toUpperCase();
        }
        if (originalSize) {
            originalSize.textContent = this.formatFileSize(file.size);
        }
        
        // Show modal
        modal.style.display = 'flex';
        
        // Generate preview of converted image
        this.generateConvertedPreview(file);
    }
    
    generateConvertedPreview(file) {
        const convertedImg = document.getElementById('converted-preview');
        const convertedFormat = document.getElementById('converted-format');
        const convertedSize = document.getElementById('converted-size');
        const convertedDimensions = document.getElementById('converted-dimensions');
        
        if (!convertedImg) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calculate new dimensions if resizing
                let { width, height } = this.calculateOutputDimensions(img.width, img.height);
                
                canvas.width = width;
                canvas.height = height;
                
                // Set background for formats that don't support transparency
                if (this.conversionOptions.outputFormat === 'jpg') {
                    ctx.fillStyle = this.conversionOptions.backgroundColor;
                    ctx.fillRect(0, 0, width, height);
                }
                
                // Draw image
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to desired format
                const outputDataUrl = canvas.toDataURL(
                    this.getMimeType(this.conversionOptions.outputFormat),
                    this.conversionOptions.quality / 100
                );
                
                convertedImg.src = outputDataUrl;
                
                // Update info
                if (convertedFormat) {
                    convertedFormat.textContent = this.conversionOptions.outputFormat.toUpperCase();
                }
                if (convertedDimensions) {
                    convertedDimensions.textContent = `${width}x${height}`;
                }
                if (convertedSize) {
                    // Estimate size based on data URL length
                    const estimatedSize = Math.round(outputDataUrl.length * 0.75); // Base64 overhead
                    convertedSize.textContent = this.formatFileSize(estimatedSize);
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    hidePreviewModal() {
        const modal = document.getElementById('image-preview-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    removeImage(index) {
        this.selectedFiles.splice(index, 1);
        this.updateFileInfo();
        
        if (this.selectedFiles.length === 0) {
            this.handleFileRemove();
        } else {
            this.generateImagePreviews();
            this.calculatePrice();
        }
        
        this.updateConvertButton();
    }
    
    handleOptionChange(e) {
        const { name, value, type, checked } = e.target;
        
        if (type === 'checkbox') {
            this.conversionOptions[this.toCamelCase(name)] = checked;
        } else {
            this.conversionOptions[this.toCamelCase(name)] = value;
        }
        
        // Update dependent options
        if (name === 'output-format') {
            this.handleFormatChange(value);
        } else if (name === 'resize-mode') {
            this.handleResizeModeChange(value);
        } else if (name === 'background-color') {
            this.updateColorLabel(value);
        }
    }
    
    handleFormatChange(format) {
        // Show/hide quality slider for lossy formats
        const qualityGroup = document.getElementById('quality-group');
        const backgroundGroup = document.getElementById('background-group');
        const progressiveOption = document.getElementById('progressive-option');
        
        const lossyFormats = ['jpg', 'webp'];
        const transparentFormats = ['png', 'webp', 'gif'];
        
        if (qualityGroup) {
            qualityGroup.style.display = lossyFormats.includes(format) ? 'block' : 'none';
        }
        
        if (backgroundGroup) {
            backgroundGroup.style.display = transparentFormats.includes(format) ? 'none' : 'block';
        }
        
        if (progressiveOption) {
            progressiveOption.style.display = format === 'jpg' ? 'block' : 'none';
        }
    }
    
    handleResizeModeChange(mode) {
        const resizeOptions = document.getElementById('resize-options');
        const widthInput = document.querySelector('input[name="width"]');
        const heightInput = document.querySelector('input[name="height"]');
        
        if (!resizeOptions) return;
        
        if (mode === 'none') {
            resizeOptions.style.display = 'none';
        } else {
            resizeOptions.style.display = 'block';
            
            if (mode === 'preset') {
                // Add preset options
                this.showPresetOptions();
            } else if (mode === 'percentage') {
                // Change inputs to percentage
                if (widthInput) widthInput.placeholder = '100';
                if (heightInput) heightInput.placeholder = '100';
            } else {
                // Custom dimensions
                if (widthInput) widthInput.placeholder = '1920';
                if (heightInput) heightInput.placeholder = '1080';
            }
        }
    }
    
    updateQualityDisplay(value) {
        const qualityValue = document.querySelector('.quality-value');
        if (qualityValue) {
            qualityValue.textContent = `${value}%`;
        }
        this.conversionOptions.quality = parseInt(value);
    }
    
    updateColorLabel(color) {
        const colorLabel = document.querySelector('.color-label');
        if (colorLabel) {
            const colorNames = {
                '#ffffff': 'Branco',
                '#000000': 'Preto',
                '#ff0000': 'Vermelho',
                '#00ff00': 'Verde',
                '#0000ff': 'Azul',
                '#ffff00': 'Amarelo',
                '#ff00ff': 'Magenta',
                '#00ffff': 'Ciano'
            };
            colorLabel.textContent = colorNames[color.toLowerCase()] || color;
        }
    }
    
    showConversionOptions() {
        const optionsDiv = document.getElementById('conversion-options');
        if (optionsDiv) {
            optionsDiv.style.display = 'block';
        }
    }
    
    hideConversionOptions() {
        const optionsDiv = document.getElementById('conversion-options');
        if (optionsDiv) {
            optionsDiv.style.display = 'none';
        }
    }
    
    hideImagePreview() {
        const previewSection = document.getElementById('image-preview-section');
        if (previewSection) {
            previewSection.style.display = 'none';
        }
    }
    
    updateConvertButton() {
        if (this.convertButton) {
            this.convertButton.setDisabled(this.selectedFiles.length === 0);
        }
    }
    
    calculatePrice() {
        if (this.convertButton && this.selectedFiles.length > 0) {
            const basePrice = 2.00;
            const totalPrice = this.selectedFiles.length * basePrice;
            
            // Apply bulk discount for 5+ images
            const finalPrice = this.selectedFiles.length >= 5 ? totalPrice * 0.8 : totalPrice;
            
            this.convertButton.updatePrice(finalPrice);
        }
    }
    
    async startConversion() {
        if (this.selectedFiles.length === 0) return;
        
        // Show progress
        this.showProgress();
        
        // Calculate total price
        const totalPrice = this.calculateTotalPrice();
        
        // Start payment process
        try {
            const paymentData = await this.initiatePayment(totalPrice);
            
            if (paymentData.success) {
                // Payment successful, start conversion
                await this.processImages();
            } else {
                throw new Error(paymentData.message || 'Falha no pagamento');
            }
        } catch (error) {
            console.error('Conversion error:', error);
            this.showError('Erro durante a conversão: ' + error.message);
            this.hideProgress();
        }
    }
    
    async processImages() {
        const progressFill = document.getElementById('progress-fill');
        const progressPercentage = document.querySelector('.progress-percentage');
        const batchProgress = document.getElementById('batch-progress');
        const currentImageSpan = document.getElementById('current-image');
        const totalImagesSpan = document.getElementById('total-images-count');
        const currentFileSpan = document.getElementById('current-file');
        
        if (batchProgress && this.selectedFiles.length > 1) {
            batchProgress.style.display = 'block';
            if (totalImagesSpan) totalImagesSpan.textContent = this.selectedFiles.length;
        }
        
        const convertedImages = [];
        
        for (let i = 0; i < this.selectedFiles.length; i++) {
            const file = this.selectedFiles[i];
            
            // Update batch progress
            if (currentImageSpan) currentImageSpan.textContent = i + 1;
            if (currentFileSpan) currentFileSpan.textContent = file.name;
            
            // Update progress steps
            this.updateProgressStep(2); // Processing
            
            try {
                const convertedImage = await this.convertSingleImage(file, i);
                convertedImages.push(convertedImage);
                
                // Update progress bar
                const progress = ((i + 1) / this.selectedFiles.length) * 100;
                if (progressFill) progressFill.style.width = `${progress}%`;
                if (progressPercentage) progressPercentage.textContent = `${Math.round(progress)}%`;
                
            } catch (error) {
                console.error(`Error converting ${file.name}:`, error);
                // Continue with other images
            }
            
            // Small delay to show progress
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        this.updateProgressStep(4); // Complete
        this.showResults(convertedImages);
    }
    
    async convertSingleImage(file, index) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        
                        // Calculate output dimensions
                        const { width, height } = this.calculateOutputDimensions(img.width, img.height);
                        
                        canvas.width = width;
                        canvas.height = height;
                        
                        // Set background for non-transparent formats
                        if (!this.supportsTransparency(this.conversionOptions.outputFormat)) {
                            ctx.fillStyle = this.conversionOptions.backgroundColor;
                            ctx.fillRect(0, 0, width, height);
                        }
                        
                        // Draw image
                        ctx.drawImage(img, 0, 0, width, height);
                        
                        // Convert to blob
                        canvas.toBlob((blob) => {
                            if (!blob) {
                                reject(new Error('Falha na conversão da imagem'));
                                return;
                            }
                            
                            const outputFileName = this.generateOutputFileName(file.name);
                            const convertedFile = new File([blob], outputFileName, {
                                type: this.getMimeType(this.conversionOptions.outputFormat)
                            });
                            
                            resolve({
                                original: file,
                                converted: convertedFile,
                                originalSize: file.size,
                                convertedSize: blob.size,
                                originalDimensions: `${img.width}x${img.height}`,
                                convertedDimensions: `${width}x${height}`,
                                reductionPercent: Math.round((1 - blob.size / file.size) * 100)
                            });
                        }, this.getMimeType(this.conversionOptions.outputFormat), this.conversionOptions.quality / 100);
                        
                    } catch (error) {
                        reject(error);
                    }
                };
                img.onerror = () => reject(new Error('Falha ao carregar a imagem'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('Falha ao ler o arquivo'));
            reader.readAsDataURL(file);
        });
    }
    
    calculateOutputDimensions(originalWidth, originalHeight) {
        let width = originalWidth;
        let height = originalHeight;
        
        if (this.conversionOptions.resizeMode === 'none') {
            return { width, height };
        }
        
        const inputWidth = parseInt(this.conversionOptions.width) || originalWidth;
        const inputHeight = parseInt(this.conversionOptions.height) || originalHeight;
        
        if (this.conversionOptions.resizeMode === 'percentage') {
            width = Math.round(originalWidth * (inputWidth / 100));
            height = Math.round(originalHeight * (inputHeight / 100));
        } else if (this.conversionOptions.resizeMode === 'dimensions') {
            if (this.conversionOptions.maintainAspect) {
                const aspectRatio = originalWidth / originalHeight;
                if (inputWidth && inputHeight) {
                    // Use the constraint that results in smaller image
                    const widthRatio = inputWidth / originalWidth;
                    const heightRatio = inputHeight / originalHeight;
                    const ratio = Math.min(widthRatio, heightRatio);
                    width = Math.round(originalWidth * ratio);
                    height = Math.round(originalHeight * ratio);
                } else if (inputWidth) {
                    width = inputWidth;
                    height = Math.round(inputWidth / aspectRatio);
                } else if (inputHeight) {
                    height = inputHeight;
                    width = Math.round(inputHeight * aspectRatio);
                }
            } else {
                width = inputWidth || originalWidth;
                height = inputHeight || originalHeight;
            }
        }
        
        return { width, height };
    }
    
    showProgress() {
        const progressSection = document.getElementById('progress-section');
        if (progressSection) {
            progressSection.style.display = 'block';
        }
        
        // Hide other sections
        this.hideConversionOptions();
        this.hideResults();
        
        this.updateProgressStep(1); // Upload
    }
    
    hideProgress() {
        const progressSection = document.getElementById('progress-section');
        if (progressSection) {
            progressSection.style.display = 'none';
        }
    }
    
    updateProgressStep(stepNumber) {
        const steps = document.querySelectorAll('.progress-steps .step');
        steps.forEach((step, index) => {
            const currentStep = index + 1;
            step.classList.toggle('active', currentStep === stepNumber);
            step.classList.toggle('completed', currentStep < stepNumber);
        });
    }
    
    showResults(convertedImages) {
        this.hideProgress();
        
        const resultsSection = document.getElementById('results-section');
        const resultsGallery = document.getElementById('results-gallery');
        
        if (!resultsSection || !resultsGallery) return;
        
        // Clear previous results
        resultsGallery.innerHTML = '';
        
        // Generate results gallery
        convertedImages.forEach((imageData, index) => {
            const resultItem = this.createResultItem(imageData, index);
            resultsGallery.appendChild(resultItem);
        });
        
        // Update statistics
        this.updateConversionStats(convertedImages);
        
        // Store converted images for download
        this.convertedImages = convertedImages;
        
        // Show results
        resultsSection.style.display = 'block';
    }
    
    createResultItem(imageData, index) {
        const item = document.createElement('div');
        item.className = 'result-item';
        
        // Create preview for converted image
        const convertedUrl = URL.createObjectURL(imageData.converted);
        
        item.innerHTML = `
            <div class="result-preview">
                <img src="${convertedUrl}" alt="${imageData.converted.name}">
                <div class="result-overlay">
                    <button class="preview-result-btn" onclick="imageConverter.downloadSingle(${index})">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="compare-btn" onclick="imageConverter.compareImages(${index})">
                        <i class="fas fa-balance-scale"></i>
                    </button>
                </div>
            </div>
            <div class="result-info">
                <div class="filename">${imageData.converted.name}</div>
                <div class="conversion-summary">
                    <div class="size-comparison">
                        <span class="original-size">${this.formatFileSize(imageData.originalSize)}</span>
                        <i class="fas fa-arrow-right"></i>
                        <span class="converted-size">${this.formatFileSize(imageData.convertedSize)}</span>
                    </div>
                    <div class="reduction ${imageData.reductionPercent > 0 ? 'positive' : 'negative'}">
                        ${imageData.reductionPercent > 0 ? '-' : '+'}${Math.abs(imageData.reductionPercent)}%
                    </div>
                </div>
            </div>
        `;
        
        return item;
    }
    
    updateConversionStats(convertedImages) {
        const convertedCountSpan = document.getElementById('converted-count');
        const sizeReductionSpan = document.getElementById('size-reduction');
        const conversionTimeSpan = document.getElementById('conversion-time');
        
        if (convertedCountSpan) {
            convertedCountSpan.textContent = convertedImages.length;
        }
        
        if (sizeReductionSpan && convertedImages.length > 0) {
            const totalOriginalSize = convertedImages.reduce((sum, img) => sum + img.originalSize, 0);
            const totalConvertedSize = convertedImages.reduce((sum, img) => sum + img.convertedSize, 0);
            const averageReduction = Math.round((1 - totalConvertedSize / totalOriginalSize) * 100);
            sizeReductionSpan.textContent = `${averageReduction}%`;
        }
        
        if (conversionTimeSpan) {
            // Simulate conversion time based on number of images
            const estimatedTime = (convertedImages.length * 0.5 + Math.random() * 2).toFixed(1);
            conversionTimeSpan.textContent = `${estimatedTime}s`;
        }
    }
    
    downloadSingle(index) {
        const imageData = this.convertedImages[index];
        if (!imageData) return;
        
        const url = URL.createObjectURL(imageData.converted);
        const a = document.createElement('a');
        a.href = url;
        a.download = imageData.converted.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    async downloadAllImages() {
        if (!this.convertedImages || this.convertedImages.length === 0) return;
        
        if (this.convertedImages.length === 1) {
            this.downloadSingle(0);
            return;
        }
        
        // Create ZIP file for multiple images
        try {
            const JSZip = await this.loadJSZip();
            const zip = new JSZip();
            
            this.convertedImages.forEach((imageData, index) => {
                zip.file(imageData.converted.name, imageData.converted);
            });
            
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `imagens_convertidas_${Date.now()}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error('Error creating ZIP:', error);
            // Fallback: download individual files
            this.convertedImages.forEach((imageData, index) => {
                setTimeout(() => this.downloadSingle(index), index * 500);
            });
        }
    }
    
    async loadJSZip() {
        if (window.JSZip) {
            return Promise.resolve(window.JSZip);
        }
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            script.onload = () => resolve(window.JSZip);
            script.onerror = () => reject(new Error('Failed to load JSZip'));
            document.head.appendChild(script);
        });
    }
    
    compareImages(index) {
        const imageData = this.convertedImages[index];
        if (!imageData) return;
        
        // Show comparison modal with before/after
        this.showComparisonModal(imageData);
    }
    
    showComparisonModal(imageData) {
        const modal = document.getElementById('image-preview-modal');
        const originalImg = document.getElementById('original-preview');
        const convertedImg = document.getElementById('converted-preview');
        const originalFormat = document.getElementById('original-format');
        const originalSize = document.getElementById('original-size');
        const originalDimensions = document.getElementById('original-dimensions');
        const convertedFormat = document.getElementById('converted-format');
        const convertedSize = document.getElementById('converted-size');
        const convertedDimensions = document.getElementById('converted-dimensions');
        
        if (!modal) return;
        
        // Set original image
        const originalUrl = URL.createObjectURL(imageData.original);
        if (originalImg) originalImg.src = originalUrl;
        
        // Set converted image
        const convertedUrl = URL.createObjectURL(imageData.converted);
        if (convertedImg) convertedImg.src = convertedUrl;
        
        // Update info
        if (originalFormat) originalFormat.textContent = this.getFileExtension(imageData.original.name).toUpperCase();
        if (originalSize) originalSize.textContent = this.formatFileSize(imageData.originalSize);
        if (originalDimensions) originalDimensions.textContent = imageData.originalDimensions;
        if (convertedFormat) convertedFormat.textContent = this.conversionOptions.outputFormat.toUpperCase();
        if (convertedSize) convertedSize.textContent = this.formatFileSize(imageData.convertedSize);
        if (convertedDimensions) convertedDimensions.textContent = imageData.convertedDimensions;
        
        // Show modal
        modal.style.display = 'flex';
    }
    
    hideResults() {
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) {
            resultsSection.style.display = 'none';
        }
    }
    
    resetPage() {
        // Clear files
        this.selectedFiles = [];
        this.convertedImages = [];
        
        // Reset UI
        this.hideResults();
        this.hideProgress();
        this.hideConversionOptions();
        this.hideImagePreview();
        
        // Reset file upload
        if (this.fileUpload) {
            this.fileUpload.reset();
        }
        
        // Reset convert button
        this.updateConvertButton();
        
        // Reset form
        const form = document.querySelector('.conversion-options');
        if (form) {
            form.reset();
        }
    }
    
    shareResult() {
        if (navigator.share) {
            navigator.share({
                title: 'Conversor de Imagens - Resultados',
                text: `Convertidas ${this.convertedImages.length} imagens com sucesso!`,
                url: window.location.href
            });
        } else {
            // Fallback: copy link
            navigator.clipboard.writeText(window.location.href);
            alert('Link copiado para a área de transferência!');
        }
    }
    
    // Utility methods
    getFileExtension(filename) {
        return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    getMimeType(format) {
        const mimeTypes = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'webp': 'image/webp',
            'gif': 'image/gif',
            'bmp': 'image/bmp',
            'tiff': 'image/tiff',
            'svg': 'image/svg+xml'
        };
        return mimeTypes[format.toLowerCase()] || 'image/jpeg';
    }
    
    supportsTransparency(format) {
        return ['png', 'webp', 'gif', 'svg'].includes(format.toLowerCase());
    }
    
    generateOutputFileName(originalName) {
        const baseName = originalName.replace(/\.[^/.]+$/, '');
        const extension = this.conversionOptions.outputFormat === 'jpg' ? 'jpg' : this.conversionOptions.outputFormat;
        return `${baseName}.${extension}`;
    }
    
    toCamelCase(str) {
        return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    }
    
    calculateTotalPrice() {
        const basePrice = 2.00;
        const totalPrice = this.selectedFiles.length * basePrice;
        return this.selectedFiles.length >= 5 ? totalPrice * 0.8 : totalPrice;
    }
    
    async initiatePayment(amount) {
        // Simulate payment process
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true, transactionId: 'fake-transaction-' + Date.now() });
            }, 2000);
        });
    }
    
    showError(message) {
        alert(message); // Replace with proper error UI
    }
    
    loadPageConfig() {
        // Load any page-specific configuration
        document.title = 'Conversor de Imagens Online | JPG PNG WEBP SVG';
        
        // Initialize default options
        this.handleFormatChange('jpg');
        this.updateQualityDisplay(85);
    }
}

// Initialize the converter when the page loads
const imageConverter = new ImageConverter();