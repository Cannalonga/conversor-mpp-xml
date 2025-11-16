/**
 * Integração Backend API - Sistema Completo de Conversão
 * Conecta frontend com APIs de conversão e sistema de pagamento
 */

class ConversorAPI {
    constructor() {
        this.baseURL = 'http://localhost:8000';
        this.currentOrder = null;
        this.pollingInterval = null;
        
        console.log('🔌 API Integração inicializada');
        this.testConnection();
    }

    // ===== TESTES DE CONECTIVIDADE =====
    
    async testConnection() {
        try {
            const response = await fetch(`${this.baseURL}/health`);
            const data = await response.json();
            
            if (data.status === 'healthy') {
                console.log('✅ API conectada:', data);
                this.showStatus('🌐 Sistema online e funcionando!', 'success');
            }
        } catch (error) {
            console.error('❌ API não disponível:', error);
            this.showStatus('⚠️ Verifique se a API está rodando', 'error');
        }
    }

    // ===== CRIAÇÃO DE PEDIDOS =====
    
    async createOrder(file) {
        console.log('🚀 Criando pedido para:', file.name);
        
        try {
            this.showStatus('📤 Criando pedido...', 'info');
            
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch(`${this.baseURL}/api/orders/create`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.currentOrder = data;
                console.log('✅ Pedido criado:', data.order_id);
                
                this.showOrderCreated(data);
                return data;
            } else {
                throw new Error(data.detail || 'Erro ao criar pedido');
            }
            
        } catch (error) {
            console.error('❌ Erro:', error);
            this.showStatus(`❌ Erro: ${error.message}`, 'error');
            throw error;
        }
    }

    // ===== CONVERSÃO DIRETA (SEM PAGAMENTO) =====
    
    async convertPDFDirect(file) {
        console.log('🔄 Convertendo PDF diretamente:', file.name);
        
        try {
            this.showStatus('⚙️ Processando conversão...', 'info');
            
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch(`${this.baseURL}/api/convert/pdf/text`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (response.ok) {
                console.log('✅ Conversão concluída:', data.conversion_id);
                this.showConversionResult(data);
                return data;
            } else {
                throw new Error(data.detail || 'Erro na conversão');
            }
            
        } catch (error) {
            console.error('❌ Erro na conversão:', error);
            this.showStatus(`❌ Erro: ${error.message}`, 'error');
            throw error;
        }
    }

    // ===== MONITORAMENTO DE PEDIDOS =====
    
    async checkOrderStatus(orderId) {
        try {
            const response = await fetch(`${this.baseURL}/api/orders/${orderId}`);
            const data = await response.json();
            
            if (response.ok) {
                console.log(`📊 Status do pedido ${orderId}:`, data.status);
                return data;
            } else {
                throw new Error('Erro ao verificar status');
            }
            
        } catch (error) {
            console.error('❌ Erro no status:', error);
            return null;
        }
    }

    startPolling(orderId) {
        console.log('🔍 Iniciando monitoramento:', orderId);
        
        this.pollingInterval = setInterval(async () => {
            const status = await this.checkOrderStatus(orderId);
            
            if (status) {
                this.updateOrderStatus(status);
                
                // Parar polling se concluído ou erro
                if (['completed', 'failed', 'expired'].includes(status.status)) {
                    this.stopPolling();
                }
            }
        }, 2000); // Check a cada 2 segundos
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            console.log('🛑 Polling parado');
        }
    }

    // ===== PAGAMENTO =====
    
