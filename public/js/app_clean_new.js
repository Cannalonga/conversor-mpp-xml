// MPP Converter - Versão Limpa e Funcional
console.log('🚀 Carregando conversor...');

// Estado da aplicação
let currentFile = null;

// Inicialização quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log('📋 DOM carregado, configurando...');
    
    // Setup de elementos
    setupFileUpload();
    setupConversionButtons();
    
    console.log('✅ Configuração concluída');
});

function setupFileUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    if (!uploadArea || !fileInput) {
        console.log('❌ Elementos de upload não encontrados');
        return;
    }
    
    // Click na área de upload
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    // Arquivo selecionado
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        console.log('📄 Arquivo selecionado:', file.name);
        
        // Primeiro mostra preview com loading
        showFilePreview(file);
        showFileStatus('loading');
        
        // Simular validação rápida
        setTimeout(() => {
            // Validar extensão
            if (!file.name.toLowerCase().endsWith('.mpp')) {
                showFileStatus('error');
                alert('❌ Selecione um arquivo .mpp válido');
                fileInput.value = '';
                const preview = document.getElementById('filePreview');
                if (preview) preview.style.display = 'none';
                return;
            }
            
            // Arquivo válido
            currentFile = file;
            showFileStatus('success');
            enableButtons();
        }, 1500); // Aumentei para 1.5s para ver a animação
    });
    
    console.log('✅ Upload configurado');
}

function setupConversionButtons() {
    const convertBtn = document.getElementById('convertBtn');
    
    if (convertBtn) {
        convertBtn.addEventListener('click', showPaymentModal);
    }
    
    console.log('✅ Botão de conversão configurado para PIX');
    
    // Setup do modal PIX
    const closeModal = document.getElementById('closeModal');
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            const modal = document.getElementById('paymentModal');
            if (modal) modal.style.display = 'none';
        });
    }
}

function showFilePreview(file) {
    const preview = document.getElementById('filePreview');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    
    if (preview) preview.style.display = 'block';
    if (fileName) fileName.textContent = file.name;
    if (fileSize) fileSize.textContent = (file.size / 1048576).toFixed(2) + ' MB';
    
    console.log('✅ Preview exibido');
}

function showFileStatus(status) {
    const fileStatus = document.getElementById('fileStatus');
    if (!fileStatus) return;
    
    // Limpar status anterior
    fileStatus.innerHTML = '';
    
    let statusHTML = '';
    
    switch(status) {
        case 'success':
            // Quando sucesso, não mostrar nenhum ícone - arquivo OK não precisa de indicador
            statusHTML = '';
            break;
        case 'error':
            statusHTML = `
                <div class="status-error">
                    <div class="loading-spinner error-spinner">
                        <div class="loading-dot"></div>
                        <div class="loading-dot"></div>
                        <div class="loading-dot"></div>
                        <div class="loading-dot"></div>
                        <div class="loading-dot"></div>
                        <div class="loading-dot"></div>
                        <div class="loading-dot"></div>
                        <div class="loading-dot"></div>
                    </div>
                </div>`;
            break;
        case 'loading':
            statusHTML = `
                <div class="status-loading">
                    <div class="loading-spinner">
                        <div class="loading-dot"></div>
                        <div class="loading-dot"></div>
                        <div class="loading-dot"></div>
                        <div class="loading-dot"></div>
                        <div class="loading-dot"></div>
                        <div class="loading-dot"></div>
                        <div class="loading-dot"></div>
                        <div class="loading-dot"></div>
                    </div>
                </div>`;
            break;
    }
    
    fileStatus.innerHTML = statusHTML;
    console.log(`📊 Status do arquivo: ${status}`);
}

function enableButtons() {
    const convertBtn = document.getElementById('convertBtn');
    
    if (convertBtn) convertBtn.disabled = false;
    
    console.log('✅ Botão habilitado');
}

function startConversion() {
    console.log('🔄 Iniciando conversão...');
    
    if (!currentFile) {
        alert('❌ Selecione um arquivo .mpp primeiro!');
        return;
    }
    
    console.log('📄 Convertendo:', currentFile.name);
    
    // Mostrar progresso
    showProgress();
    
    // Desabilitar botão
    const convertBtn = document.getElementById('convertBtn');
    if (convertBtn) {
        convertBtn.textContent = 'Convertendo...';
        convertBtn.disabled = true;
    }
    
    // Fazer upload
    uploadFile(currentFile)
        .then(result => {
            console.log('✅ Sucesso:', result);
            updateProgress(100, 'Conversão concluída!');
            
            if (result.xmlContent) {
                console.log('🎉 XML empacotado em ZIP! Sem red flags!');
                
                // Salvar ID do arquivo para download seguro via servidor
                window.currentFileId = result.fileId;
                
                // Mostrar opções de download
                showDownloadOptions(result.xmlContent, result.fileId, currentFile.name);
            } else {
                console.error('❌ XML não recebido na resposta');
                alert('Erro: XML não foi gerado na conversão');
            }
            
            setTimeout(() => {
                hideProgress();
                resetButtons();
            }, 2000);
        })
        .catch(error => {
            console.error('❌ Erro:', error);
            updateProgress(0, 'Erro na conversão');
            alert('Erro: ' + error.message);
            
            setTimeout(() => {
                hideProgress();
                resetButtons();
            }, 2000);
        });
}

