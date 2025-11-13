// Ultra Conversor MPP → XML
console.log('🚀 Conversor carregado');

let selectedFile = null;
let isConverting = false;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    setupUpload();
    setupButtons();
});

function setupUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    // Click para selecionar arquivo
    uploadArea.addEventListener('click', () => fileInput.click());
    
    // Drag & Drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });
    
    // Arquivo selecionado
    fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    });
}

function setupButtons() {
    const convertBtn = document.getElementById('convertBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    
    convertBtn.addEventListener('click', convertFile);
    downloadBtn.addEventListener('click', downloadXML);
}

function handleFile(file) {
    // Validar extensão
    if (!file.name.toLowerCase().endsWith('.mpp')) {
        showStatus('error', 'Selecione um arquivo .mpp válido');
        return;
    }
    
    selectedFile = file;
    
    // Mostrar info do arquivo
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatFileSize(file.size);
    document.getElementById('fileInfo').style.display = 'block';
    
    // Habilitar botão de conversão
    document.getElementById('convertBtn').disabled = false;
    
    showStatus('success', 'Arquivo carregado com sucesso!');
}

function convertFile() {
    if (!selectedFile || isConverting) return;
    
    isConverting = true;
    document.getElementById('convertBtn').disabled = true;
    
    // Mostrar progresso
    showProgress(0);
    document.getElementById('progressBar').style.display = 'block';
    
    // Simular progresso
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress > 90) progress = 90;
        showProgress(progress);
    }, 200);
    
    // Upload do arquivo
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('filename', selectedFile.name);
    
    console.log('Enviando arquivo:', selectedFile.name);
    
    // Timeout dinâmico baseado no tamanho do arquivo
    const timeout = Math.max(30000, selectedFile.size / 1000);
    
    fetch('/api/upload-test', {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(timeout)
    })
    .then(response => response.json())
    .then(data => {
        clearInterval(progressInterval);
        showProgress(100);
        
        if (data.success) {
            // Salvar ID do arquivo para download seguro via servidor
            window.downloadFileId = data.fileId;
            
            // Mostrar botão de download
            document.getElementById('downloadBtn').style.display = 'inline-block';
            showStatus('success', '🎉 XML empacotado em ZIP! Sem red flags!');
        } else {
            showStatus('error', data.error || 'Erro na conversão');
        }
    })
    .catch(error => {
        clearInterval(progressInterval);
        showStatus('error', 'Erro de conexão: ' + error.message);
    })
    .finally(() => {
        isConverting = false;
        document.getElementById('convertBtn').disabled = false;
    });
}

function downloadXML() {
    if (!window.downloadFileId) {
        showStatus('error', 'Nenhum arquivo XML disponível');
        return;
    }
    
    // Download simples como arquivo de texto
    const downloadUrl = `/download/${window.downloadFileId}.xml`;
    
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    showStatus('success', '📁 Arquivo XML baixado e pronto para usar!');
}

function showProgress(percent) {
    document.getElementById('progressFill').style.width = percent + '%';
}

function showStatus(type, message) {
    const status = document.getElementById('status');
    status.className = 'status ' + type;
    status.textContent = message;
    status.style.display = 'block';
    
    // Auto-hide após 5 segundos para status de sucesso
    if (type === 'success') {
        setTimeout(() => {
            status.style.display = 'none';
        }, 5000);
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

console.log('✅ Conversor pronto!');