    async confirmPayment(orderId) {
        console.log('💰 Confirmando pagamento:', orderId);
        
        try {
            const response = await fetch(`${this.baseURL}/api/orders/${orderId}/confirm-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ simulated: true })
            });
            
            if (response.ok) {
                console.log('✅ Pagamento confirmado');
                this.showStatus('✅ Pagamento confirmado! Processando...', 'success');
                return true;
            } else {
                throw new Error('Erro na confirmação');
            }
            
        } catch (error) {
            console.error('❌ Erro no pagamento:', error);
            this.showStatus(`❌ Erro: ${error.message}`, 'error');
            return false;
        }
    }

    // ===== DOWNLOAD =====
    
    async downloadResult(orderId, filename) {
        console.log('📥 Baixando resultado:', orderId);
        
        try {
            const response = await fetch(`${this.baseURL}/api/orders/${orderId}/download`);
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `${filename}.txt`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                
                console.log('✅ Download concluído');
                this.showStatus('✅ Download concluído!', 'success');
                return true;
            } else {
                throw new Error('Arquivo não disponível');
            }
            
        } catch (error) {
            console.error('❌ Erro no download:', error);
            this.showStatus(`❌ Erro: ${error.message}`, 'error');
            return false;
        }
    }

    // ===== INTERFACE DO USUÁRIO =====
    
    showStatus(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // Criar ou atualizar elemento de status
        let statusDiv = document.getElementById('api-status');
        if (!statusDiv) {
            statusDiv = document.createElement('div');
            statusDiv.id = 'api-status';
            statusDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 8px;
                color: white;
                font-weight: bold;
                z-index: 1000;
                max-width: 300px;
                word-wrap: break-word;
                transition: all 0.3s ease;
            `;
            document.body.appendChild(statusDiv);
        }
        
        // Definir cor baseada no tipo
        const colors = {
            info: '#17a2b8',
            success: '#28a745', 
            error: '#dc3545',
            warning: '#ffc107'
        };
        
        statusDiv.style.backgroundColor = colors[type] || colors.info;
        statusDiv.textContent = message;
        
        // Auto-remover após 5 segundos
        setTimeout(() => {
            if (statusDiv && statusDiv.parentNode) {
                statusDiv.style.opacity = '0';
                setTimeout(() => {
                    if (statusDiv.parentNode) {
                        statusDiv.parentNode.removeChild(statusDiv);
                    }
                }, 300);
            }
        }, 5000);
    }

    showOrderCreated(orderData) {
        console.log('📋 Mostrando pedido criado');
        
        // Atualizar interface com dados do pedido
        const orderInfo = `
            <div class="order-created">
                <h3>💰 Pedido Criado: ${orderData.order_id}</h3>
                <p><strong>Arquivo:</strong> ${orderData.filename}</p>
                <p><strong>Preço:</strong> ${orderData.price}</p>
                <p><strong>Status:</strong> ${orderData.status}</p>
                
                <div class="payment-section">
                    <h4>🏧 Pagamento PIX</h4>
                    <p>Código PIX: <code>${orderData.payment.pix_code}</code></p>
                    <button onclick="conversorAPI.confirmPayment('${orderData.order_id}')" 
                            class="btn-payment">
                        ✅ Simular Pagamento (TESTE)
                    </button>
                </div>
            </div>
        `;
        
        this.updateResultArea(orderInfo);
        
        // Iniciar monitoramento
        this.startPolling(orderData.order_id);
    }

    showConversionResult(resultData) {
        console.log('🎉 Mostrando resultado da conversão');
        
        const result = `
            <div class="conversion-result">
                <h3>🎉 Conversão Concluída!</h3>
                <p><strong>ID:</strong> ${resultData.conversion_id}</p>
                <p><strong>Arquivo:</strong> ${resultData.filename}</p>
                <p><strong>Texto extraído:</strong> ${resultData.text_length} caracteres</p>
                <p><strong>Preço:</strong> ${resultData.price}</p>
                
                <div class="text-preview">
                    <h4>📄 Preview do texto:</h4>
                    <textarea readonly style="width: 100%; height: 200px; font-family: monospace;">
${resultData.extracted_text}
                    </textarea>
                </div>
                
                <button onclick="conversorAPI.downloadText('${resultData.extracted_text}', '${resultData.filename}')" 
                        class="btn-download">
                    📥 Baixar Resultado
                </button>
            </div>
        `;
        
        this.updateResultArea(result);
    }

    updateOrderStatus(statusData) {
        console.log('🔄 Atualizando status:', statusData.status);
        
        // Atualizar interface com novo status
        const statusElement = document.querySelector('.order-status');
        if (statusElement) {
            statusElement.textContent = statusData.status;
        }
        
        // Se completado, mostrar resultado
        if (statusData.status === 'completed') {
            this.showStatus('🎉 Conversão concluída!', 'success');
            
            if (this.currentOrder) {
                const downloadBtn = document.createElement('button');
                downloadBtn.textContent = '📥 Baixar Resultado';
                downloadBtn.onclick = () => this.downloadResult(this.currentOrder.order_id, this.currentOrder.filename);
                
                const resultArea = document.getElementById('conversionResult');
                if (resultArea) {
                    resultArea.appendChild(downloadBtn);
                }
            }
        }
    }

    updateResultArea(html) {
        let resultArea = document.getElementById('conversionResult');
        if (!resultArea) {
            resultArea = document.createElement('div');
            resultArea.id = 'conversionResult';
            resultArea.style.cssText = `
                margin-top: 20px;
                padding: 20px;
                border: 1px solid #ddd;
                border-radius: 8px;
                background: #f9f9f9;
            `;
            
            // Adicionar após área de upload
            const uploadArea = document.getElementById('uploadArea');
            if (uploadArea && uploadArea.parentNode) {
                uploadArea.parentNode.insertBefore(resultArea, uploadArea.nextSibling);
            } else {
                document.body.appendChild(resultArea);
            }
        }
        
        resultArea.innerHTML = html;
    }

    // Helper para download direto de texto
    downloadText(text, filename) {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        this.showStatus('✅ Download iniciado!', 'success');
    }

    // ===== MÉTODOS PÚBLICOS PARA INTEGRAÇÃO =====
    
    // Conversão simples (para PDFs)
    async simpleConvert(file) {
        if (file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf')) {
            return await this.convertPDFDirect(file);
        } else {
            // Para outros tipos, criar pedido com pagamento
            return await this.createOrder(file);
        }
    }

    // Reset do sistema
    reset() {
        this.currentOrder = null;
        this.stopPolling();
        
        const resultArea = document.getElementById('conversionResult');
        if (resultArea) {
            resultArea.remove();
        }
        
        const statusDiv = document.getElementById('api-status');
        if (statusDiv) {
            statusDiv.remove();
        }
        
        console.log('🔄 Sistema resetado');
    }
}

// ===== INICIALIZAÇÃO GLOBAL =====

// Instância global da API
let conversorAPI;

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando integração API...');
    
