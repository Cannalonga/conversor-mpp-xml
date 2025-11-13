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
    const testBtn = document.getElementById('testBtn');
    
    if (convertBtn) {
        convertBtn.addEventListener('click', startConversion);
    }
    
    if (testBtn) {
        testBtn.addEventListener('click', startConversion);
    }
    
    console.log('✅ Botões configurados');
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
    const testBtn = document.getElementById('testBtn');
    
    if (convertBtn) convertBtn.disabled = false;
    if (testBtn) testBtn.disabled = false;
    
    console.log('✅ Botões habilitados');
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
                downloadXML(result.xmlContent, currentFile.name);
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
    console.log('📤 Enviando arquivo...');
    
    const formData = new FormData();
    formData.append('file', file);
    
    updateProgress(30, 'Enviando arquivo...');
    
    try {
        const response = await fetch('/api/upload-test', {
            method: 'POST',
            body: formData
        });
        
        updateProgress(60, 'Processando...');
        
        if (!response.ok) {
            throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
        
        updateProgress(80, 'Convertendo...');
        const result = await response.json();
        
        updateProgress(95, 'Finalizando...');
        return result;
        
    } catch (error) {
        throw error;
    }
}

function downloadXML(xmlContent, originalName) {
    console.log('📥 Baixando XML...');
    
    const blob = new Blob([xmlContent], { type: 'text/xml' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = originalName.replace('.mpp', '_convertido.xml');
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.URL.revokeObjectURL(url);
    
    console.log('✅ Download iniciado');
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