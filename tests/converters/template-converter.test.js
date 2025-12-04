/**
 * 🧪 Template Converter Unit Tests
 */

const path = require('path');
const fs = require('fs').promises;
const templateConverter = require('../../converters/template-converter');

// Diretório temporário para testes
const TEST_DIR = path.join(__dirname, '../../temp/test-template');
const TEST_INPUT = path.join(TEST_DIR, 'test-input.input-ext');
const TEST_OUTPUT = path.join(TEST_DIR, 'test-output.output-ext');

describe('TemplateConverter', () => {
    beforeAll(async () => {
        // Criar diretório de teste
        await fs.mkdir(TEST_DIR, { recursive: true });
        
        // Criar arquivo de teste
        await fs.writeFile(TEST_INPUT, 'Test content for converter', 'utf8');
    });

    afterAll(async () => {
        // Limpar arquivos de teste
        try {
            await fs.rm(TEST_DIR, { recursive: true, force: true });
        } catch {
            // Ignorar erros de limpeza
        }
    });

    beforeEach(() => {
        // Garantir dry-run mode para testes
        process.env.CONVERTER_DRY_RUN = '1';
    });

    afterEach(() => {
        delete process.env.CONVERTER_DRY_RUN;
    });

    test('should have required properties', () => {
        expect(templateConverter.name).toBeDefined();
        expect(templateConverter.supportedInputExtensions).toBeInstanceOf(Array);
        expect(templateConverter.outputExtension).toBeDefined();
        expect(templateConverter.requiredTools).toBeInstanceOf(Array);
    });

    test('should have convert function', () => {
        expect(typeof templateConverter.convert).toBe('function');
    });

    test('should have getInfo function', () => {
        expect(typeof templateConverter.getInfo).toBe('function');
        
        const info = templateConverter.getInfo();
        expect(info.name).toBeDefined();
        expect(info.inputTypes).toBeInstanceOf(Array);
        expect(info.outputTypes).toBeInstanceOf(Array);
    });

    test('should convert in dry-run mode', async () => {
        const result = await templateConverter.convert(TEST_INPUT, TEST_OUTPUT);
        
        expect(result.success).toBe(true);
        expect(result.metadata).toBeDefined();
        expect(result.metadata.dryRun).toBe(true);
    });

    test('should create output file in dry-run mode', async () => {
        await templateConverter.convert(TEST_INPUT, TEST_OUTPUT);
        
        // Verificar se arquivo foi criado
        const exists = await fs.access(TEST_OUTPUT)
            .then(() => true)
            .catch(() => false);
        
        expect(exists).toBe(true);
        
        // Verificar conteúdo do placeholder
        const content = await fs.readFile(TEST_OUTPUT, 'utf8');
        const data = JSON.parse(content);
        
        expect(data.dryRun).toBe(true);
        expect(data.timestamp).toBeDefined();
    });

    test('should fail with non-existent input file', async () => {
        const result = await templateConverter.convert(
            '/non/existent/file.input-ext',
            TEST_OUTPUT
        );
        
        expect(result.success).toBe(false);
        expect(result.errors).toBeInstanceOf(Array);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should include metadata in result', async () => {
        const result = await templateConverter.convert(TEST_INPUT, TEST_OUTPUT, {
            customOption: 'test'
        });
        
        expect(result.metadata.converter).toBe('TemplateConverter');
        expect(result.metadata.inputPath).toBe(TEST_INPUT);
        expect(result.metadata.outputPath).toBe(TEST_OUTPUT);
        expect(result.metadata.timestamp).toBeDefined();
    });

    test('should check dependencies', async () => {
        const deps = await templateConverter.checkDependencies();
        
        expect(deps).toHaveProperty('ready');
        expect(deps).toHaveProperty('missing');
        expect(deps.missing).toBeInstanceOf(Array);
    });
});
