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

    // ===== CONVERSÃO EXCEL =====

    async convertExcelDirect(file, outputFormat = 'csv', options = {}) {
        console.log('📊 Convertendo Excel diretamente:', file.name, 'para', outputFormat);
        
        try {
            this.showStatus('⚙️ Processando conversão Excel...', 'info');
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('output_format', outputFormat);
            
            // Adicionar opções avançadas se fornecidas
            if (options.compression) formData.append('compression', options.compression);
            if (options.chunk_size) formData.append('chunk_size', options.chunk_size);
            if (options.normalize_columns !== undefined) formData.append('normalize_columns', options.normalize_columns);
            if (options.remove_empty_rows !== undefined) formData.append('remove_empty_rows', options.remove_empty_rows);
            if (options.sheets_to_convert) {
                options.sheets_to_convert.forEach(sheet => {
                    formData.append('sheets_to_convert', sheet);
                });
            }
            
            const response = await fetch(`${this.baseURL}/api/excel/convert`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (response.ok) {
                console.log('✅ Conversão Excel concluída:', data.output_filename);
                this.showExcelConversionResult(data);
                return data;
            } else {
                throw new Error(data.detail || 'Erro na conversão Excel');
            }
            
        } catch (error) {
            console.error('❌ Erro na conversão Excel:', error);
            this.showStatus(`❌ Erro: ${error.message}`, 'error');
            throw error;
        }
    }

    async convertExcelAsync(file, outputFormat = 'csv', options = {}) {
        console.log('🔄 Iniciando conversão Excel assíncrona:', file.name);
        
        try {
            this.showStatus('📤 Enviando arquivo para conversão...', 'info');
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('output_format', outputFormat);
            if (options.compression) formData.append('compression', options.compression);
            
            const response = await fetch(`${this.baseURL}/api/excel/convert-async`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (response.ok) {
                console.log('✅ Conversão em fila:', data.task_id);
                this.showExcelAsyncStart(data);
                this.startExcelPolling(data.task_id);
                return data;
            } else {
                throw new Error(data.detail || 'Erro ao iniciar conversão');
            }
            
        } catch (error) {
            console.error('❌ Erro:', error);
            this.showStatus(`❌ Erro: ${error.message}`, 'error');
            throw error;
        }
    }

    async getExcelFormats() {
        try {
            const response = await fetch(`${this.baseURL}/api/excel/formats`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('❌ Erro ao obter formatos Excel:', error);
            return null;
        }
    }

    async getExcelFileInfo(file) {
        try {
            this.showStatus('🔍 Analisando arquivo Excel...', 'info');
            
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch(`${this.baseURL}/api/excel/info`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (response.ok) {
                console.log('📊 Informações do Excel:', data);
                return data;
            } else {
                throw new Error(data.detail || 'Erro ao analisar arquivo');
            }
            
        } catch (error) {
            console.error('❌ Erro:', error);
            this.showStatus(`❌ Erro: ${error.message}`, 'error');
            return null;
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

    // ===== INTERFACE EXCEL (MÉTODOS DA CLASSE) =====

    showExcelConversionResult(resultData) {
        console.log('📊 Mostrando resultado da conversão Excel');
        
        const result = `
            <div class="excel-conversion-result">
                <h3>📊 Conversão Excel Concluída!</h3>
                <p><strong>Arquivo:</strong> ${resultData.output_filename}</p>
                <p><strong>Formato:</strong> ${resultData.output_format.toUpperCase()}</p>
                <p><strong>Compressão:</strong> ${resultData.compression_used || 'Nenhuma'}</p>
                
                <div class="file-stats">
                    <h4>📈 Estatísticas do Arquivo:</h4>
                    <ul>
                        <li><strong>Planilhas:</strong> ${resultData.file_info.sheets_count}</li>
                        <li><strong>Linhas processadas:</strong> ${resultData.parsing_stats.total_rows_written}</li>
                        <li><strong>Tempo de processamento:</strong> ${resultData.parsing_stats.processing_time_seconds.toFixed(2)}s</li>
                        <li><strong>Pico de memória:</strong> ${resultData.parsing_stats.memory_peak_mb.toFixed(1)}MB</li>
                    </ul>
                </div>
                
                <div class="security-check">
                    <h4>🔒 Verificação de Segurança:</h4>
                    <p><strong>Nível de risco:</strong> <span class="risk-${resultData.security_check.security_risk_level}">${resultData.security_check.security_risk_level.toUpperCase()}</span></p>
                    <p><strong>Macros:</strong> ${resultData.security_check.is_macro_enabled ? '⚠️ Detectadas' : '✅ Não detectadas'}</p>
                </div>
                
                <button onclick="conversorAPI.downloadExcelResult('${resultData.download_url}', '${resultData.output_filename}')" 
                        class="btn-download excel-download">
                    📥 Baixar ${resultData.output_format.toUpperCase()}
                </button>
            </div>
        `;
        
        this.updateResultArea(result);
        this.addExcelStyles();
    }

    showExcelAsyncStart(taskData) {
        console.log('⏳ Mostrando início da conversão assíncrona');
        
        const result = `
            <div class="excel-async-progress">
                <h3>⏳ Conversão Excel em Progresso</h3>
                <p><strong>ID da Tarefa:</strong> ${taskData.task_id}</p>
                <p><strong>Status:</strong> <span id="async-status">${taskData.status}</span></p>
                <p><strong>Tempo estimado:</strong> ${taskData.estimated_time_minutes} minutos</p>
                
                <div class="progress-container">
                    <div class="progress-bar">
                        <div id="progress-fill" class="progress-fill" style="width: 0%"></div>
                    </div>
                    <span id="progress-text">0%</span>
                </div>
                
                <div id="current-step" class="current-step">
                    Aguardando na fila...
                </div>
            </div>
        `;
        
        this.updateResultArea(result);
        this.addProgressStyles();
    }

    startExcelPolling(taskId) {
        console.log('🔄 Iniciando polling para tarefa:', taskId);
        
        this.pollingInterval = setInterval(async () => {
            try {
                const response = await fetch(`${this.baseURL}/api/excel/status/${taskId}`);
                const statusData = await response.json();
                
                console.log('📊 Status Excel:', statusData);
                
                this.updateExcelProgress(statusData);
                
                // Parar polling se concluído
                if (statusData.status === 'completed' || statusData.status === 'failed') {
                    clearInterval(this.pollingInterval);
                    
                    if (statusData.status === 'completed') {
                        this.showExcelAsyncCompleted(statusData);
                    } else {
                        this.showExcelAsyncFailed(statusData);
                    }
                }
                
            } catch (error) {
                console.error('❌ Erro no polling Excel:', error);
            }
        }, 2000);
    }

    updateExcelProgress(statusData) {
        // Atualizar status
        const statusElement = document.getElementById('async-status');
        if (statusElement) {
            statusElement.textContent = statusData.status;
        }
        
        // Atualizar progresso
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        if (progressFill && progressText) {
            progressFill.style.width = `${statusData.progress_percentage}%`;
            progressText.textContent = `${statusData.progress_percentage.toFixed(1)}%`;
        }
        
        // Atualizar etapa atual
        const stepElement = document.getElementById('current-step');
        if (stepElement) {
            stepElement.textContent = statusData.current_step;
        }
    }

    showExcelAsyncCompleted(statusData) {
        this.showStatus('🎉 Conversão Excel concluída!', 'success');
        
        const result = `
            <div class="excel-async-completed">
                <h3>🎉 Conversão Excel Concluída!</h3>
                <p><strong>ID:</strong> ${statusData.task_id}</p>
                <p><strong>Tempo total:</strong> ${statusData.processing_time?.toFixed(2) || 'N/A'}s</p>
                
                <button onclick="window.open('${this.baseURL}${statusData.result_url}', '_blank')" 
                        class="btn-download excel-download">
                    📥 Baixar Resultado
                </button>
            </div>
        `;
        
        this.updateResultArea(result);
    }

    showExcelAsyncFailed(statusData) {
        this.showStatus('❌ Falha na conversão Excel', 'error');
        
        const result = `
            <div class="excel-async-failed">
                <h3>❌ Erro na Conversão</h3>
                <p><strong>ID:</strong> ${statusData.task_id}</p>
                <p><strong>Erro:</strong> ${statusData.error_message}</p>
                
                <button onclick="location.reload()" class="btn-retry">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;
        
        this.updateResultArea(result);
    }

    async downloadExcelResult(downloadUrl, filename) {
        try {
            this.showStatus('📥 Baixando arquivo...', 'info');
            
            const response = await fetch(`${this.baseURL}${downloadUrl}`);
            
            if (!response.ok) {
                throw new Error('Erro no download');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            
            document.body.appendChild(a);
            a.click();
            
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            this.showStatus('✅ Download concluído!', 'success');
            
        } catch (error) {
            console.error('❌ Erro no download:', error);
            this.showStatus('❌ Erro no download', 'error');
        }
    }

    addExcelStyles() {
        if (!document.getElementById('excel-styles')) {
            const style = document.createElement('style');
            style.id = 'excel-styles';
            style.textContent = `
                .excel-conversion-result {
                    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                    border-radius: 12px;
                    padding: 20px;
                    margin: 10px 0;
                }
                
                .file-stats ul {
                    list-style: none;
                    padding: 0;
                }
                
                .file-stats li {
                    background: #fff;
                    margin: 5px 0;
                    padding: 8px 12px;
                    border-radius: 6px;
                    border-left: 4px solid #007bff;
                }
                
                .security-check {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 8px;
                    margin: 10px 0;
                }
                
                .risk-low { color: #28a745; font-weight: bold; }
                .risk-medium { color: #ffc107; font-weight: bold; }
                .risk-high { color: #dc3545; font-weight: bold; }
                
                .excel-download {
                    background: linear-gradient(45deg, #28a745, #20c997);
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 16px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                
                .excel-download:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
                }
            `;
            document.head.appendChild(style);
        }
    }

    addProgressStyles() {
        if (!document.getElementById('progress-styles')) {
            const style = document.createElement('style');
            style.id = 'progress-styles';
            style.textContent = `
                .excel-async-progress {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border-radius: 12px;
                    padding: 20px;
                    margin: 10px 0;
                }
                
                .progress-container {
                    margin: 15px 0;
                    text-align: center;
                }
                
                .progress-bar {
                    width: 100%;
                    height: 20px;
                    background: rgba(255,255,255,0.2);
                    border-radius: 10px;
                    overflow: hidden;
                    margin-bottom: 10px;
                }
                
                .progress-fill {
                    height: 100%;
                    background: linear-gradient(45deg, #28a745, #20c997);
                    transition: width 0.5s ease;
                    border-radius: 10px;
                }
                
                .current-step {
                    background: rgba(255,255,255,0.1);
                    padding: 10px 15px;
                    border-radius: 8px;
                    margin-top: 15px;
                    text-align: center;
                    font-style: italic;
                }
                
                .btn-retry {
                    background: linear-gradient(45deg, #6c757d, #495057);
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
            `;
            document.head.appendChild(style);
        }
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

// ===== FUNÇÕES ESPECÍFICAS EXCEL =====

/**
 * Converter arquivo Excel com opções
 */
async function convertExcel(file, outputFormat = 'csv', options = {}) {
    if (!conversorAPI) {
        console.error('❌ API não inicializada');
        return;
    }
    
    try {
        // Para arquivos pequenos (< 10MB), usar conversão direta
        if (file.size < 10 * 1024 * 1024) {
            return await conversorAPI.convertExcelDirect(file, outputFormat, options);
        } else {
            // Para arquivos grandes, usar conversão assíncrona
            return await conversorAPI.convertExcelAsync(file, outputFormat, options);
        }
    } catch (error) {
        console.error('❌ Erro na conversão Excel:', error);
    }
}

/**
 * Obter informações do arquivo Excel antes da conversão
 */
async function analyzeExcelFile(file) {
    if (!conversorAPI) {
        console.error('❌ API não inicializada');
        return null;
    }
    
    return await conversorAPI.getExcelFileInfo(file);
}

/**
 * Obter formatos suportados para Excel
 */
async function getExcelFormats() {
    if (!conversorAPI) {
        console.error('❌ API não inicializada');
        return null;
    }
    
    return await conversorAPI.getExcelFormats();
}

/**
 * Interface interativa para Excel
 */
function createExcelInterface() {
    const interface_html = `
        <div id="excel-interface" class="converter-interface">
            <h3>📊 Conversor Excel</h3>
            
            <div class="file-upload-section">
                <label for="excel-file">Selecionar arquivo Excel/CSV:</label>
                <input type="file" id="excel-file" accept=".xlsx,.xls,.csv,.tsv" />
                <div class="file-info" id="excel-file-info" style="display: none;"></div>
            </div>
            
            <div class="conversion-options" id="excel-options" style="display: none;">
                <h4>Opções de Conversão:</h4>
                
                <div class="option-group">
                    <label for="output-format">Formato de Saída:</label>
                    <select id="output-format">
                        <option value="csv">CSV</option>
                        <option value="json">JSON</option>
                        <option value="xml">XML</option>
                        <option value="tsv">TSV</option>
                        <option value="parquet">Parquet</option>
                    </select>
                </div>
                
                <div class="option-group">
                    <label for="compression-type">Compressão:</label>
                    <select id="compression-type">
                        <option value="none">Nenhuma</option>
                        <option value="gzip">GZIP</option>
                        <option value="zip">ZIP</option>
                        <option value="bzip2">BZIP2</option>
                    </select>
                </div>
                
                <div class="option-group">
                    <label>
                        <input type="checkbox" id="normalize-columns" checked /> 
                        Normalizar nomes de colunas
                    </label>
                </div>
                
                <div class="option-group">
                    <label>
                        <input type="checkbox" id="remove-empty-rows" checked /> 
                        Remover linhas vazias
                    </label>
                </div>
                
                <div class="option-group">
                    <label for="chunk-size">Tamanho do chunk (linhas):</label>
                    <input type="number" id="chunk-size" value="50000" min="1000" max="1000000" />
                </div>
                
                <button id="convert-excel-btn" class="btn-convert">
                    🔄 Converter Excel
                </button>
            </div>
        </div>
    `;
    
    // Adicionar interface à página
    const container = document.getElementById('conversionInterface') || document.body;
    container.insertAdjacentHTML('beforeend', interface_html);
    
    // Configurar event listeners
    setupExcelEventListeners();
}

function setupExcelEventListeners() {
    const fileInput = document.getElementById('excel-file');
    const convertBtn = document.getElementById('convert-excel-btn');
    const optionsDiv = document.getElementById('excel-options');
    
    // Upload de arquivo
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        console.log('📊 Arquivo Excel selecionado:', file.name);
        
        // Mostrar informações do arquivo
        const fileInfo = await analyzeExcelFile(file);
        if (fileInfo) {
            showExcelFileInfo(fileInfo);
            optionsDiv.style.display = 'block';
        }
    });
    
    // Botão de conversão
    convertBtn.addEventListener('click', async () => {
        const file = fileInput.files[0];
        if (!file) {
            alert('Por favor, selecione um arquivo Excel/CSV');
            return;
        }
        
        const options = {
            compression: document.getElementById('compression-type').value,
            normalize_columns: document.getElementById('normalize-columns').checked,
            remove_empty_rows: document.getElementById('remove-empty-rows').checked,
            chunk_size: parseInt(document.getElementById('chunk-size').value)
        };
        
        const outputFormat = document.getElementById('output-format').value;
        
        console.log('🚀 Iniciando conversão:', { file: file.name, outputFormat, options });
        
        await convertExcel(file, outputFormat, options);
    });
}

function showExcelFileInfo(fileInfo) {
    const infoDiv = document.getElementById('excel-file-info');
    
    const securityColor = {
        'low': 'green',
        'medium': 'orange', 
        'high': 'red'
    }[fileInfo.security_check.security_risk_level];
    
    infoDiv.innerHTML = `
        <div class="file-analysis">
            <h4>📋 Análise do Arquivo:</h4>
            <ul>
                <li><strong>Planilhas:</strong> ${fileInfo.file_info.sheets_count}</li>
                <li><strong>Total de linhas:</strong> ${fileInfo.file_info.total_rows}</li>
                <li><strong>Colunas:</strong> ${fileInfo.file_info.total_columns}</li>
                <li><strong>Macros:</strong> ${fileInfo.file_info.has_macros ? '⚠️ Detectadas' : '✅ Não detectadas'}</li>
                <li><strong>Segurança:</strong> <span style="color: ${securityColor}; font-weight: bold;">
                    ${fileInfo.security_check.security_risk_level.toUpperCase()}
                </span></li>
            </ul>
            
            <div class="sheets-list">
                <strong>Planilhas encontradas:</strong>
                <ul>
                    ${fileInfo.file_info.sheets_names.map(name => `<li>${name}</li>`).join('')}
                </ul>
            </div>
            
            <div class="recommendations">
                <strong>💡 Recomendações:</strong>
                <p>Chunk size recomendado: ${fileInfo.recommended_chunk_size} linhas</p>
            </div>
        </div>
    `;
    
    infoDiv.style.display = 'block';
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