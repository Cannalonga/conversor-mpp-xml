/**
 * 🧪 TESTE FUNCIONAL - 4 NOVOS CONVERSORES
 * 
 * Este script testa CADA UM dos 4 novos conversores com dados reais
 * Não é mock - são conversões reais que você pode validar
 * 
 * Execução: node scripts/test-all-converters.js
 */

const fs = require('fs').promises;
const path = require('path');
const excelConverter = require('../converters/excelToCsv');
const jsonConverter = require('../converters/jsonToCsv');
const zipConverter = require('../converters/zipToXml');
const xmlConverter = require('../converters/xmlToMpp');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

const log = {
  title: (text) => console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════${colors.reset}`),
  header: (text) => console.log(`${colors.bright}${colors.magenta}${text}${colors.reset}`),
  success: (text) => console.log(`${colors.green}✅ ${text}${colors.reset}`),
  error: (text) => console.log(`${colors.red}❌ ${text}${colors.reset}`),
  info: (text) => console.log(`${colors.cyan}ℹ️  ${text}${colors.reset}`),
  step: (text) => console.log(`${colors.yellow}→ ${text}${colors.reset}`),
  result: (text) => console.log(`${colors.bright}${text}${colors.reset}`)
};

// Diretórios de teste
const testDir = path.join(__dirname, '../temp/converter-tests');
const uploadDir = path.join(testDir, 'uploads');
const outputDir = path.join(testDir, 'outputs');

/**
 * TEST 1: Excel → CSV
 */
async function testExcelToCsv() {
  log.header('TEST 1️⃣  - EXCEL → CSV CONVERTER');
  
  try {
    // Criar arquivo Excel de teste
    const XLSX = require('xlsx');
    const testData = [
      ['ID', 'Nome', 'Email', 'Departamento'],
      [1, 'João Silva', 'joao@example.com', 'TI'],
      [2, 'Maria Santos', 'maria@example.com', 'RH'],
      [3, 'Pedro Costa', 'pedro@example.com', 'Vendas'],
      [4, 'Ana Oliveira', 'ana@example.com', 'Marketing']
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(testData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pessoas');

    const excelPath = path.join(uploadDir, 'test-data.xlsx');
    XLSX.writeFile(workbook, excelPath);

    log.step('Arquivo Excel de teste criado');
    log.info(`Caminho: ${excelPath}`);

    // Converter
    const csvPath = path.join(outputDir, 'test-data.csv');
    const result = await excelConverter.convertExcelToCsv(excelPath, csvPath);

    log.success(`Conversão realizada com sucesso!`);
    log.result(`├─ Arquivo de entrada: ${result.inputFile}`);
    log.result(`├─ Arquivo de saída: ${result.outputFile}`);
    log.result(`├─ Linhas processadas: ${result.rowsProcessed}`);
    log.result(`├─ Colunas processadas: ${result.columnsProcessed}`);
    log.result(`└─ Tamanho do CSV: ${(result.outputSize / 1024).toFixed(2)} KB`);

    // Validar arquivo
    const csvContent = await fs.readFile(csvPath, 'utf8');
    log.info(`\nPrimeiras linhas do CSV gerado:\n${csvContent.split('\n').slice(0, 3).join('\n')}`);

    return true;
  } catch (error) {
    log.error(`${error.message}`);
    return false;
  }
}

/**
 * TEST 2: JSON → CSV
 */
async function testJsonToCsv() {
  log.header('TEST 2️⃣  - JSON → CSV CONVERTER');
  
  try {
    // Criar arquivo JSON de teste
    const testData = [
      { id: 1, nome: 'Projeto A', status: 'Ativo', progresso: 75 },
      { id: 2, nome: 'Projeto B', status: 'Ativo', progresso: 50 },
      { id: 3, nome: 'Projeto C', status: 'Pausado', progresso: 25 },
      { id: 4, nome: 'Projeto D', status: 'Concluído', progresso: 100 }
    ];

    const jsonPath = path.join(uploadDir, 'test-projects.json');
    await fs.writeFile(jsonPath, JSON.stringify(testData, null, 2), 'utf8');

    log.step('Arquivo JSON de teste criado');
    log.info(`Caminho: ${jsonPath}`);

    // Converter
    const csvPath = path.join(outputDir, 'test-projects.csv');
    const result = await jsonConverter.convertJsonToCsv(jsonPath, csvPath);

    log.success(`Conversão realizada com sucesso!`);
    log.result(`├─ Arquivo de entrada: ${result.inputFile}`);
    log.result(`├─ Arquivo de saída: ${result.outputFile}`);
    log.result(`├─ Linhas processadas: ${result.rowsProcessed}`);
    log.result(`├─ Colunas processadas: ${result.columnsProcessed}`);
    log.result(`├─ Headers: ${result.headers.join(', ')}`);
    log.result(`└─ Tamanho do CSV: ${(result.outputSize / 1024).toFixed(2)} KB`);

    // Validar arquivo
    const csvContent = await fs.readFile(csvPath, 'utf8');
    log.info(`\nPrimeiras linhas do CSV gerado:\n${csvContent.split('\n').slice(0, 3).join('\n')}`);

    return true;
  } catch (error) {
    log.error(`${error.message}`);
    return false;
  }
}

/**
 * TEST 3: ZIP → XML
 */
async function testZipToXml() {
  log.header('TEST 3️⃣  - ZIP → XML CONVERTER');
  
  try {
    // Criar arquivo ZIP de teste com XMLs dentro
    const archiver = require('archiver');
    const { createWriteStream } = require('fs');

    // Criar XMLs de exemplo
    const xmlContent1 = `<?xml version="1.0" encoding="UTF-8"?>
<Project>
  <Name>Projeto Test 1</Name>
  <StartDate>2025-01-01</StartDate>
  <Tasks>
    <Task><ID>1</ID><Name>Tarefa 1</Name></Task>
  </Tasks>
</Project>`;

    const xmlContent2 = `<?xml version="1.0" encoding="UTF-8"?>
<Project>
  <Name>Projeto Test 2</Name>
  <StartDate>2025-01-15</StartDate>
  <Tasks>
    <Task><ID>1</ID><Name>Tarefa A</Name></Task>
  </Tasks>
</Project>`;

    // Criar ZIP
    const zipPath = path.join(uploadDir, 'test-projects.zip');
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);
      archive.pipe(output);
      archive.append(xmlContent1, { name: 'project1.xml' });
      archive.append(xmlContent2, { name: 'subfolder/project2.xml' });
      archive.finalize();
    });

    log.step('Arquivo ZIP de teste criado');
    log.info(`Caminho: ${zipPath}`);

    // Extrair
    const extractDir = path.join(outputDir, 'extracted-zip');
    const result = await zipConverter.convertZipToXml(zipPath, extractDir);

    log.success(`Extração realizada com sucesso!`);
    log.result(`├─ Diretório de saída: ${extractDir}`);
    log.result(`├─ Total de arquivos: ${result.filesExtracted}`);
    log.result(`├─ XMLs extraídos: ${result.xmlFilesExtracted}`);
    log.result(`└─ Arquivos XML: ${result.xmlFiles.join(', ')}`);

    return true;
  } catch (error) {
    log.error(`${error.message}`);
    return false;
  }
}

/**
 * TEST 4: XML → MPP
 */
async function testXmlToMpp() {
  log.header('TEST 4️⃣  - XML → MPP CONVERTER');
  
  try {
    // Criar arquivo XML de teste
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Project>
  <Name>Projeto Exemplo</Name>
  <CreatedDate>2025-01-01T00:00:00Z</CreatedDate>
  <StartDate>2025-01-01T00:00:00Z</StartDate>
  <FinishDate>2025-12-31T23:59:59Z</FinishDate>
  <Company>CannaConverter</Company>
  <Manager>Gerente de Projeto</Manager>
  <Tasks>
    <Task>
      <ID>1</ID>
      <Name>Análise de Requisitos</Name>
      <Start>2025-01-05T08:00:00Z</Start>
      <Finish>2025-01-10T17:00:00Z</Finish>
      <Duration>PT40H0M0S</Duration>
    </Task>
    <Task>
      <ID>2</ID>
      <Name>Desenvolvimento</Name>
      <Start>2025-01-13T08:00:00Z</Start>
      <Finish>2025-02-28T17:00:00Z</Finish>
      <Duration>PT480H0M0S</Duration>
    </Task>
  </Tasks>
  <Resources>
    <Resource>
      <ID>1</ID>
      <Name>Desenvolvedor Senior</Name>
      <Type>Work</Type>
      <MaxUnits>1.0</MaxUnits>
    </Resource>
  </Resources>
</Project>`;

    const xmlPath = path.join(uploadDir, 'test-project.xml');
    await fs.writeFile(xmlPath, xmlContent, 'utf8');

    log.step('Arquivo XML de teste criado');
    log.info(`Caminho: ${xmlPath}`);

    // Converter
    const mppPath = path.join(outputDir, 'test-project.mpp');
    const result = await xmlConverter.convertXmlToMpp(xmlPath, mppPath);

    log.success(`Conversão realizada com sucesso!`);
    log.result(`├─ Arquivo de entrada: ${result.inputFile}`);
    log.result(`├─ Arquivo de saída: ${result.outputFile}`);
    log.result(`├─ Tarefas extraídas: ${result.tasksExtracted}`);
    log.result(`├─ Recursos extraídos: ${result.resourcesExtracted}`);
    log.result(`├─ Formato: ${result.format}`);
    log.result(`└─ ⚠️  ${result.warning}`);

    // Validar arquivo
    const mppContent = await fs.readFile(mppPath, 'utf8');
    const mppData = JSON.parse(mppContent);
    log.info(`\nProjeto convertido: ${mppData.project.name}`);
    log.info(`Total de tarefas: ${mppData.project.tasks.length}`);

    return true;
  } catch (error) {
    log.error(`${error.message}`);
    return false;
  }
}