async function uploadFile(file) {
    console.log('📤 Enviando arquivo...', `${(file.size / 1024 / 1024).toFixed(2)}MB`);
    
    const formData = new FormData();
    formData.append('file', file);
    
    updateProgress(30, 'Enviando arquivo...');
    
    try {
        // Timeout maior para arquivos grandes
        const timeoutMs = Math.max(30000, file.size / 1000); // 1ms por KB, mínimo 30s
        console.log(`⏱️ Timeout configurado: ${timeoutMs}ms`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        const response = await fetch('/api/upload-test', {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        updateProgress(60, 'Processando...');
        
        if (!response.ok) {
            throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
        
        updateProgress(80, 'Convertendo...');
        
        let result;
        try {
            result = await response.json();
        } catch (jsonError) {
            console.warn('⚠️ Erro ao parsear JSON, tentando texto:', jsonError);
            const text = await response.text();
            console.log('📄 Resposta como texto:', text.substring(0, 200) + '...');
            throw new Error('Resposta inválida do servidor');
        }
        
        updateProgress(95, 'Finalizando...');
        return result;
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('⏱️ Upload cancelado por timeout');
            throw new Error('Upload cancelado - arquivo muito grande ou conexão lenta');
        } else if (error.message.includes('Failed to fetch')) {
            console.error('🌐 Erro de conexão');
            throw new Error('Erro de conexão - verifique se o servidor está rodando');
        }
        console.error('❌ Erro no upload:', error);
        throw error;
    }
}

function downloadXML(xmlContent, originalName) {
    console.log('📥 Baixando XML...');
    
    try {
        // Validar e limpar o conteúdo XML
        const cleanXML = validateAndCleanXML(xmlContent);
        
        // Criar blob com tipo MIME correto e encoding
        const blob = new Blob([cleanXML], { 
            type: 'application/xml;charset=utf-8' 
        });
        
        const url = window.URL.createObjectURL(blob);
        const fileName = originalName.replace('.mpp', '_convertido.xml').replace(/[^a-zA-Z0-9.-]/g, '_');
        
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.setAttribute('type', 'application/xml');
        link.setAttribute('rel', 'noopener noreferrer');
        
        // Adicionar ao DOM temporariamente
        document.body.appendChild(link);
        
        // Simular clique de forma segura
        link.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        }));
        
        // Limpar após delay
        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }, 100);
        
        console.log('✅ Download iniciado com segurança');
        
    } catch (error) {
        console.error('❌ Erro no download:', error);
        alert('Erro ao baixar o arquivo XML. Tente novamente.');
    }
}

