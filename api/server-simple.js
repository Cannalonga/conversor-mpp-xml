/**
 * Servidor Simplificado para Teste
 * Funciona sem Redis para validação básica
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de segurança
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // 100 requests por IP
    message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' }
});

const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // 5 uploads por IP
    message: { error: 'Limite de uploads excedido. Tente novamente em 15 minutos.' }
});

app.use(generalLimiter);

// Servir arquivos estáticos
app.use(express.static('public'));

// Configuração do multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../uploads/incoming');
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueId = uuidv4();
        const fileExtension = path.extname(file.originalname);
        cb(null, `${uniqueId}${fileExtension}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.mpp', '.mpt'];
        const fileExtension = path.extname(file.originalname).toLowerCase();
        
        if (allowedExtensions.includes(fileExtension)) {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos .mpp e .mpt são permitidos'), false);
        }
    }
});

// Rotas

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '2.0.0-test',
        mode: 'simplified-no-redis'
    });
});

// Upload simplificado (sem queue)
app.post('/api/upload', uploadLimiter, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Nenhum arquivo foi enviado'
            });
        }

        console.log('📁 Arquivo recebido:', {
            originalName: req.file.originalname,
            fileName: req.file.filename,
            size: req.file.size
        });

        // Simular conversão (sem processamento real para teste)
        const mockXmlContent = generateMockXML(req.file.originalname);
        
        // Salvar XML mockado
        const convertedPath = path.join(__dirname, '../uploads/converted', req.file.filename.replace(path.extname(req.file.filename), '.xml'));
        fs.writeFileSync(convertedPath, mockXmlContent);

        // Sanitizar nome do arquivo para URL segura
        const sanitizedFileName = req.file.filename
            .replace(/[<>&'"]/g, '')
            .replace(/[^\w.-]/g, '')
            .trim();
            
        // Responder com sucesso
        res.json({
            success: true,
            message: 'Arquivo convertido com sucesso!',
            originalName: req.file.originalname,
            fileName: req.file.filename,
            downloadUrl: `/api/download/${sanitizedFileName.replace(path.extname(sanitizedFileName), '.xml')}`,
            size: req.file.size
        });

    } catch (error) {
        console.error('Erro no upload:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// Download simplificado
app.get('/api/download/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, '../uploads/converted', filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                error: 'Arquivo não encontrado'
            });
        }

        const originalName = filename.replace('.xml', '.xml');
        
        res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
        res.setHeader('Content-Type', 'application/xml');
        
        res.sendFile(filePath);

    } catch (error) {
        console.error('Erro no download:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

// Função para gerar XML mockado para teste
function generateMockXML(originalFilename) {
    const now = new Date().toISOString();
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Project xmlns="http://schemas.microsoft.com/project">
    <Title>Projeto Convertido de ${originalFilename}</Title>
    <CreationDate>${now}</CreationDate>
    <LastSaved>${now}</LastSaved>
    <Company>Conversor MPP XML</Company>
    <Manager>Sistema Automático</Manager>
    
    <Tasks>
        <Task>
            <UID>1</UID>
            <ID>1</ID>
            <Name>Tarefa de Exemplo 1</Name>
            <Type>1</Type>
            <IsNull>0</IsNull>
            <CreateDate>${now}</CreateDate>
            <Start>2024-01-01T08:00:00</Start>
            <Finish>2024-01-05T17:00:00</Finish>
            <Duration>PT32H0M0S</Duration>
            <Work>PT32H0M0S</Work>
            <Priority>500</Priority>
        </Task>
        
        <Task>
            <UID>2</UID>
            <ID>2</ID>
            <Name>Tarefa de Exemplo 2</Name>
            <Type>1</Type>
            <IsNull>0</IsNull>
            <CreateDate>${now}</CreateDate>
            <Start>2024-01-06T08:00:00</Start>
            <Finish>2024-01-10T17:00:00</Finish>
            <Duration>PT32H0M0S</Duration>
            <Work>PT32H0M0S</Work>
            <Priority>500</Priority>
        </Task>
    </Tasks>
    
    <Resources>
        <Resource>
            <UID>1</UID>
            <ID>1</ID>
            <Name>Recurso de Exemplo</Name>
            <Type>1</Type>
            <IsNull>0</IsNull>
            <Initials>RE</Initials>
            <StandardRate>50</StandardRate>
            <OvertimeRate>75</OvertimeRate>
        </Resource>
    </Resources>
    
    <Assignments>
        <Assignment>
            <UID>1</UID>
            <TaskUID>1</TaskUID>
            <ResourceUID>1</ResourceUID>
            <Work>PT16H0M0S</Work>
            <Start>2024-01-01T08:00:00</Start>
            <Finish>2024-01-03T17:00:00</Finish>
        </Assignment>
    </Assignments>
</Project>`;
}

// Middleware de erro
app.use((error, req, res, next) => {
    console.error('Erro capturado:', error);
    
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'Arquivo muito grande. Máximo: 10MB'
            });
        }
    }
    
    res.status(500).json({
        success: false,
        error: error.message || 'Erro interno do servidor'
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log('🚀 CONVERSOR MPP → XML - MODO TESTE');
    console.log('====================================');
    console.log(`✅ Servidor rodando na porta ${PORT}`);
    console.log(`🌐 Acesse: http://localhost:${PORT}`);
    console.log(`🔍 Health: http://localhost:${PORT}/api/health`);
    console.log('');
    console.log('🔧 MODO SIMPLIFICADO ATIVO:');
    console.log('   - Sem Redis (queue desabilitado)');
    console.log('   - Conversão mockada para teste');
    console.log('   - Upload e download funcionais');
    console.log('');
    console.log('📁 Estrutura de arquivos:');
    console.log('   - uploads/incoming/ (arquivos enviados)');
    console.log('   - uploads/converted/ (arquivos convertidos)');
    console.log('');
    console.log('🎯 Para produção complete: instalar Redis');
    console.log('====================================');
});

module.exports = app;