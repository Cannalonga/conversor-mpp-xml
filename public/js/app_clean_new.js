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
        
        // Mostrar arquivo selecionado
        showFileSelected(file);
        
        // Validar extensão
        if (!file.name.toLowerCase().endsWith('.mpp')) {
            alert('❌ Selecione um arquivo .mpp válido');
            fileInput.value = '';
            hideFileSelected();
            return;
        }
        
        // Arquivo válido
        currentFile = file;
        enableConvertButton();
        console.log('✅ Arquivo válido carregado:', file.name);
    });
    
    console.log('✅ Upload configurado');
}

function setupConversionButtons() {
    const convertBtn = document.getElementById('convertBtn');
    const changeFileBtn = document.getElementById('changeFileBtn');
    
    if (convertBtn) {
        convertBtn.addEventListener('click', startConversion);
    }
    
    if (changeFileBtn) {
        changeFileBtn.addEventListener('click', () => {
            const fileInput = document.getElementById('fileInput');
            if (fileInput) {
                fileInput.value = '';
                currentFile = null;
                hideFileSelected();
            }
        });
    }
    
    console.log('✅ Botão de conversão configurado');
}

function showFileSelected(file) {
    const uploadWrapper = document.querySelector('.upload-wrapper');
    const fileSelectedDiv = document.getElementById('fileSelected');
    const selectedFileName = document.getElementById('selectedFileName');
    const selectedFileSize = document.getElementById('selectedFileSize');
    
    if (uploadWrapper && uploadWrapper.querySelector('.upload-area')) {
        uploadWrapper.querySelector('.upload-area').style.display = 'none';
    }
    
    if (fileSelectedDiv) {
        fileSelectedDiv.style.display = 'block';
    }
    
    if (selectedFileName) {
        selectedFileName.textContent = file.name;
    }
    
    if (selectedFileSize) {
        selectedFileSize.textContent = (file.size / 1048576).toFixed(2) + ' MB';
    }
    
    console.log('✅ Arquivo mostrado na interface');
}

function hideFileSelected() {
    const uploadWrapper = document.querySelector('.upload-wrapper');
    const fileSelectedDiv = document.getElementById('fileSelected');
    
    if (uploadWrapper && uploadWrapper.querySelector('.upload-area')) {
        uploadWrapper.querySelector('.upload-area').style.display = 'block';
    }
    
    if (fileSelectedDiv) {
        fileSelectedDiv.style.display = 'none';
    }
}

function enableConvertButton() {
    const convertBtn = document.getElementById('convertBtn');
    
    if (convertBtn) {
        convertBtn.disabled = false;
        convertBtn.style.opacity = '1';
        convertBtn.style.cursor = 'pointer';
    }
    
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
    showProgressState();
    
    // Fazer upload
    uploadFile(currentFile)
        .then(result => {
            console.log('✅ Conversão concluída:', result);
            showSuccessState(result);
        })
        .catch(error => {
            console.error('❌ Erro na conversão:', error);
            showErrorState(error.message);
        });
}

function hideProgressBar() {
    const progressWrapper = document.getElementById('progressWrapper');
    if (progressWrapper) {
        progressWrapper.style.display = 'none';
    }
    console.log('📊 Barra de progresso ocultada');
}

function resetButtons() {
    const convertBtn = document.getElementById('convertBtn');
    const fileInput = document.getElementById('fileInput');
    
    if (convertBtn) {
        convertBtn.disabled = false;
        convertBtn.textContent = 'Converter Arquivo';
        convertBtn.style.backgroundColor = '';
    }
    
    if (fileInput) {
        fileInput.value = '';
    }
    
    console.log('🔄 Botões resetados');
}

function showProgressState() {
    const fileSelected = document.getElementById('fileSelected');
    const progressWrapper = document.getElementById('progressWrapper');
    
    if (fileSelected) fileSelected.style.display = 'none';
    if (progressWrapper) progressWrapper.style.display = 'block';
    
    console.log('🔄 Estado de progresso ativado');
}

