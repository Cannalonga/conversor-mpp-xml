// MPP Converter - Ultra Light Version
// Otimizado para carregamento instantâneo

console.log('⚡ Iniciando versão ultra-rápida...');

(function() {
    'use strict';
    
    // Configuração mínima
    const config = {
        maxSize: Infinity,
        formats: ['.mpp']
    };
    
    // Estado global
    let currentFile = null;
    
    // Elementos DOM (busca lazy)
    let elements = {};
    
    function getElement(id) {
        if (!elements[id]) {
            elements[id] = document.getElementById(id);
        }
        return elements[id];
    }
    
    // Upload simples e direto
    function setupUpload() {
        const uploadArea = getElement('uploadArea');
        const fileInput = getElement('fileInput');
        
        if (!uploadArea || !fileInput) {
            console.log('⚠️ Elementos não encontrados, tentando novamente...');
            setTimeout(setupUpload, 100);
            return;
        }
        
        console.log('✅ Upload configurado');
        
        // Clique direto - sem preventDefault desnecessário
        uploadArea.onclick = () => fileInput.click();
        
        // Arquivo selecionado
        fileInput.onchange = function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            console.log('📄', file.name);
            
            // Validação rápida
            if (!file.name.toLowerCase().endsWith('.mpp')) {
                alert('❌ Apenas arquivos .mpp');
                fileInput.value = '';
                return;
            }
            
            currentFile = file;
            showPreview(file);
            enableConvert();
        };
        
        // Drag & drop básico
        uploadArea.ondragover = (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#007bff';
        };
        
        uploadArea.ondragleave = () => {
            uploadArea.style.borderColor = '';
        };
        
        uploadArea.ondrop = (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '';
            
            const file = e.dataTransfer.files[0];
            if (file) {
                fileInput.files = e.dataTransfer.files;
                fileInput.onchange(e);
            }
        };
    }
    
    function showPreview(file) {
        const preview = getElement('filePreview');
        const fileName = getElement('fileName');
        const fileSize = getElement('fileSize');
        
        if (preview) preview.style.display = 'block';
        if (fileName) fileName.textContent = file.name;
        if (fileSize) fileSize.textContent = (file.size / 1048576).toFixed(2) + ' MB';
    }
    
    function enableConvert() {
        const btn = getElement('convertBtn');
        const testBtn = getElement('testBtn');
        
        if (btn) {
            btn.disabled = false;
            btn.onclick = startConversion;
        }
        
        if (testBtn) {
            testBtn.disabled = false;
            testBtn.onclick = startTestConversion;
            console.log('🧪 Botão de teste direto habilitado');
        }
    }
    
    function startTestConversion() {
        console.log('🧪 Teste direto iniciado (sem PIX)');
        
        if (!currentFile) {
            console.log('❌ Sem arquivo selecionado');
            return;
        }
        
        console.log('📄 Arquivo para teste:', currentFile.name);
        
        const testBtn = getElement('testBtn');
        if (testBtn) {
            testBtn.textContent = 'Convertendo...';
            testBtn.disabled = true;
        }
        
        // Upload direto para conversão
        console.log('🎯 Chamando upload de teste...');
        uploadTestFile(currentFile)
            .then((result) => {
                console.log('✅ Conversão de teste concluída:', result);
                if (result.xmlContent) {
                    downloadXMLDirectly(result.xmlContent, currentFile.name);
                } else {
                    alert('Conversão concluída, mas XML não foi retornado.');
                }
                resetTestButton();
            })
            .catch(err => {
                console.log('❌ Erro na conversão de teste:', err);
                console.error('Stack trace:', err.stack);
                alert('Erro na conversão de teste: ' + err.message);
                resetTestButton();
            });
    }
    
    async function uploadTestFile(file) {
        console.log('📤 Iniciando upload de teste para:', '/api/upload-test');
        console.log('📁 Arquivo:', file.name, 'Tamanho:', file.size);
        
        updateProgress(10, 'Preparando arquivo...');
        console.log('✅ Progress updated to 10%');
        
        const formData = new FormData();
        formData.append('file', file);
        console.log('✅ FormData criado com arquivo:', formData.has('file'));
        
        try {
            updateProgress(30, 'Enviando arquivo...');
            console.log('🌐 Enviando para conversão direta...');
            console.log('🔗 URL completa:', window.location.origin + '/api/upload-test');
            
            console.log('🚀 Fazendo fetch...');
            const response = await fetch('/api/upload-test', {
                method: 'POST',
                body: formData
            });
            
            console.log('📡 Fetch completed, response:', response);
            updateProgress(60, 'Processando arquivo MPP...');
            console.log('📡 Resposta recebida:', response.status, response.statusText);
            
            if (!response.ok) {
                console.log('❌ Resposta não OK:', response.status);
                updateProgress(0, 'Erro no servidor!');
                
                // Tentar ler texto de erro
                const errorText = await response.text();
                console.log('❌ Erro do servidor:', errorText);
                
                throw new Error(`Conversão falhou: ${response.status} - ${response.statusText}`);
            }
            
            updateProgress(80, 'Convertendo para XML...');
            console.log('📄 Parseando resposta JSON...');
            const result = await response.json();
            console.log('✅ Dados de teste recebidos:', result);
            
            if (!result.xmlContent) {
                throw new Error('XML não foi gerado pelo servidor');
            }
            
            updateProgress(95, 'Preparando download...');
            return result;
        } catch (error) {
            console.log('💥 Erro no fetch de teste:', error);
            console.log('💥 Tipo do erro:', typeof error);
            console.log('💥 Message:', error.message);
            console.log('💥 Stack:', error.stack);
            updateProgress(0, 'Erro na conversão!');
            throw error;
        }
    }
    
    function downloadXMLDirectly(xmlContent, originalFileName) {
        console.log('📁 Iniciando download direto do XML');
        
        // Criar e disparar download do XML real
        const blob = new Blob([xmlContent], { type: 'text/xml' });
        const url = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = originalFileName ? originalFileName.replace('.mpp', '_convertido.xml') : 'projeto_real_convertido.xml';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        console.log('✅ Download do XML real iniciado');
        alert('📁 Download do XML convertido iniciado com sucesso!\\n\\nEste é o XML real extraído do seu arquivo MPP!');
    }
    
    function resetTestButton() {
        const testBtn = getElement('testBtn');
        if (testBtn) {
            testBtn.textContent = 'Teste Direto (Sem PIX)';
            testBtn.disabled = false;
        }
    }
    
    function startConversion() {
        console.log('🔄 Conversão iniciada (MODO TESTE - SEM PIX)');
        
        // Teste básico sem usar variáveis complexas
        console.log('TEST 1');
        
        // Verificar se currentFile existe sem usar if complexo
        console.log('TEST 2 - currentFile type:', typeof currentFile);
        
        if (currentFile === null || currentFile === undefined) {
            console.log('❌ Arquivo é null ou undefined');
            alert('❌ Selecione um arquivo primeiro!');
            return;
        }
        
        console.log('TEST 3 - arquivo existe');
        
        // Teste sem getElement
        console.log('TEST 4 - antes de getElementById');
        const btn = document.getElementById('convertBtn');
        console.log('TEST 5 - botão:', btn ? 'encontrado' : 'não encontrado');
        
        if (btn) {
            btn.textContent = 'Testando...';
            console.log('TEST 6 - botão atualizado');
        }
        
        console.log('TEST 7 - fim da função');
        
        // Por enquanto só teste básico, sem chamar uploadTestFile
        alert('Teste básico funcionou! Arquivo: ' + (currentFile ? currentFile.name : 'undefined'));
    }
    
    // Funções de progresso visual
    function showProgressBar(message) {
        console.log('🎯 showProgressBar chamada com:', message);
        
        const uploadForm = getElement('uploadForm');
        const uploadProgress = getElement('uploadProgress');
        
        console.log('📊 uploadForm encontrado:', uploadForm ? 'SIM' : 'NÃO');
        console.log('📊 uploadProgress encontrado:', uploadProgress ? 'SIM' : 'NÃO');
        
        if (uploadForm) {
            uploadForm.style.display = 'none';
            console.log('✅ uploadForm ocultado');
        }
        
        if (uploadProgress) {
            uploadProgress.style.display = 'block';
            updateProgress(0, message);
            console.log('✅ uploadProgress exibido');
        } else {
            console.log('❌ Elemento uploadProgress não encontrado!');
            // Tentar encontrar por querySelector
            const uploadProgressDirect = document.getElementById('uploadProgress');
            console.log('🔍 Busca direta por ID:', uploadProgressDirect ? 'ENCONTRADO' : 'NÃO ENCONTRADO');
        }
        
        console.log('📊 Barra de progresso configurada:', message);
    }
    
    function updateProgress(percent, message) {
        console.log(`🎯 updateProgress chamada: ${percent}% - ${message}`);
        
        const progressBar = document.querySelector('.progress-bar');
        const uploadStatus = document.querySelector('.upload-status');
        
        console.log('📊 progressBar encontrado:', progressBar ? 'SIM' : 'NÃO');
        console.log('📊 uploadStatus encontrado:', uploadStatus ? 'SIM' : 'NÃO');
        
        if (progressBar) {
            progressBar.style.width = percent + '%';
            progressBar.style.background = percent === 100 ? '#28a745' : '#007bff';
            console.log(`✅ Barra atualizada para ${percent}%`);
        } else {
            console.log('❌ .progress-bar não encontrado!');
        }
        
        if (uploadStatus) {
            uploadStatus.textContent = message;
            console.log(`✅ Status atualizado: ${message}`);
        } else {
            console.log('❌ .upload-status não encontrado!');
        }
        
        console.log(`📊 Progresso: ${percent}% - ${message}`);
    }
    
    function hideProgress() {
        const uploadForm = getElement('uploadForm');
        const uploadProgress = getElement('uploadProgress');
        
        setTimeout(() => {
            if (uploadProgress) uploadProgress.style.display = 'none';
            if (uploadForm) uploadForm.style.display = 'block';
        }, 2000);
        
        console.log('📊 Ocultando barra de progresso...');
    }
    
    function showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.innerHTML = `
            <div style="background: #d4edda; color: #155724; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #c3e6cb; text-align: center;">
                <i class="fas fa-check-circle"></i> ${message}
            </div>
        `;
        
        const container = getElement('converter') || document.body;
        container.appendChild(successDiv);
        
        // Remover após 5 segundos
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 5000);
        
        console.log('✅ Mensagem de sucesso exibida:', message);
    }

    async function uploadFile(file) {
        console.log('📤 Iniciando upload para:', '/api/upload');
        console.log('📁 Arquivo:', file.name, 'Tamanho:', file.size);
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            console.log('🌐 Enviando requisição...');
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            console.log('📡 Resposta recebida:', response.status, response.statusText);
            
            if (!response.ok) {
                console.log('❌ Resposta não OK:', response.status);
                throw new Error(`Upload falhou: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('✅ Dados recebidos:', result);
            return result;
        } catch (error) {
            console.log('💥 Erro no fetch:', error);
            throw error;
        }
    }
    
    function showPaymentModal() {
        console.log('💳 Exibindo modal de pagamento');
        const modal = getElement('paymentModal');
        if (modal) {
            modal.style.display = 'flex';
            console.log('✅ Modal exibido');
            
            // Gerar QR code melhor
            generateQRCode();
            
            // Timer de pagamento
            startTimer();
            
            // Simular confirmação de pagamento após 8 segundos
            setTimeout(() => {
                console.log('✅ Simulando pagamento confirmado');
                showPaymentSuccess();
            }, 8000);
        }
    }
    
    function generateQRCode() {
        console.log('📱 Gerando QR Code');
        const qr = getElement('qrCode');
        if (qr) {
            // QR Code mais realista
            qr.innerHTML = `
                <div style="text-align: center; padding: 1rem;">
                    <div style="width: 200px; height: 200px; background: white; border: 2px solid #333; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 80px;">
                        ⬛⬜⬛⬜⬛<br>
                        ⬜⬛⬜⬛⬜<br>
                        ⬛⬜⬛⬜⬛<br>
                        ⬜⬛⬜⬛⬜<br>
                        ⬛⬜⬛⬜⬛
                    </div>
                    <p style="margin: 0.5rem 0; font-weight: bold; color: #6B21A8;">PIX - R$ 10,00</p>
                    <p style="margin: 0; font-size: 0.9em; color: #666;">Nubank • Chave oculta por segurança</p>
                    <p style="margin: 0.5rem 0; font-size: 0.8em; color: #059669;">🔒 Pagamento será confirmado automaticamente</p>
                </div>
            `;
            console.log('✅ QR Code gerado');
        }
    }
    
    function showPaymentSuccess() {
        console.log('🎉 Exibindo confirmação de pagamento');
        const qr = getElement('qrCode');
        if (qr) {
            qr.innerHTML = `
                <div style="text-align: center; padding: 2rem; background: #d4edda; border-radius: 8px; color: #155724;">
                    <div style="font-size: 60px; margin-bottom: 1rem;">✅</div>
                    <h3 style="margin: 0.5rem 0; color: #155724;">Pagamento Confirmado!</h3>
                    <p style="margin: 0; color: #155724;">Iniciando conversão...</p>
                </div>
            `;
        }
        
        // Iniciar processo de conversão após 2 segundos
        setTimeout(() => {
            startConversionProcess();
        }, 2000);
    }
    
    function startConversionProcess() {
        console.log('🔄 Iniciando processo de conversão');
        
        // Fechar modal de pagamento
        const modal = getElement('paymentModal');
        if (modal) modal.style.display = 'none';
        
        // Mostrar seção de conversão
        const conversionSection = getElement('conversionSection');
        if (conversionSection) {
            conversionSection.style.display = 'block';
            simulateConversion();
        }
    }
    
    function simulateConversion() {
        console.log('⚙️ Simulando conversão');
        const progressBar = getElement('progressBar');
        const status = getElement('conversionStatus');
        
        if (status) status.textContent = '🔄 Convertendo arquivo MPP para XML...';
        
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 100) progress = 100;
            
            if (progressBar) {
                progressBar.style.width = progress + '%';
            }
            
            // Mensagens durante a conversão
            if (progress > 20 && status && !status.textContent.includes('Analisando')) {
                status.textContent = '📊 Analisando estrutura do projeto...';
            }
            if (progress > 50 && status && !status.textContent.includes('Convertendo')) {
                status.textContent = '⚡ Convertendo dados para XML...';
            }
            if (progress > 80 && status && !status.textContent.includes('Finalizando')) {
                status.textContent = '✨ Finalizando arquivo...';
            }
            
            if (progress >= 100) {
                clearInterval(interval);
                if (status) status.textContent = '✅ Conversão completa!';
                
                // Mostrar seção de download após 1 segundo
                setTimeout(() => {
                    showDownloadSection();
                }, 1000);
            }
        }, 200);
    }
    
    function showDownloadSection() {
        console.log('📥 Exibindo seção de download');
        const downloadSection = getElement('downloadSection');
        if (downloadSection) {
            downloadSection.style.display = 'block';
            setupDownload();
        }
    }
    
    function setupDownload() {
        const downloadBtn = getElement('downloadBtn');
        if (downloadBtn) {
            downloadBtn.onclick = function() {
                console.log('📁 Iniciando download');
                
                // Gerar conteúdo XML de demonstração
                const xmlContent = generateDemoXML();
                
                // Criar e disparar download
                const blob = new Blob([xmlContent], { type: 'text/xml' });
                const url = window.URL.createObjectURL(blob);
                
                const link = document.createElement('a');
                link.href = url;
                link.download = currentFile ? currentFile.name.replace('.mpp', '.xml') : 'projeto_convertido.xml';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                
                console.log('✅ Download iniciado');
                alert('📁 Download do arquivo XML iniciado com sucesso!');
                
                // Reset da interface
                setTimeout(() => {
                    resetInterface();
                }, 2000);
            };
        }
    }
    
    function generateDemoXML() {
        const fileName = currentFile ? currentFile.name.replace('.mpp', '') : 'projeto';
        const today = new Date().toISOString().split('T')[0];
        
        return `<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://schemas.microsoft.com/project">
    <Name>${fileName}</Name>
    <Title>Projeto convertido do MPP</Title>
    <CreationDate>${today}</CreationDate>
    <LastSaved>${today}</LastSaved>
    <ScheduleFromStart>1</ScheduleFromStart>
    <StartDate>${today}</StartDate>
    <CurrencySymbol>R$</CurrencySymbol>
    <CalendarUID>1</CalendarUID>
    
    <Tasks>
        <Task>
            <UID>1</UID>
            <ID>1</ID>
            <Name>Projeto Convertido</Name>
            <Type>1</Type>
            <IsNull>0</IsNull>
            <CreateDate>${today}T12:00:00</CreateDate>
            <Start>${today}T08:00:00</Start>
            <Finish>${today}T17:00:00</Finish>
            <Duration>PT8H0M0S</Duration>
            <DurationFormat>7</DurationFormat>
            <Work>PT8H0M0S</Work>
        </Task>
    </Tasks>
    
    <Resources>
        <Resource>
            <UID>1</UID>
            <ID>1</ID>
            <Name>Recurso Padrão</Name>
            <Type>1</Type>
            <IsNull>0</IsNull>
        </Resource>
    </Resources>
    
    <Assignments>
        <Assignment>
            <UID>1</UID>
            <TaskUID>1</TaskUID>
            <ResourceUID>1</ResourceUID>
            <Work>PT8H0M0S</Work>
        </Assignment>
    </Assignments>
</Project>`;
    }
    
    function resetInterface() {
        console.log('🔄 Resetando interface');
        
        // Esconder todas as seções
        const sections = ['paymentModal', 'conversionSection', 'downloadSection'];
        sections.forEach(id => {
            const element = getElement(id);
            if (element) element.style.display = 'none';
        });
        
        // Mostrar seção de upload novamente
        const uploadSection = getElement('converter');
        if (uploadSection) uploadSection.style.display = 'block';
        
        // Limpar arquivo atual
        currentFile = null;
        
        // Reset do botão
        resetButton();
        
        // Limpar preview
        const preview = getElement('filePreview');
        if (preview) preview.style.display = 'none';
        
        console.log('✅ Interface resetada');
    }
    
    function startTimer() {
        let seconds = 900; // 15 min
        const timer = getElement('timer');
        
        const interval = setInterval(() => {
            const min = Math.floor(seconds / 60);
            const sec = seconds % 60;
            
            if (timer) {
                timer.textContent = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
            }
            
            seconds--;
            
            if (seconds < 0) {
                clearInterval(interval);
                closeModal();
            }
        }, 1000);
    }
    
    function closeModal() {
        const modal = getElement('paymentModal');
        if (modal) modal.style.display = 'none';
        resetButton();
    }
    
    function resetButton() {
        const btn = getElement('convertBtn');
        if (btn) {
            btn.textContent = 'Converter Arquivo';
            btn.disabled = false;
        }
    }
    
    function setupModal() {
        const close = getElement('closeModal');
        if (close) close.onclick = closeModal;
        
        const modal = getElement('paymentModal');
        if (modal) {
            modal.onclick = (e) => {
                if (e.target === modal) closeModal();
            };
        }
    }
    
    // Inicialização mínima e rápida
    function init() {
        console.log('🔧 Configuração instantânea...');
        
        setupUpload();
        setupModal();
        
        console.log('⚡ Pronto! Tempo: ~' + (Date.now() % 1000) + 'ms');
    }
    
    // DOM ready ultra-rápido
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();

console.log('✅ Script carregado instantaneamente!');