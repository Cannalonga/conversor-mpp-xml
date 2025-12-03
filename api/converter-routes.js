/**
 * 🔌 ROTAS API - 4 NOVOS CONVERSORES
 * 
 * Endpoints para:
 * - POST /api/convert/excel-to-csv
 * - POST /api/convert/json-to-csv
 * - POST /api/convert/zip-to-xml
 * - POST /api/convert/xml-to-mpp
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Importar conversores
const excelConverter = require('../converters/excelToCsv');
const jsonConverter = require('../converters/jsonToCsv');
const zipConverter = require('../converters/zipToXml');
const xmlConverter = require('../converters/xmlToMpp');

const router = express.Router();

// Configurar multer para uploads
const uploadDir = path.join(__dirname, '../uploads/converter-temp');
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

/**
 * 1️⃣  EXCEL → CSV
 * POST /api/converters/excel-to-csv
 */
router.post('/excel-to-csv', upload.single('file'), async (req, res) => {
  let inputPath = null;
  let outputPath = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum arquivo enviado'
      });
    }

    // Validar tipo de arquivo
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (!['.xlsx', '.xls'].includes(ext)) {
      return res.status(400).json({
        success: false,
        error: 'Arquivo deve ser Excel (.xlsx ou .xls)',
        receivedType: ext
      });
    }

    inputPath = req.file.path;
    const filename = path.basename(req.file.originalname, ext);
    outputPath = path.join(uploadDir, `${filename}_${Date.now()}.csv`);

    // Converter
    const result = await excelConverter.convertExcelToCsv(inputPath, outputPath, {
      sheetName: req.body.sheetName || undefined
    });

    // Ler arquivo gerado
    const csvContent = await fs.readFile(outputPath, 'utf8');

    return res.json({
      success: true,
      conversion: result,
      csvPreview: csvContent.split('\n').slice(0, 5).join('\n'),
      downloadUrl: `/api/download/converter/${path.basename(outputPath)}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erro na conversão Excel→CSV:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      stage: 'conversion'
    });
  } finally {
    // Limpar arquivo de entrada
    if (inputPath) {
      try {
        await fs.unlink(inputPath);
      } catch (e) {
        // Ignorar erros de limpeza
      }
    }
  }
});

/**
 * 2️⃣  JSON → CSV
 * POST /api/converters/json-to-csv
 */
router.post('/json-to-csv', upload.single('file'), async (req, res) => {
  let inputPath = null;
  let outputPath = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum arquivo enviado'
      });
    }

    // Validar tipo de arquivo
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext !== '.json') {
      return res.status(400).json({
        success: false,
        error: 'Arquivo deve ser JSON (.json)',
        receivedType: ext
      });
    }

    inputPath = req.file.path;
    const filename = path.basename(req.file.originalname, ext);
    outputPath = path.join(uploadDir, `${filename}_${Date.now()}.csv`);

    // Converter
    const result = await jsonConverter.convertJsonToCsv(inputPath, outputPath, {
      flattenDepth: req.body.flattenDepth || 0
    });

    // Ler arquivo gerado
    const csvContent = await fs.readFile(outputPath, 'utf8');

    return res.json({
      success: true,
      conversion: result,
      csvPreview: csvContent.split('\n').slice(0, 5).join('\n'),
      downloadUrl: `/api/download/converter/${path.basename(outputPath)}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erro na conversão JSON→CSV:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      stage: 'conversion'
    });
  } finally {
    // Limpar arquivo de entrada
    if (inputPath) {
      try {
        await fs.unlink(inputPath);
      } catch (e) {
        // Ignorar erros de limpeza
      }
    }
  }
});

/**
 * 3️⃣  ZIP → XML
 * POST /api/converters/zip-to-xml
 */
router.post('/zip-to-xml', upload.single('file'), async (req, res) => {
  let inputPath = null;
  let outputDir = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum arquivo enviado'
      });
    }

    // Validar tipo de arquivo
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext !== '.zip') {
      return res.status(400).json({
        success: false,
        error: 'Arquivo deve ser ZIP (.zip)',
        receivedType: ext
      });
    }

    inputPath = req.file.path;
    const filename = path.basename(req.file.originalname, ext);
    outputDir = path.join(uploadDir, `extracted_${filename}_${Date.now()}`);

    // Extrair
    const result = await zipConverter.convertZipToXml(inputPath, outputDir);

    return res.json({
      success: true,
      conversion: result,
      downloadUrl: `/api/download/converter/${path.basename(outputDir)}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erro na extração ZIP→XML:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      stage: 'extraction'
    });
  } finally {
    // Limpar arquivo de entrada
    if (inputPath) {
      try {
        await fs.unlink(inputPath);
      } catch (e) {
        // Ignorar erros de limpeza
      }
    }
  }
});

/**
 * 4️⃣  XML → MPP
 * POST /api/converters/xml-to-mpp
 */
router.post('/xml-to-mpp', upload.single('file'), async (req, res) => {
  let inputPath = null;
  let outputPath = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum arquivo enviado'
      });
    }

    // Validar tipo de arquivo
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext !== '.xml') {
      return res.status(400).json({
        success: false,
        error: 'Arquivo deve ser XML (.xml)',
        receivedType: ext
      });
    }

    inputPath = req.file.path;
    const filename = path.basename(req.file.originalname, ext);
    outputPath = path.join(uploadDir, `${filename}_${Date.now()}.mpp`);

    // Converter
    const result = await xmlConverter.convertXmlToMpp(inputPath, outputPath);

    // Ler arquivo gerado
    const mppContent = await fs.readFile(outputPath, 'utf8');
    const mppData = JSON.parse(mppContent);

    return res.json({
      success: true,
      conversion: result,
      projectName: mppData.project.name,
      tasksCount: mppData.project.tasks.length,
      resourcesCount: mppData.project.resources.length,
      downloadUrl: `/api/download/converter/${path.basename(outputPath)}`,
      warning: result.warning,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erro na conversão XML→MPP:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      stage: 'conversion'
    });
  } finally {
    // Limpar arquivo de entrada
    if (inputPath) {
      try {
        await fs.unlink(inputPath);
      } catch (e) {
        // Ignorar erros de limpeza
      }
    }
  }
});

/**
 * GET /api/converters/health
 * Status dos conversores
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '✅ Todos os 4 conversores estão operacionais',
    converters: [
      {
        name: 'Excel → CSV',
        endpoint: 'POST /api/converters/excel-to-csv',
        formats: ['.xlsx', '.xls'],
        status: '✅ Online'
      },
      {
        name: 'JSON → CSV',
        endpoint: 'POST /api/converters/json-to-csv',
        formats: ['.json'],
        status: '✅ Online'
      },
      {
        name: 'ZIP → XML',
        endpoint: 'POST /api/converters/zip-to-xml',
        formats: ['.zip'],
        status: '✅ Online'
      },
      {
        name: 'XML → MPP',
        endpoint: 'POST /api/converters/xml-to-mpp',
        formats: ['.xml'],
        status: '✅ Online'
      }
    ],
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