function showSuccessState(result) {
    const progressWrapper = document.getElementById('progressWrapper');
    const successWrapper = document.getElementById('successWrapper');
    const downloadBtn = document.getElementById('downloadBtn');
    const newConversionBtn = document.getElementById('newConversionBtn');
    
    if (progressWrapper) progressWrapper.style.display = 'none';
    if (successWrapper) successWrapper.style.display = 'block';
    
    // Configurar botão de download
    if (downloadBtn && result.xmlContent) {
        downloadBtn.onclick = () => downloadXML(result.xmlContent, currentFile.name);
    }
    
    // Configurar botão de nova conversão
    if (newConversionBtn) {
        newConversionBtn.onclick = () => {
            location.reload();
        };
    }
    
    console.log('✅ Estado de sucesso ativado');
}

function showErrorState(errorMessage) {
    const progressWrapper = document.getElementById('progressWrapper');
    const errorWrapper = document.getElementById('errorWrapper');
    const errorMessageEl = document.getElementById('errorMessage');
    const retryBtn = document.getElementById('retryBtn');
    
    if (progressWrapper) progressWrapper.style.display = 'none';
    if (errorWrapper) errorWrapper.style.display = 'block';
    
    if (errorMessageEl) {
        errorMessageEl.textContent = errorMessage;
    }
    
    if (retryBtn) {
        retryBtn.onclick = () => {
            errorWrapper.style.display = 'none';
            showFileSelected(currentFile);
        };
    }
    
    console.log('❌ Estado de erro ativado');
}

async function uploadFile(file) {
    console.log('📤 Enviando arquivo...', `${(file.size / 1024 / 1024).toFixed(2)}MB`);
    
    const formData = new FormData();
    formData.append('file', file);
    
    updateProgress(30, 'Enviando arquivo...');
    
    try {
        const timeoutMs = Math.max(30000, file.size / 1000);
        console.log(`⏱️ Timeout configurado: ${timeoutMs}ms`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        const response = await fetch('/api/upload', {
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
        
        const result = await response.json();
        
        updateProgress(95, 'Finalizando...');
        updateProgress(100, 'Conversão concluída!');
        
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
        // Criar blob com tipo MIME correto
        const blob = new Blob([xmlContent], { 
            type: 'application/xml;charset=utf-8' 
        });
        
        const url = window.URL.createObjectURL(blob);
        const fileName = originalName.replace('.mpp', '_convertido.xml').replace(/[^a-zA-Z0-9.-]/g, '_');
        
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
        }, 1000);
        
        console.log('✅ Download concluído:', fileName);
        
    } catch (error) {
        console.error('❌ Erro no download:', error);
        alert('Erro ao baixar o arquivo XML. Tente novamente.');
    }
}

function updateProgress(percent, message) {
    const progressFill = document.getElementById('progressFill');
    const progressSteps = document.querySelectorAll('.progress-step');
    
    // Atualizar barra de progresso
    if (progressFill) {
        progressFill.style.width = percent + '%';
    }
    
    // Atualizar passos
    if (progressSteps.length > 0) {
        progressSteps.forEach((step, index) => {
            const stepPercent = (index + 1) * 33.33; // 3 passos
            
            if (percent >= stepPercent) {
                step.classList.add('completed');
                step.classList.remove('active');
            } else if (percent >= stepPercent - 33.33) {
                step.classList.add('active');
                step.classList.remove('completed');
            } else {
                step.classList.remove('active', 'completed');
            }
        });
    }
    
    console.log(`📊 ${percent}% - ${message}`);
}

console.log('✅ Script carregado com sucesso');

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
        
        // Mostrar arquivo selecionado
        showFileSelected(file);
        
        // Validar extensão
        if (!file.name.toLowerCase().endsWith('.mpp')) {
            alert('❌ Selecione um arquivo .mpp válido');
            fileInput.value = '';
            hideFileSelected();
            return;
        }
        
        // Arquivo válido
        currentFile = file;
        enableConvertButton();
        console.log('✅ Arquivo válido carregado:', file.name);
    });
    
    console.log('✅ Upload configurado');
}

function setupConversionButtons() {
    const convertBtn = document.getElementById('convertBtn');
    const changeFileBtn = document.getElementById('changeFileBtn');
    
    if (convertBtn) {
        convertBtn.addEventListener('click', startConversion);
    }
    
    if (changeFileBtn) {
        changeFileBtn.addEventListener('click', () => {
            const fileInput = document.getElementById('fileInput');
            if (fileInput) {
                fileInput.value = '';
                currentFile = null;
                hideFileSelected();
            }
        });
    }
    
    console.log('✅ Botão de conversão configurado para teste');
}

