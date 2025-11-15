import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Métricas customizadas
export const errorRate = new Rate('errors');
export const uploadDuration = new Trend('upload_duration');
export const processingDuration = new Trend('processing_duration');

// Configuração de cenários de teste
export const options = {
    scenarios: {
        // 1. Teste de Carga Normal (100 uploads simultâneos)
        normal_load: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '2m', target: 20 },   // Subida gradual
                { duration: '5m', target: 50 },   // Carga estável
                { duration: '5m', target: 100 },  // Carga máxima normal
                { duration: '5m', target: 100 },  // Sustentação
                { duration: '2m', target: 0 },    // Descida
            ],
            gracefulRampDown: '30s',
        },

        // 2. Teste de Pico (300-500 req/min)
        spike_test: {
            executor: 'ramping-arrival-rate',
            startRate: 50,
            timeUnit: '1m',
            stages: [
                { duration: '2m', target: 100 },  // Aquecimento
                { duration: '1m', target: 300 },  // Pico baixo
                { duration: '2m', target: 300 },  // Sustentação
                { duration: '1m', target: 500 },  // Pico alto
                { duration: '2m', target: 500 },  // Sustentação pico
                { duration: '2m', target: 100 },  // Volta ao normal
            ],
            preAllocatedVUs: 200,
            maxVUs: 500,
        },

        // 3. Teste de Stress (Sobrecarga no Worker)
        stress_test: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '2m', target: 100 },
                { duration: '5m', target: 200 },
                { duration: '5m', target: 300 },  // Além da capacidade
                { duration: '5m', target: 500 },  // Stress máximo
                { duration: '2m', target: 0 },
            ],
            gracefulRampDown: '30s',
        }
    },

    thresholds: {
        // Critérios de sucesso
        http_req_duration: ['p(95)<500'], // 95% das requests < 500ms
        http_req_failed: ['rate<0.05'],    // Taxa de erro < 5%
        'upload_duration': ['p(95)<2000'], // 95% uploads < 2s
        'processing_duration': ['p(95)<30000'], // 95% conversões < 30s
        errors: ['rate<0.1'],              // Taxa de erro customizada < 10%
    },
};

// URLs e configuração
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

// Dados de teste (arquivos MPP simulados)
const testFiles = [
    { name: 'small_project.mpp', size: 50000, complexity: 'low' },
    { name: 'medium_project.mpp', size: 200000, complexity: 'medium' },
    { name: 'large_project.mpp', size: 500000, complexity: 'high' },
    { name: 'enterprise_project.mpp', size: 1000000, complexity: 'enterprise' }
];

// Geração de arquivo MPP simulado
function generateMockMPPFile(size) {
    // Header básico do arquivo MPP
    const header = new Uint8Array([
        0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1, // OLE header
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]);
    
    // Preencher com dados aleatórios
    const data = new Uint8Array(size);
    data.set(header, 0);
    
    for (let i = header.length; i < size; i++) {
        data[i] = Math.floor(Math.random() * 256);
    }
    
    return data;
}