function validateAndCleanXML(xmlContent) {
    // Garantir que o XML tenha declaração correta
    let cleanXML = xmlContent.trim();
    
    // Adicionar declaração XML se não existir
    if (!cleanXML.startsWith('<?xml')) {
        cleanXML = '<?xml version="1.0" encoding="UTF-8"?>\n' + cleanXML;
    }
    
    // Escapar caracteres perigosos
    cleanXML = cleanXML
        .replace(/&(?!(?:amp|lt|gt|quot|apos);)/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // Restaurar tags XML válidas
        .replace(/&lt;\?xml/g, '<?xml')
        .replace(/\?&gt;/g, '?>')
        .replace(/&lt;(\/?[a-zA-Z][a-zA-Z0-9]*(?:\s[^&gt;]*)?)\s*&gt;/g, '<$1>');
    
    return cleanXML;
}

function showPaymentModal() {
    if (!currentFile) {
        alert('❌ Selecione um arquivo .mpp primeiro!');
        return;
    }
    
    const modal = document.getElementById('paymentModal');
    const paymentFileName = document.getElementById('paymentFileName');
    
    if (paymentFileName) {
        paymentFileName.textContent = currentFile.name;
    }
    
    if (modal) {
        modal.style.display = 'flex';
        
        // Simular geração de QR Code PIX
        setTimeout(() => {
            generatePixQRCode();
        }, 1000);
        
        // Simular confirmação de pagamento para desenvolvimento
        setTimeout(() => {
            console.log('💰 Pagamento confirmado (simulação)');
            modal.style.display = 'none';
            startConversion();
        }, 5000); // 5 segundos para ver o modal
    }
}

function generatePixQRCode() {
    const qrCode = document.getElementById('qrCode');
    if (qrCode) {
        qrCode.innerHTML = `
            <div style="background: #fff; padding: 20px; border-radius: 10px; border: 2px solid #ddd;">
                <div style="font-size: 120px; text-align: center;">📱</div>
                <p style="text-align: center; margin: 10px 0;"><strong>QR Code PIX</strong></p>
                <p style="text-align: center; font-size: 12px; color: #666;">Escaneie com seu app bancário</p>
            </div>
        `;
    }
}

function showDownloadOptions(xmlContent, fileId, originalName) {
    console.log('📋 Mostrando opções de download');
    
    // Criar modal de download
    const modal = document.createElement('div');
    modal.className = 'download-modal';
    modal.innerHTML = `
        <div class="download-modal-content">
            <h3>🎉 Conversão Concluída!</h3>
            <p>Escolha como deseja baixar seu arquivo XML:</p>
            
            <div class="download-options">
                <button onclick="downloadSecureXML('${fileId}', '${originalName}')" class="btn btn-primary">
                    📦 Baixar ZIP (Recomendado)
                </button>
                
                <button onclick="downloadDirectXML(decodeURIComponent('${encodeURIComponent(xmlContent)}'), '${originalName}')" class="btn btn-secondary">
                    📦 Baixar ZIP (Alternativo)
                </button>
            </div>
            
            <p class="download-info">
                <small>
                    <strong>ZIP Recomendado:</strong> Download via servidor - 100% sem red flags<br>
                    <strong>ZIP Alternativo:</strong> Backup do mesmo arquivo ZIP seguro
                </small>
            </p>
            
            <button onclick="closeDownloadModal()" class="btn btn-outline">Fechar</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // CSS inline para o modal
    const style = document.createElement('style');
    style.textContent = `
        .download-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        }
        .download-modal-content {
            background: white;
            padding: 30px;
            border-radius: 10px;
            max-width: 500px;
            text-align: center;
        }
        .download-options {
            margin: 20px 0;
            display: flex;
            gap: 10px;
            justify-content: center;
            flex-wrap: wrap;
        }
        .download-info {
            margin: 15px 0;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 5px;
            text-align: left;
        }
    `;
    document.head.appendChild(style);
}

function downloadSecureXML(fileId, originalName) {
    console.log('🔒 Download seguro ZIP iniciado');
    const url = `/download/${fileId}`;
    window.open(url, '_blank');
    closeDownloadModal();
}

function downloadDirectXML(xmlContent, originalName) {
    console.log('📦 Download ZIP alternativo iniciado');
    // Usar o mesmo sistema ZIP seguro
    const url = `/download/${window.currentFileId}`;
    window.open(url, '_blank');
    closeDownloadModal();
}

function closeDownloadModal() {
    const modal = document.querySelector('.download-modal');
    if (modal) {
        modal.remove();
    }
}

function showProgress() {
    const uploadForm = document.getElementById('uploadForm');
    const uploadProgress = document.getElementById('uploadProgress');
    
    if (uploadForm) uploadForm.style.display = 'none';
    if (uploadProgress) uploadProgress.style.display = 'block';
    
    updateProgress(10, 'Iniciando...');
}

function updateProgress(percent, message) {
    const progressBar = document.querySelector('.progress-bar');
    const uploadStatus = document.querySelector('.upload-status');
    
    if (progressBar) {
        progressBar.style.width = percent + '%';
    }
    
    if (uploadStatus) {
        uploadStatus.textContent = message;
    }
    
    console.log(`📊 ${percent}% - ${message}`);
}

function hideProgress() {
    const uploadForm = document.getElementById('uploadForm');
    const uploadProgress = document.getElementById('uploadProgress');
    
    if (uploadProgress) uploadProgress.style.display = 'none';
    if (uploadForm) uploadForm.style.display = 'block';
}

function resetButtons() {
    const convertBtn = document.getElementById('convertBtn');
    const testBtn = document.getElementById('testBtn');
    
    if (convertBtn) {
        convertBtn.textContent = 'Converter (Modo Teste - Sem PIX)';
        convertBtn.disabled = false;
    }
    
    if (testBtn) {
        testBtn.textContent = 'Conversão Direta';
        testBtn.disabled = false;
    }
}

console.log('✅ Script carregado com sucesso');