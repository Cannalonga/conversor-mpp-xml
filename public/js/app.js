// Configuração da aplicação
const CONFIG = {
    API_URL: '/api',
    MAX_FILE_SIZE: Infinity, // SEM LIMITE! 🚀
    SUPPORTED_FORMATS: ['.mpp'],
    PAYMENT_TIMEOUT: 15 * 60 * 1000, // 15 minutos
    POLLING_INTERVAL: 5000, // 5 segundos
    PIX_KEY: '02038351740', // Chave PIX (CPF) - OCULTA
    PIX_BANK: 'Nubank'
};

class MPPConverter {
    constructor() {
        this.currentFile = null;
        this.paymentTimer = null;
        this.paymentPolling = null;
        this.conversionId = null;
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadAnalyticsCounter();
    }

    initializeElements() {
        // Upload elements
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.filePreview = document.getElementById('filePreview');
        this.fileName = document.getElementById('fileName');
        this.fileSize = document.getElementById('fileSize');
        this.removeFileBtn = document.getElementById('removeFile');
        this.convertBtn = document.getElementById('convertBtn');

        // Payment modal elements
        this.paymentModal = document.getElementById('paymentModal');
        this.closeModalBtn = document.getElementById('closeModal');
        this.paymentFileName = document.getElementById('paymentFileName');
        this.qrCode = document.getElementById('qrCode');
        this.pixKeyInput = document.getElementById('pixKeyInput');
        this.copyPixKeyBtn = document.getElementById('copyPixKey');
        this.paymentStatus = document.getElementById('paymentStatus');
        this.timer = document.getElementById('timer');
    }

    setupEventListeners() {
        console.log('🔧 Configurando event listeners...');
        
        // Verificar se elementos existem
        if (!this.uploadArea) {
            console.error('❌ uploadArea não encontrado');
            return;
        }
        if (!this.fileInput) {
            console.error('❌ fileInput não encontrado');
            return;
        }
        
        console.log('✅ Elementos encontrados:', {
            uploadArea: this.uploadArea,
            fileInput: this.fileInput
        });
        
        // Upload area events with debug
        this.uploadArea.addEventListener('click', (e) => {
            console.log('🖱️ Upload area clicado');
            e.preventDefault();
            e.stopPropagation();
            this.fileInput.click();
        });
        
        this.uploadArea.addEventListener('dragover', (e) => {
            console.log('🔄 Drag over detectado');
            this.handleDragOver(e);
        });
        
        this.uploadArea.addEventListener('drop', (e) => {
            console.log('📁 Drop detectado');
            this.handleDrop(e);
        });
        
        this.uploadArea.addEventListener('dragleave', (e) => {
            console.log('🚪 Drag leave detectado');
            this.handleDragLeave(e);
        });

        // File input change with debug
        this.fileInput.addEventListener('change', (e) => {
            console.log('📂 Arquivo selecionado:', e.target.files);
            this.handleFileSelect(e);
        });

        // Remove file button (verificar se existe)
        if (this.removeFileBtn) {
            this.removeFileBtn.addEventListener('click', this.removeFile.bind(this));
        }

        // Convert button (verificar se existe)
        if (this.convertBtn) {
            this.convertBtn.addEventListener('click', this.startConversion.bind(this));
        }

        // Modal events (verificar se existem)
        if (this.closeModalBtn) {
            this.closeModalBtn.addEventListener('click', this.closeModal.bind(this));
        }
        if (this.paymentModal) {
            this.paymentModal.addEventListener('click', this.handleModalClick.bind(this));
        }

        // Copy PIX key (verificar se existe)
        if (this.copyPixKeyBtn) {
            this.copyPixKeyBtn.addEventListener('click', this.copyPixKey.bind(this));
        }

        console.log('✅ Event listeners configurados com sucesso!');
    }

    setupSmoothScroll() {
    }

    setupSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    // File handling methods
    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    processFile(file) {
        // Validar formato
        if (!this.validateFileFormat(file)) {
            this.showToast('Formato de arquivo não suportado. Use apenas arquivos .mpp', 'error');
            return;
        }

        // TAMANHO ILIMITADO! ✨ - Validação removida
        // Comentário: Aceitar arquivos de qualquer tamanho
        console.log(`📊 Arquivo aceito: ${file.name} (${this.formatFileSize(file.size)})`);

        this.currentFile = file;
        this.showFilePreview(file);
        this.convertBtn.disabled = false;
    }