// Função principal de teste
export default function () {
    const testFile = testFiles[Math.floor(Math.random() * testFiles.length)];
    const sessionId = `session_${__VU}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 1. Upload do arquivo
    const uploadStart = Date.now();
    const uploadResult = uploadFile(testFile, sessionId);
    uploadDuration.add(Date.now() - uploadStart);
    
    if (!uploadResult.success) {
        errorRate.add(1);
        return;
    }
    
    // 2. Verificar status do pagamento (simulado)
    const paymentResult = simulatePayment(uploadResult.orderId, sessionId);
    
    if (!paymentResult.success) {
        errorRate.add(1);
        return;
    }
    
    // 3. Aguardar processamento
    const processingStart = Date.now();
    const conversionResult = waitForConversion(uploadResult.orderId, sessionId);
    
    if (conversionResult.success) {
        processingDuration.add(Date.now() - processingStart);
        
        // 4. Download do resultado
        downloadResult(conversionResult.downloadUrl, sessionId);
    } else {
        errorRate.add(1);
    }
    
    // Pausa entre requests
    sleep(Math.random() * 2 + 1); // 1-3 segundos
}

function uploadFile(testFile, sessionId) {
    const fileData = generateMockMPPFile(testFile.size);
    
    const formData = {
        file: http.file(fileData, testFile.name, 'application/vnd.ms-project'),
        metadata: JSON.stringify({
            originalName: testFile.name,
            complexity: testFile.complexity,
            sessionId: sessionId
        })
    };
    
    const params = {
        headers: {
            'Content-Type': 'multipart/form-data',
            'User-Agent': `K6-LoadTest/${sessionId}`,
        },
        timeout: '60s',
        tags: { name: 'upload_file' },
    };
    
    const response = http.post(`${API_URL}/upload`, formData, params);
    
    const uploadSuccess = check(response, {
        'upload status 200': (r) => r.status === 200,
        'upload response valid': (r) => {
            try {
                const data = JSON.parse(r.body);
                return data.success && data.orderId;
            } catch {
                return false;
            }
        },
        'upload response time OK': (r) => r.timings.duration < 5000,
    });
    
    if (!uploadSuccess) {
        console.log(`Upload failed for ${sessionId}: ${response.status} ${response.body}`);
        return { success: false };
    }
    
    const responseData = JSON.parse(response.body);
    return {
        success: true,
        orderId: responseData.orderId,
        pixCode: responseData.pixCode
    };
}

function simulatePayment(orderId, sessionId) {
    // Simular confirmação de pagamento
    const payload = {
        orderId: orderId,
        paymentMethod: 'pix',
        transactionId: `tx_${Math.random().toString(36).substr(2, 9)}`,
        amount: 1000 // R$ 10,00 em centavos
    };
    
    const params = {
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': `K6-LoadTest/${sessionId}`,
        },
        timeout: '30s',
        tags: { name: 'confirm_payment' },
    };
    
    const response = http.post(
        `${API_URL}/payment/confirm`, 
        JSON.stringify(payload), 
        params
    );
    
    const paymentSuccess = check(response, {
        'payment status 200': (r) => r.status === 200,
        'payment confirmed': (r) => {
            try {
                const data = JSON.parse(r.body);
                return data.success;
            } catch {
                return false;
            }
        }
    });
    
    if (!paymentSuccess) {
        console.log(`Payment failed for ${sessionId}: ${response.status}`);
    }
    
    return { success: paymentSuccess };
}

function waitForConversion(orderId, sessionId) {
    const maxAttempts = 30; // 30 tentativas = 5 minutos
    const pollInterval = 10; // 10 segundos entre checks
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const params = {
            headers: {
                'User-Agent': `K6-LoadTest/${sessionId}`,
            },
            timeout: '30s',
            tags: { name: 'check_status' },
        };
        
        const response = http.get(`${API_URL}/status/${orderId}`, params);
        
        const statusCheck = check(response, {
            'status check 200': (r) => r.status === 200,
            'status response valid': (r) => {
                try {
                    JSON.parse(r.body);
                    return true;
                } catch {
                    return false;
                }
            }
        });
        
        if (!statusCheck) {
            console.log(`Status check failed for ${sessionId}: ${response.status}`);
            return { success: false };
        }
        
        const statusData = JSON.parse(response.body);
        
        if (statusData.status === 'completed') {
            return {
                success: true,
                downloadUrl: statusData.downloadUrl,
                processingTime: statusData.processingTime
            };
        } else if (statusData.status === 'failed') {
            console.log(`Conversion failed for ${sessionId}: ${statusData.error}`);
            return { success: false, error: statusData.error };
        }
        
        // Aguardar antes do próximo poll
        sleep(pollInterval);
    }
    
    console.log(`Conversion timeout for ${sessionId}`);
    return { success: false, error: 'timeout' };
}

function downloadResult(downloadUrl, sessionId) {
    const params = {
        headers: {
            'User-Agent': `K6-LoadTest/${sessionId}`,
        },
        timeout: '60s',
        tags: { name: 'download_result' },
    };
    
    const response = http.get(downloadUrl, params);
    
    const downloadSuccess = check(response, {
        'download status 200': (r) => r.status === 200,
        'download has content': (r) => r.body.length > 0,
        'download is XML': (r) => r.headers['Content-Type']?.includes('xml') || 
                                   r.body.includes('<?xml'),
    });
    
    if (!downloadSuccess) {
        console.log(`Download failed for ${sessionId}: ${response.status}`);
        errorRate.add(1);
    }
    
    return downloadSuccess;
}

// Setup inicial
export function setup() {
    console.log(`🚀 Iniciando load test contra ${BASE_URL}`);
    console.log('📊 Cenários configurados:');
    console.log('  - Normal Load: 0 → 100 VUs');
    console.log('  - Spike Test: 50 → 500 req/min');
    console.log('  - Stress Test: 0 → 500 VUs');
    
    // Verificar se API está online
    const healthCheck = http.get(`${BASE_URL}/health`);
    if (healthCheck.status !== 200) {
        throw new Error(`API não está disponível: ${healthCheck.status}`);
    }
    
    console.log('✅ API verificada e disponível');
    return { baseUrl: BASE_URL };
}

// Teardown final
export function teardown(data) {
    console.log('🏁 Load test finalizado');
    console.log(`📈 Dados coletados para análise`);
}