function showFileSelected(file) {
    // Esconder upload area e mostrar arquivo selecionado
    const uploadWrapper = document.querySelector('.upload-wrapper');
    const fileSelectedDiv = document.getElementById('fileSelected');
    const selectedFileName = document.getElementById('selectedFileName');
    const selectedFileSize = document.getElementById('selectedFileSize');
    
    if (uploadWrapper && uploadWrapper.querySelector('.upload-area')) {
        uploadWrapper.querySelector('.upload-area').style.display = 'none';
    }
    
    if (fileSelectedDiv) {
        fileSelectedDiv.style.display = 'block';
    }
    
    if (selectedFileName) {
        selectedFileName.textContent = file.name;
    }
    
    if (selectedFileSize) {
        selectedFileSize.textContent = (file.size / 1048576).toFixed(2) + ' MB';
    }
    
    console.log('✅ Preview exibido');
}

function hideFileSelected() {
    const uploadWrapper = document.querySelector('.upload-wrapper');
    const fileSelectedDiv = document.getElementById('fileSelected');
    
    if (uploadWrapper && uploadWrapper.querySelector('.upload-area')) {
        uploadWrapper.querySelector('.upload-area').style.display = 'block';
    }
    
    if (fileSelectedDiv) {
        fileSelectedDiv.style.display = 'none';
    }
}

function showFileStatus(status) {
    const fileStatus = document.getElementById('fileStatus');
    if (!fileStatus) return;
    
    // Limpar status anterior
    fileStatus.textContent = '';
    
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
    
    if (convertBtn) {
        convertBtn.disabled = false;
        convertBtn.style.opacity = '1';
        convertBtn.style.cursor = 'pointer';
    }
    
    console.log('✅ Botão habilitado');
}

function enableConvertButton() {
    enableButtons();
}

function showProgressState() {
    const uploadWrapper = document.querySelector('.upload-wrapper');
    const fileSelected = document.getElementById('fileSelected');
    const progressWrapper = document.getElementById('progressWrapper');
    
    if (fileSelected) fileSelected.style.display = 'none';
    if (progressWrapper) progressWrapper.style.display = 'block';
    
    console.log('🔄 Estado de progresso ativado');
}

function showSuccessState(result) {
    const progressWrapper = document.getElementById('progressWrapper');
    const successWrapper = document.getElementById('successWrapper');
    const downloadBtn = document.getElementById('downloadBtn');
    const newConversionBtn = document.getElementById('newConversionBtn');
    
    if (progressWrapper) progressWrapper.style.display = 'none';
    if (successWrapper) successWrapper.style.display = 'block';
    
    // Configurar botão de download
    if (downloadBtn && result.xmlContent) {
        downloadBtn.onclick = () => downloadXML(result.xmlContent, currentFile.name);
    }
    
    // Configurar botão de nova conversão
    if (newConversionBtn) {
        newConversionBtn.onclick = () => {
            location.reload();
        };
    }
    
    console.log('✅ Estado de sucesso ativado');
}

function showErrorState(errorMessage) {
    const progressWrapper = document.getElementById('progressWrapper');
    const errorWrapper = document.getElementById('errorWrapper');
    const errorMessageEl = document.getElementById('errorMessage');
    const retryBtn = document.getElementById('retryBtn');
    
    if (progressWrapper) progressWrapper.style.display = 'none';
    if (errorWrapper) errorWrapper.style.display = 'block';
    
    if (errorMessageEl) {
        errorMessageEl.textContent = errorMessage;
    }
    
    if (retryBtn) {
        retryBtn.onclick = () => {
            errorWrapper.style.display = 'none';
            showFileSelected(currentFile);
        };
    }
    
    console.log('❌ Estado de erro ativado');
}

