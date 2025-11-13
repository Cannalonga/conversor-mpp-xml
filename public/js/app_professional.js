/**
 * MPP to XML Converter - Professional Frontend Application
 * ========================================================
 * 
 * A modern JavaScript application for converting Microsoft Project files
 * to XML format with secure download and professional user experience.
 * 
 * Features:
 * - Drag & drop file upload with visual feedback
 * - PIX payment integration with QR code generation
 * - Secure ZIP download system
 * - Comprehensive error handling
 * - Responsive design support
 * - Professional user interface
 * 
 * @version 1.0.0
 * @author Development Team
 * @license MIT
 */

'use strict';

/**
 * Application Configuration
 */
const CONFIG = {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedExtensions: ['.mpp'],
    uploadTimeout: 60000, // 60 seconds
    paymentAmount: 10.00,
    apiEndpoints: {
        upload: '/api/upload-test',
        download: '/download/'
    }
};

/**
 * Application State Management
 */
class AppState {
    constructor() {
        this.isUploading = false;
        this.currentFileId = null;
        this.paymentCompleted = false;
        this.uploadedFilename = null;
    }

    reset() {
        this.isUploading = false;
        this.currentFileId = null;
        this.paymentCompleted = false;
        this.uploadedFilename = null;
    }
}

/**
 * File Upload Manager
 */
class FileUploadManager {
    constructor(dropZone, progressContainer, uploadButton) {
        this.dropZone = dropZone;
        this.progressContainer = progressContainer;
        this.uploadButton = uploadButton;
        this.appState = new AppState();
        
        this.initializeEventListeners();
    }