    // Criar instância da API
    conversorAPI = new ConversorAPI();
    
    // Integrar com o sistema existente se disponível
    if (typeof currentFile !== 'undefined') {
        console.log('🔌 Integração com sistema existente detectada');
    }
    
    console.log('✅ API Integration pronta!');
});

// ===== FUNÇÕES AUXILIARES PARA INTEGRAÇÃO =====

/**
 * Função principal para conversão - usar no onclick dos botões
 */
async function startConversion(file) {
    if (!file) {
        conversorAPI.showStatus('❌ Nenhum arquivo selecionado', 'error');
        return;
    }
    
    console.log('🎯 Iniciando conversão:', file.name);
    
    try {
        const result = await conversorAPI.simpleConvert(file);
        console.log('✅ Conversão iniciada:', result);
        return result;
    } catch (error) {
        console.error('❌ Erro na conversão:', error);
        return null;
    }
}

/**
 * Função para reset - usar em botões de "novo arquivo"
 */
function resetConverter() {
    conversorAPI.reset();
    
    // Reset de variáveis globais se existirem
    if (typeof currentFile !== 'undefined') {
        currentFile = null;
    }
    
    // Limpar inputs de arquivo
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => input.value = '');
}

/**
 * Função para testar conectividade
 */
async function testAPIConnection() {
    if (conversorAPI) {
        await conversorAPI.testConnection();
    } else {
        console.warn('⚠️ API não inicializada ainda');
    }
}

// Exportar para uso global
window.conversorAPI = conversorAPI;
window.startConversion = startConversion;
window.resetConverter = resetConverter;
window.testAPIConnection = testAPIConnection;