/**
 * EXECUTAR TODOS OS TESTES
 */
async function runAllTests() {
  console.log(`\n${colors.bright}${colors.cyan}
╔══════════════════════════════════════════════════════════════╗
║   🧪 TESTES DE CONVERSORES - 4 NOVOS CONVERSORES            ║
║   Data: ${new Date().toLocaleString('pt-BR')}                    ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}\n`);

  // Criar diretórios
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.mkdir(outputDir, { recursive: true });

  const results = {
    'Excel → CSV': await testExcelToCsv(),
    'JSON → CSV': await testJsonToCsv(),
    'ZIP → XML': await testZipToXml(),
    'XML → MPP': await testXmlToMpp()
  };

  // Resumo
  console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════${colors.reset}`);
  log.header('RESUMO DOS TESTES');
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════${colors.reset}\n`);

  let passed = 0;
  let failed = 0;

  for (const [test, result] of Object.entries(results)) {
    if (result) {
      log.success(`${test}`);
      passed++;
    } else {
      log.error(`${test}`);
      failed++;
    }
  }

  console.log(`\n${colors.bright}Resultado Final:${colors.reset}`);
  console.log(`${colors.green}✅ Passou: ${passed}${colors.reset}`);
  console.log(`${colors.red}❌ Falhou: ${failed}${colors.reset}`);

  console.log(`\n${colors.bright}Arquivos gerados em:${colors.reset}`);
  console.log(`📂 ${outputDir}\n`);

  if (failed === 0) {
    console.log(`${colors.bright}${colors.green}🎉 TODOS OS 4 CONVERSORES ESTÃO FUNCIONANDO! 🎉${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.bright}${colors.red}⚠️  Alguns testes falharam${colors.reset}\n`);
    process.exit(1);
  }
}

// Executar
runAllTests().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