function startConversion() {
    console.log('🔄 Iniciando conversão...');
    
    if (!currentFile) {
        alert('❌ Selecione um arquivo .mpp primeiro!');
        return;
    }
    
    console.log('📄 Convertendo:', currentFile.name);
    
    // Mostrar progresso
    showProgressState();
    
    // Fazer upload real
    uploadFile(currentFile)
        .then(result => {
            console.log('✅ Conversão concluída:', result);
            showSuccessState(result);
        })
        .catch(error => {
            console.error('❌ Erro na conversão:', error);
            showErrorState(error.message);
        });
    if (convertBtn) {
        convertBtn.textContent = 'Convertendo...';
        convertBtn.disabled = true;
    }
    
    // Fazer upload
    uploadFile(currentFile)
        .then(result => {
            console.log('✅ Sucesso:', result);
            updateProgress(100, 'Conversão concluída!');
            
            if (result.xml) {
                console.log('🎉 XML gerado com sucesso!');
                
                // Configurar download direto
                setTimeout(() => {
                    const downloadBtn = document.getElementById('downloadBtn');
                    if (downloadBtn) {
                        downloadBtn.onclick = () => downloadXML(result.xml, currentFile.name);
                        console.log('✅ Botão de download configurado');
                    }
                }, 500);
                
            } else {
                console.error('❌ XML não recebido na resposta');
                alert('Erro: XML não foi gerado na conversão');
            }
            
            setTimeout(() => {
                hideProgressBar();
                resetButtons();
            }, 2000);
        })
        .catch(error => {
            console.error('❌ Erro:', error);
            updateProgress(0, 'Erro na conversão');
            alert('Erro: ' + error.message);
            
            setTimeout(() => {
                hideProgressBar();
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
        
        const response = await fetch('/api/upload', {
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
    if (!currentFile) return;
    
    const qrCode = document.getElementById('qrCode');
    if (!qrCode) return;
    
    // Mostrar loading
    qrCode.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div style="font-size: 40px;">⏳</div>
            <p>Gerando QR Code PIX...</p>
        </div>
    `;
    
    // Fazer requisição para gerar QR Code real
    fetch('/api/payment/pix', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            fileName: currentFile.name,
            amount: 10.00
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Mostrar QR Code real
            qrCode.innerHTML = `
                <div style="background: #fff; padding: 20px; border-radius: 10px; border: 2px solid #ddd; text-align: center;">
                    <img src="${data.qrCode}" alt="QR Code PIX" style="width: 200px; height: 200px; margin-bottom: 10px;">
                    <p style="margin: 10px 0; font-weight: bold;">QR Code PIX - R$ ${data.amount.toFixed(2)}</p>
                    <p style="font-size: 12px; color: #666;">Escaneie com seu app bancário</p>
                    <p style="font-size: 10px; color: #888; margin-top: 10px;">PIX: ${data.pixKey}</p>
                </div>
            `;
            
            console.log('✅ QR Code PIX gerado com sucesso');
        } else {
            throw new Error(data.error);
        }
    })
    .catch(error => {
        console.error('❌ Erro ao gerar QR Code:', error);
        qrCode.innerHTML = `
            <div style="background: #ffebee; padding: 20px; border-radius: 10px; border: 2px solid #f44336; text-align: center;">
                <div style="font-size: 40px; color: #f44336;">❌</div>
                <p style="color: #f44336; margin: 10px 0;">Erro ao gerar QR Code</p>
                <p style="font-size: 12px; color: #666;">Tente novamente</p>
            </div>
        `;
    });
}

function showDownloadOptions(xmlContent, fileId, originalName) {
    console.log('📋 Mostrando opções de download');
    
    // Usar o botão de download existente em vez de modal
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.onclick = () => downloadXML(xmlContent, originalName);
    }
    
    console.log('✅ Download configurado para:', originalName);
}

function downloadSecureXML(fileId, originalName) {
    console.log('🔒 Download seguro ZIP iniciado');
    const url = `/download/${fileId}`;
    window.open(url, '_blank');
}

function closeDownloadModal() {
    const modal = document.querySelector('.download-modal');
    if (modal) {
        modal.remove();
    }
}

function downloadDirectXML(xmlContent, originalName) {
    console.log('📥 Baixando XML...');
    
    try {
        // Criar blob com tipo MIME correto
        const blob = new Blob([xmlContent], { 
            type: 'application/xml;charset=utf-8' 
        });
        
        const url = window.URL.createObjectURL(blob);
        const fileName = originalName.replace('.mpp', '_convertido.xml').replace(/[^a-zA-Z0-9.-]/g, '_');
        
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
        }, 1000);
        
        console.log('✅ Download concluído:', fileName);
        
    } catch (error) {
        console.error('❌ Erro no download:', error);
        alert('Erro ao baixar o arquivo XML. Tente novamente.');
    }
}

console.log('✅ Script carregado com sucesso');