    validateFileFormat(file) {
        const extension = '.' + file.name.split('.').pop().toLowerCase();
        return CONFIG.SUPPORTED_FORMATS.includes(extension);
    }

    validateFileSize(file) {
        // SEMPRE RETORNA TRUE - SEM LIMITE DE TAMANHO! 🚀
        return true;
    }

    showFilePreview(file) {
        this.fileName.textContent = file.name;
        this.fileSize.textContent = this.formatFileSize(file.size);
        
        this.uploadArea.style.display = 'none';
        this.filePreview.style.display = 'block';
    }

    removeFile() {
        this.currentFile = null;
        this.fileInput.value = '';
        this.uploadArea.style.display = 'block';
        this.filePreview.style.display = 'none';
        this.convertBtn.disabled = true;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Conversion methods
    async startConversion() {
        if (!this.currentFile) {
            this.showToast('Selecione um arquivo primeiro', 'error');
            return;
        }

        try {
            this.convertBtn.disabled = true;
            this.convertBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparando...';

            // Enviar arquivo para o servidor
            const formData = new FormData();
            formData.append('mppFile', this.currentFile);

            const response = await fetch(`${CONFIG.API_URL}/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Erro ao enviar arquivo');
            }

            const data = await response.json();
            
            // Verificar resposta do servidor
            if (data.success && data.payment) {
                this.currentPayment = data.payment;
                this.uploadedFileId = data.fileId;
                
                // Resetar botão e mostrar modal de pagamento
                this.resetConvertButton();
                this.showPaymentModal();
            } else {
                throw new Error(data.error || 'Erro no upload');
            }

        } catch (error) {
            console.error('Erro na conversão:', error);
            this.showToast('Erro ao processar arquivo. Tente novamente.', 'error');
            this.resetConvertButton();
        }
    }

    resetConvertButton() {
        this.convertBtn.disabled = false;
        this.convertBtn.innerHTML = '<i class="fas fa-cog"></i> Converter Arquivo';
    }

    // Payment methods
    showPaymentModal() {
        this.paymentFileName.textContent = this.currentFile.name;
        // REMOVIDO: this.pixKeyInput.value = CONFIG.PIX_KEY; // CHAVE PIX OCULTA
        this.paymentModal.classList.add('active');
        
        this.generateQRCode();
        this.startPaymentTimer();
        this.startPaymentPolling();
    }

    async generateQRCode() {
        try {
            // Para demonstração, vamos simular um QR Code
            this.qrCode.innerHTML = `
                <div class="qr-placeholder" style="
                    width: 200px; 
                    height: 200px; 
                    border: 2px solid #00D4AA; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center;
                    background: white;
                    border-radius: 10px;
                    margin: 0 auto 20px;
                ">
                    <div style="text-align: center;">
                        <i class="fas fa-qrcode" style="font-size: 48px; color: #00D4AA; margin-bottom: 10px;"></i>
                        <p style="margin: 0; font-size: 12px; color: #666;">QR Code PIX</p>
                        <p style="margin: 5px 0 0; font-size: 14px; font-weight: bold;">R$ ${this.currentPayment?.amount.toFixed(2) || '10,00'}</p>
                    </div>
                </div>
                <p style="text-align: center;"><small>Escaneie com seu app bancário</small></p>
            `;
        } catch (error) {
            console.error('Erro ao gerar QR Code:', error);
            this.qrCode.innerHTML = '<p>Erro ao gerar QR Code</p>';
            `;
        } catch (error) {
            console.error('Erro ao gerar QR Code:', error);
            this.qrCode.innerHTML = '<p>Erro ao gerar QR Code</p>';
        }
    }

    startPaymentTimer() {
        let timeLeft = CONFIG.PAYMENT_TIMEOUT;
        
        this.paymentTimer = setInterval(() => {
            timeLeft -= 1000;
            
            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);
            
            this.timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            if (timeLeft <= 0) {
                this.handlePaymentTimeout();
            }
        }, 1000);
    }

    startPaymentPolling() {
        this.paymentPolling = setInterval(async () => {
            try {
                const response = await fetch(`${CONFIG.API_URL}/payment/status/${this.conversionId}`);
                const data = await response.json();
                
                if (data.status === 'paid') {
                    this.handlePaymentSuccess();
                } else if (data.status === 'expired') {
                    this.handlePaymentTimeout();
                }
            } catch (error) {
                console.error('Erro ao verificar status do pagamento:', error);
            }
        }, CONFIG.POLLING_INTERVAL);
    }

    async handlePaymentSuccess() {
        this.clearPaymentTimers();
        
        this.paymentStatus.innerHTML = '<i class="fas fa-check-circle success"></i> Pagamento confirmado!';
        
        // Aguardar um momento e iniciar download
        setTimeout(async () => {
            await this.downloadConvertedFile();
            this.closeModal();
        }, 2000);
    }

    handlePaymentTimeout() {
        this.clearPaymentTimers();
        
        this.paymentStatus.innerHTML = '<i class="fas fa-times-circle error"></i> Tempo esgotado';
        this.timer.textContent = '00:00';
        
        setTimeout(() => {
            this.closeModal();
        }, 3000);
    }

    async downloadConvertedFile() {
        try {
            const response = await fetch(`${CONFIG.API_URL}/download/${this.conversionId}`);
            
            if (!response.ok) {
                throw new Error('Erro ao baixar arquivo');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            const fileName = this.currentFile.name.replace('.mpp', '.xml');
            
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            this.showToast('Download iniciado com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro no download:', error);
            this.showToast('Erro ao baixar arquivo. Tente novamente.', 'error');
        }
    }

    clearPaymentTimers() {
        if (this.paymentTimer) {
            clearInterval(this.paymentTimer);
            this.paymentTimer = null;
        }
        
        if (this.paymentPolling) {
            clearInterval(this.paymentPolling);
            this.paymentPolling = null;
        }
    }

    closeModal() {
        this.paymentModal.classList.remove('active');
        this.clearPaymentTimers();
        this.resetConvertButton();
        
        // Reset modal state
        this.paymentStatus.innerHTML = '<i class="fas fa-clock"></i> Aguardando pagamento...';
        this.timer.textContent = '15:00';
        this.qrCode.innerHTML = `
            <div class="qr-placeholder">
                <i class="fas fa-qrcode"></i>
                <p>Gerando QR Code...</p>
            </div>
        `;
    }

    handleModalClick(e) {
        if (e.target === this.paymentModal) {
            this.closeModal();
        }
    }

    copyPixKey() {
        this.pixKeyInput.select();
        document.execCommand('copy');
        
        this.copyPixKeyBtn.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
            this.copyPixKeyBtn.innerHTML = '<i class="fas fa-copy"></i>';
        }, 2000);
        
        this.showToast('Chave PIX copiada!', 'success');
    }