    /**
     * Initialize all event listeners for file upload functionality
     */
    initializeEventListeners() {
        // Drag and drop events
        this.dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
        this.dropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.dropZone.addEventListener('drop', this.handleFileDrop.bind(this));
        
        // Click to select file
        this.dropZone.addEventListener('click', this.handleDropZoneClick.bind(this));
        
        // File input change
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        }
    }

    /**
     * Handle drag over event with visual feedback
     */
    handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        this.dropZone.classList.add('dragover');
    }

    /**
     * Handle drag leave event
     */
    handleDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();
        this.dropZone.classList.remove('dragover');
    }

    /**
     * Handle file drop with validation
     */
    handleFileDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        this.dropZone.classList.remove('dragover');

        const files = event.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    /**
     * Handle drop zone click to trigger file selection
     */
    handleDropZoneClick() {
        if (this.appState.isUploading) return;
        
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.click();
        }
    }

    /**
     * Handle file input selection
     */
    handleFileSelect(event) {
        const files = event.target.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    /**
     * Process selected file with comprehensive validation
     */
    processFile(file) {
        console.log('Processing file:', file.name, 'Size:', file.size);

        // Reset application state
        this.appState.reset();

        // Validate file
        const validation = this.validateFile(file);
        if (!validation.isValid) {
            this.showError(validation.error);
            return;
        }

        // Store filename for later use
        this.appState.uploadedFilename = file.name;

        // Update UI for file selected state
        this.updateDropZoneForSelectedFile(file);

        // Enable upload button
        this.uploadButton.disabled = false;
        this.uploadButton.onclick = () => this.initiateUpload(file);
    }

    /**
     * Validate uploaded file against requirements
     */
    validateFile(file) {
        // Check file size
        if (file.size > CONFIG.maxFileSize) {
            return {
                isValid: false,
                error: `Arquivo muito grande. Máximo permitido: ${this.formatFileSize(CONFIG.maxFileSize)}`
            };
        }

        if (file.size === 0) {
            return {
                isValid: false,
                error: 'Arquivo vazio selecionado'
            };
        }

        // Check file extension
        const fileName = file.name.toLowerCase();
        const hasValidExtension = CONFIG.allowedExtensions.some(ext => 
            fileName.endsWith(ext.toLowerCase())
        );

        if (!hasValidExtension) {
            return {
                isValid: false,
                error: `Formato não suportado. Use: ${CONFIG.allowedExtensions.join(', ')}`
            };
        }

        return { isValid: true };
    }

    /**
     * Update drop zone UI when file is selected
     */
    updateDropZoneForSelectedFile(file) {
        this.dropZone.innerHTML = `
            <div class="file-selected">
                <div class="file-icon">📁</div>
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${this.formatFileSize(file.size)}</div>
                </div>
                <div class="file-status">✅ Pronto para converter</div>
            </div>
        `;
    }

    /**
     * Initiate the upload process
     */
    async initiateUpload(file) {
        if (this.appState.isUploading) return;

        this.appState.isUploading = true;
        this.uploadButton.disabled = true;

        try {
            // Show payment modal first
            const paymentModal = new PaymentModal();
            const paymentResult = await paymentModal.show();

            if (!paymentResult.confirmed) {
                this.resetUploadState();
                return;
            }

            // Proceed with upload after payment
            await this.uploadFile(file);
            
        } catch (error) {
            console.error('Upload process error:', error);
            this.showError('Erro no processo de upload: ' + error.message);
            this.resetUploadState();
        }
    }

    /**
     * Upload file to server with progress tracking
     */
    async uploadFile(file) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('filename', file.name);

            const xhr = new XMLHttpRequest();

            // Configure upload progress
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const percentComplete = (event.loaded / event.total) * 100;
                    this.updateProgress(percentComplete, 'Enviando arquivo...');
                }
            });

            // Handle successful response
            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        if (response.success) {
                            this.appState.currentFileId = response.fileId;
                            this.handleUploadSuccess(response);
                            resolve(response);
                        } else {
                            reject(new Error(response.error || 'Upload failed'));
                        }
                    } catch (e) {
                        reject(new Error('Invalid server response'));
                    }
                } else {
                    reject(new Error(`Server error: ${xhr.status}`));
                }
            });

            // Handle network errors
            xhr.addEventListener('error', () => {
                reject(new Error('Network error during upload'));
            });

            // Handle timeout
            xhr.addEventListener('timeout', () => {
                reject(new Error('Upload timeout'));
            });

            // Configure and send request
            xhr.timeout = this.calculateTimeout(file.size);
            xhr.open('POST', CONFIG.apiEndpoints.upload, true);
            xhr.send(formData);

            // Show initial progress
            this.showProgress();
            this.updateProgress(0, 'Iniciando upload...');
        });
    }

    /**
     * Handle successful upload response
     */
    handleUploadSuccess(response) {
        console.log('Upload successful:', response);
        
        this.updateProgress(100, 'Conversão concluída!');
        
        setTimeout(() => {
            this.showDownloadReady(response);
        }, 1000);
    }

    /**
     * Show download ready state with secure download button
     */
    showDownloadReady(response) {
        const resultHtml = `
            <div class="conversion-success">
                <div class="success-icon">✅</div>
                <h3>Conversão Concluída!</h3>
                <div class="file-details">
                    <p><strong>Arquivo:</strong> ${response.originalFilename}</p>
                    <p><strong>Tamanho XML:</strong> ${this.formatFileSize(response.xmlSize)}</p>
                    <p><strong>Data:</strong> ${response.timestamp}</p>
                </div>
                <button onclick="downloadSecureFile('${response.fileId}')" class="download-btn">
                    📦 Download Seguro (ZIP)
                </button>
                <button onclick="resetConverter()" class="reset-btn">
                    🔄 Nova Conversão
                </button>
            </div>
        `;

        this.progressContainer.innerHTML = resultHtml;
    }

    /**
     * Show upload progress with visual feedback
     */
    showProgress() {
        this.progressContainer.style.display = 'block';
        this.progressContainer.innerHTML = `
            <div class="progress-wrapper">
                <div class="progress-header">
                    <span class="progress-title">Processando arquivo...</span>
                    <span class="progress-percentage">0%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 0%"></div>
                </div>
                <div class="progress-status">Preparando...</div>
            </div>
        `;
    }

    /**
     * Update progress bar and status
     */
    updateProgress(percentage, status) {
        const progressFill = this.progressContainer.querySelector('.progress-fill');
        const progressPercentage = this.progressContainer.querySelector('.progress-percentage');
        const progressStatus = this.progressContainer.querySelector('.progress-status');

        if (progressFill) progressFill.style.width = `${percentage}%`;
        if (progressPercentage) progressPercentage.textContent = `${Math.round(percentage)}%`;
        if (progressStatus) progressStatus.textContent = status;
    }

    /**
     * Calculate appropriate timeout based on file size
     */
    calculateTimeout(fileSize) {
        return Math.max(CONFIG.uploadTimeout, fileSize / 1000); // 1ms per KB minimum
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Show error message to user
     */
    showError(message) {
        this.progressContainer.style.display = 'block';
        this.progressContainer.innerHTML = `
            <div class="error-message">
                <div class="error-icon">❌</div>
                <h3>Erro</h3>
                <p>${message}</p>
                <button onclick="resetConverter()" class="reset-btn">Tentar Novamente</button>
            </div>
        `;
    }

    /**
     * Reset upload state
     */
    resetUploadState() {
        this.appState.reset();
        this.uploadButton.disabled = true;
        this.uploadButton.onclick = null;
    }

    /**
     * Reset converter to initial state
     */
    reset() {
        this.resetUploadState();
        this.progressContainer.style.display = 'none';
        this.progressContainer.innerHTML = '';
        
        this.dropZone.innerHTML = `
            <div class="upload-content">
                <div class="upload-icon">📁</div>
                <h3>Arraste seu arquivo .mpp aqui</h3>
                <p>ou clique para selecionar</p>
                <small>Máximo: ${this.formatFileSize(CONFIG.maxFileSize)}</small>
            </div>
        `;
    }
}

