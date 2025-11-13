// Conversor MPP → XML - Versão Limpa e Funcional
console.log('🚀 Conversor MPP iniciando...');

// Configuração
const CONFIG = {
    API_URL: '/api',
    MAX_FILE_SIZE: Infinity,
    SUPPORTED_FORMATS: ['.mpp'],
    PAYMENT_TIMEOUT: 15 * 60 * 1000,
    POLLING_INTERVAL: 5000,
    PIX_KEY: '02038351740',
    PIX_BANK: 'Nubank'
};

// Classe principal
class MPPConverter {
    constructor() {
        this.currentFile = null;
        this.paymentTimer = null;
        this.paymentPolling = null;
        this.conversionId = null;
        
        console.log('🔧 Inicializando conversor...');
        this.initializeElements();
        this.setupEventListeners();
        this.loadAnalyticsCounter();
    }

    initializeElements() {
        console.log('🔍 Localizando elementos...');
        
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
        
        console.log('✅ Elementos localizados');
    }

    setupEventListeners() {
        console.log('🔧 Configurando eventos...');
        
        if (!this.uploadArea || !this.fileInput) {
            console.error('❌ Elementos de upload não encontrados');
            return;
        }

        // Upload area click
        this.uploadArea.addEventListener('click', (e) => {
            console.log('🖱️ Clique na área de upload');
            e.preventDefault();
            e.stopPropagation();
            this.fileInput.click();
        });
        
        // File input change
        this.fileInput.addEventListener('change', (e) => {
            console.log('📂 Arquivo selecionado');
            this.handleFileSelect(e);
        });
        
        // Drag and drop
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));

        // Remove file button
        if (this.removeFileBtn) {
            this.removeFileBtn.addEventListener('click', () => this.removeFile());
        }

        // Convert button
        if (this.convertBtn) {
            this.convertBtn.addEventListener('click', () => this.startConversion());
        }

        // Modal events
        if (this.closeModalBtn) {
            this.closeModalBtn.addEventListener('click', () => this.closeModal());
        }
        
        if (this.paymentModal) {
            this.paymentModal.addEventListener('click', (e) => this.handleModalClick(e));
        }

        // Copy PIX key
        if (this.copyPixKeyBtn) {
            this.copyPixKeyBtn.addEventListener('click', () => this.copyPixKey());
        }

        console.log('✅ Eventos configurados');
    }

    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

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

    processFile(file) {
        console.log('📄 Processando arquivo:', file.name);
        
        // Validar formato
        if (!this.validateFileFormat(file)) {
            this.showToast('Formato de arquivo não suportado. Use apenas arquivos .mpp', 'error');
            return;
        }

        console.log('✅ Arquivo válido:', file.name);
        this.currentFile = file;
        this.showFilePreview(file);
        
        if (this.convertBtn) {
            this.convertBtn.disabled = false;
        }
    }

    validateFileFormat(file) {
        const extension = '.' + file.name.split('.').pop().toLowerCase();
        return CONFIG.SUPPORTED_FORMATS.includes(extension);
    }

    showFilePreview(file) {
        if (this.filePreview) {
            this.filePreview.style.display = 'block';
        }
        
        if (this.fileName) {
            this.fileName.textContent = file.name;
        }
        
        if (this.fileSize) {
            this.fileSize.textContent = this.formatFileSize(file.size);
        }
    }

    removeFile() {
        this.currentFile = null;
        
        if (this.fileInput) {
            this.fileInput.value = '';
        }
        
        if (this.filePreview) {
            this.filePreview.style.display = 'none';
        }
        
        if (this.convertBtn) {
            this.convertBtn.disabled = true;
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async startConversion() {
        if (!this.currentFile) {
            this.showToast('Selecione um arquivo primeiro', 'error');
            return;
        }

        console.log('🔄 Iniciando conversão...');
        
        try {
            this.convertBtn.disabled = true;
            this.convertBtn.textContent = 'Enviando...';

            // Upload do arquivo
            const formData = new FormData();
            formData.append('file', this.currentFile);

            const response = await fetch(`${CONFIG.API_URL}/upload`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                this.conversionId = result.conversionId;
                this.showPaymentModal();
            } else {
                throw new Error('Erro no upload');
            }

        } catch (error) {
            console.error('❌ Erro:', error);
            this.showToast('Erro no upload. Tente novamente.', 'error');
            this.resetConvertButton();
        }
    }

    resetConvertButton() {
        if (this.convertBtn) {
            this.convertBtn.disabled = false;
            this.convertBtn.textContent = 'Converter Arquivo';
        }
    }

    showPaymentModal() {
        console.log('💳 Mostrando modal de pagamento...');
        
        if (this.paymentModal) {
            this.paymentModal.style.display = 'flex';
        }
        
        if (this.paymentFileName) {
            this.paymentFileName.textContent = this.currentFile.name;
        }
        
        this.generateQRCode();
        this.startPaymentTimer();
    }

    async generateQRCode() {
        try {
            const response = await fetch(`${CONFIG.API_URL}/payment/qrcode`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversionId: this.conversionId,
                    amount: 10.00
                })
            });

            if (response.ok) {
                const result = await response.json();
                
                if (this.qrCode) {
                    this.qrCode.innerHTML = `<img src="data:image/png;base64,${result.qrCodeImage}" alt="QR Code PIX">`;
                }
                
                if (this.pixKeyInput) {
                    this.pixKeyInput.value = '***PIX OCULTO PARA SEGURANÇA***';
                }
            }
        } catch (error) {
            console.error('❌ Erro ao gerar QR Code:', error);
        }
    }

    startPaymentTimer() {
        let timeLeft = CONFIG.PAYMENT_TIMEOUT / 1000; // segundos
        
        this.paymentTimer = setInterval(() => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            
            if (this.timer) {
                this.timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
            
            timeLeft--;
            
            if (timeLeft < 0) {
                this.clearPaymentTimer();
                this.showToast('Tempo de pagamento expirado', 'error');
                this.closeModal();
            }
        }, 1000);
    }

    clearPaymentTimer() {
        if (this.paymentTimer) {
            clearInterval(this.paymentTimer);
            this.paymentTimer = null;
        }
    }

    closeModal() {
        if (this.paymentModal) {
            this.paymentModal.style.display = 'none';
        }
        
        this.clearPaymentTimer();
        this.resetConvertButton();
    }

    handleModalClick(e) {
        if (e.target === this.paymentModal) {
            this.closeModal();
        }
    }

    copyPixKey() {
        if (this.pixKeyInput) {
            this.pixKeyInput.select();
            document.execCommand('copy');
            this.showToast('Chave PIX copiada!', 'success');
        }
    }

    loadAnalyticsCounter() {
        // Simular carregamento de analytics
        console.log('📊 Carregando analytics...');
    }

    showToast(message, type = 'info') {
        console.log(`🔔 Toast [${type}]: ${message}`);
        
        // Criar toast simples
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 9999;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM carregado - Inicializando conversor...');
    
    try {
        window.converter = new MPPConverter();
        console.log('🎉 Conversor inicializado com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao inicializar conversor:', error);
    }
});

console.log('📜 Script carregado com sucesso');