    // Utility methods
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add toast styles if not exists
        if (!document.querySelector('.toast-container')) {
            const container = document.createElement('div');
            container.className = 'toast-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 3000;
            `;
            document.body.appendChild(container);
        }
        
        const container = document.querySelector('.toast-container');
        container.appendChild(toast);
        
        // Toast styles
        toast.style.cssText = `
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#06b6d4'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            margin-bottom: 0.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after delay
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    // Carregar e animar contador de analytics
    async loadAnalyticsCounter() {
        try {
            const response = await fetch(`${CONFIG.API_URL}/analytics/counter`);
            if (!response.ok) {
                throw new Error('Erro ao carregar contador');
            }

            const data = await response.json();
            
            // Animar números
            this.animateCounter('totalViews', data.totalViews || 0);
            this.animateCounter('uniqueVisitors', data.uniqueVisitors || 0);
            this.animateCounter('todayViews', data.todayViews || 0);
            this.animateCounter('totalConversions', data.totalConversions || 0);

            // Recarregar a cada 30 segundos
            setTimeout(() => {
                this.loadAnalyticsCounter();
            }, 30000);

        } catch (error) {
            console.error('Erro ao carregar analytics:', error);
            // Usar valores padrão em caso de erro
            this.animateCounter('totalViews', 1247);
            this.animateCounter('uniqueVisitors', 892);
            this.animateCounter('todayViews', 34);
            this.animateCounter('totalConversions', 156);
        }
    }

    animateCounter(elementId, targetValue) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const startValue = parseInt(element.textContent) || 0;
        const duration = 1500; // 1.5 segundos
        const startTime = performance.now();

        const updateCounter = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function para animação suave
            const easeOutExpo = 1 - Math.pow(2, -10 * progress);
            const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOutExpo);
            