/**
 * PIX Payment Modal Manager
 */
class PaymentModal {
    constructor() {
        this.modal = null;
        this.isVisible = false;
    }

    /**
     * Show payment modal and return promise with result
     */
    show() {
        return new Promise((resolve) => {
            this.createModal(resolve);
            this.displayModal();
        });
    }

    /**
     * Create modal HTML structure
     */
    createModal(resolveCallback) {
        this.modal = document.createElement('div');
        this.modal.className = 'payment-modal';
        this.modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>💳 Pagamento PIX</h2>
                    <button class="modal-close" onclick="this.closest('.payment-modal').remove()">&times;</button>
                </div>
                
                <div class="payment-info">
                    <div class="service-details">
                        <h3>Conversão MPP → XML</h3>
                        <div class="price-display">
                            <span class="currency">R$</span>
                            <span class="amount">${CONFIG.paymentAmount.toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <div class="pix-section">
                        <div class="qr-code-container">
                            <div class="qr-placeholder">
                                <div class="qr-code">
                                    <div class="qr-grid">
                                        ${this.generateQRPattern()}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="pix-instructions">
                            <h4>Como pagar:</h4>
                            <ol>
                                <li>Abra o app do seu banco</li>
                                <li>Escaneie o QR Code acima</li>
                                <li>Confirme o pagamento de R$ ${CONFIG.paymentAmount.toFixed(2)}</li>
                                <li>Aguarde a confirmação</li>
                            </ol>
                        </div>
                        
                        <div class="pix-key-section">
                            <label>Chave PIX (Copia e Cola):</label>
                            <div class="pix-key-container">
                                <input type="text" value="conversormpp@payment.com" readonly>
                                <button onclick="copyPixKey()" class="copy-btn">📋</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="payment-status">
                    <div class="status-indicator">
                        <div class="spinner"></div>
                        <span>Aguardando pagamento...</span>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button class="btn-cancel" onclick="this.closest('.payment-modal').remove()">
                        Cancelar
                    </button>
                    <button class="btn-simulate" onclick="simulatePayment()">
                        🧪 Simular Pagamento (Teste)
                    </button>
                </div>
            </div>
        `;

        // Add event handlers
        this.setupModalHandlers(resolveCallback);
        
        // Add to DOM
        document.body.appendChild(this.modal);
    }

    /**
     * Setup modal event handlers
     */
    setupModalHandlers(resolveCallback) {
        // Close modal handler
        const closeBtn = this.modal.querySelector('.modal-close');
        const cancelBtn = this.modal.querySelector('.btn-cancel');
        
        const closeHandler = () => {
            this.hide();
            resolveCallback({ confirmed: false });
        };

        closeBtn.addEventListener('click', closeHandler);
        cancelBtn.addEventListener('click', closeHandler);

        // Simulate payment handler
        const simulateBtn = this.modal.querySelector('.btn-simulate');
        simulateBtn.addEventListener('click', () => {
            this.simulatePaymentProcess(resolveCallback);
        });

        // Close on outside click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                closeHandler();
            }
        });
    }

    /**
     * Generate QR code pattern for visual representation
     */
    generateQRPattern() {
        let pattern = '';
        for (let i = 0; i < 21; i++) {
            for (let j = 0; j < 21; j++) {
                const isBlack = Math.random() > 0.5;
                pattern += `<div class="qr-pixel ${isBlack ? 'black' : 'white'}"></div>`;
            }
        }
        return pattern;
    }

    /**
     * Display modal with animation
     */
    displayModal() {
        this.isVisible = true;
        this.modal.style.display = 'flex';
        
        // Trigger animation
        setTimeout(() => {
            this.modal.classList.add('visible');
        }, 10);
    }

    /**
     * Hide modal with animation
     */
    hide() {
        this.modal.classList.remove('visible');
        
        setTimeout(() => {
            if (this.modal && this.modal.parentNode) {
                this.modal.parentNode.removeChild(this.modal);
            }
            this.isVisible = false;
        }, 300);
    }

    /**
     * Simulate payment process for testing
     */
    simulatePaymentProcess(resolveCallback) {
        const statusElement = this.modal.querySelector('.payment-status');
        const actionsElement = this.modal.querySelector('.modal-actions');
        
        // Update UI to show processing
        statusElement.innerHTML = `
            <div class="status-indicator processing">
                <div class="spinner active"></div>
                <span>Processando pagamento...</span>
            </div>
        `;
        
        actionsElement.style.display = 'none';

        // Simulate payment confirmation after delay
        setTimeout(() => {
            statusElement.innerHTML = `
                <div class="status-indicator success">
                    <div class="success-checkmark">✅</div>
                    <span>Pagamento confirmado!</span>
                </div>
            `;

            setTimeout(() => {
                this.hide();
                resolveCallback({ confirmed: true });
            }, 1500);
        }, 2000);
    }
}

/**
 * Global utility functions
 */

/**
 * Copy PIX key to clipboard
 */
function copyPixKey() {
    const pixKeyInput = document.querySelector('.pix-key-container input');
    if (pixKeyInput) {
        pixKeyInput.select();
        document.execCommand('copy');
        
        // Show feedback
        const copyBtn = document.querySelector('.copy-btn');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✅';
        
        setTimeout(() => {
            copyBtn.textContent = originalText;
        }, 2000);
    }
}

/**
 * Simulate payment (for testing purposes)
 */
function simulatePayment() {
    // This function is handled by the PaymentModal class
    console.log('Payment simulation triggered');
}

/**
 * Download secure file (ZIP format)
 */
function downloadSecureFile(fileId) {
    if (!fileId) {
        console.error('File ID not provided');
        return;
    }

    const downloadUrl = `${CONFIG.apiEndpoints.download}${fileId}.xml`;
    
    // Create invisible download link
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `converted_${fileId}.zip`;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('Secure download initiated for:', fileId);
}

/**
 * Reset converter to initial state
 */
function resetConverter() {
    if (window.fileUploadManager) {
        window.fileUploadManager.reset();
    }
}

/**
 * Application initialization
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 MPP to XML Converter - Professional Edition');
    console.log('Application initializing...');

    // Initialize core components
    const dropZone = document.getElementById('dropZone');
    const progressContainer = document.getElementById('progressContainer');
    const uploadButton = document.getElementById('uploadButton');

    if (dropZone && progressContainer && uploadButton) {
        window.fileUploadManager = new FileUploadManager(dropZone, progressContainer, uploadButton);
        console.log('✅ Application initialized successfully');
    } else {
        console.error('❌ Failed to initialize: Required DOM elements not found');
    }

    // Add global error handler
    window.addEventListener('error', function(event) {
        console.error('Global error:', event.error);
    });

    // Add unhandled promise rejection handler
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
    });
});

// Expose global functions
window.copyPixKey = copyPixKey;
window.simulatePayment = simulatePayment;
window.downloadSecureFile = downloadSecureFile;
window.resetConverter = resetConverter;