            element.textContent = currentValue.toLocaleString('pt-BR');
            element.classList.add('animate');
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = targetValue.toLocaleString('pt-BR');
                setTimeout(() => {
                    element.classList.remove('animate');
                }, 500);
            }
        };

        requestAnimationFrame(updateCounter);
    }
}

// Analytics and performance tracking
class Analytics {
    constructor() {
        this.sessionStart = Date.now();
        this.events = [];
    }

    track(event, data = {}) {
        this.events.push({
            event,
            data,
            timestamp: Date.now()
        });
        
        // Send to analytics service (implement according to your needs)
        console.log('Analytics:', event, data);
    }

    trackPageView() {
        this.track('page_view', {
            url: window.location.href,
            referrer: document.referrer
        });
    }

    trackFileUpload(fileSize, fileName) {
        this.track('file_upload', {
            file_size: fileSize,
            file_name: fileName.replace(/[^.]+/, 'anonymized') // Anonymize filename
        });
    }

    trackConversion(success) {
        this.track('conversion_attempt', {
            success,
            session_duration: Date.now() - this.sessionStart
        });
    }

    trackPayment(status) {
        this.track('payment_status', {
            status
        });
    }
}

// Ad management
class AdManager {
    constructor() {
        this.adSpaces = document.querySelectorAll('.ad-space .ad-placeholder');
        this.loadAds();
    }

    loadAds() {
        // Implementar integração com Google AdSense ou outros provedores
        this.adSpaces.forEach((ad, index) => {
            // Placeholder para implementação de ads reais
            setTimeout(() => {
                if (Math.random() > 0.3) { // Simular carregamento de ad
                    this.showAd(ad, index);
                }
            }, 1000 + index * 500);
        });
    }

    showAd(container, index) {
        // Em produção, substituir por código real de ads
        const adContent = `
            <div style="background: linear-gradient(45deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; border-radius: 8px; text-align: center;">
                <h3>Anúncio Exemplo ${index + 1}</h3>
                <p>Este espaço será usado para anúncios</p>
                <button style="background: white; color: #333; border: none; padding: 0.5rem 1rem; border-radius: 4px; margin-top: 1rem;">Saiba Mais</button>
            </div>
        `;
        container.innerHTML = adContent;
    }
}

// Error handling and logging
class ErrorHandler {
    constructor() {
        this.setupGlobalErrorHandling();
    }

    setupGlobalErrorHandling() {
        window.addEventListener('error', (e) => {
            this.logError('JavaScript Error', e.error, {
                filename: e.filename,
                lineno: e.lineno,
                colno: e.colno
            });
        });

        window.addEventListener('unhandledrejection', (e) => {
            this.logError('Unhandled Promise Rejection', e.reason);
        });
    }

    logError(type, error, details = {}) {
        const errorInfo = {
            type,
            message: error?.message || error,
            stack: error?.stack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            ...details
        };

        console.error('Error logged:', errorInfo);
        
        // Em produção, enviar para serviço de logging
        // this.sendToLoggingService(errorInfo);
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize main application
    const converter = new MPPConverter();
    
    // Initialize analytics
    const analytics = new Analytics();
    analytics.trackPageView();
    
    // Initialize ad manager
    const adManager = new AdManager();
    
    // Initialize error handling
    const errorHandler = new ErrorHandler();
    
    // Make instances globally available for debugging
    window.app = {
        converter,
        analytics,
        adManager,
        errorHandler
    };
    
    console.log('MPP Converter initialized successfully');
});