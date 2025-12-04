# 📋 Converters Documentation

## Estrutura Padrão

Cada conversor deve seguir esta estrutura:

```
converters/
├── utils.js              # Utilitários compartilhados
├── template-converter.js # Template para novos conversores
├── mppToXml.js          # MPP → XML
├── excelToCsv.js        # Excel ↔ CSV
├── jsonToCsv.js         # JSON → CSV
├── zipToXml.js          # ZIP → XML
└── xmlToMpp.js          # XML → MPP
```

## Como Criar um Novo Conversor

### 1. Copie o Template

```bash
cp converters/template-converter.js converters/meu-conversor.js
```

### 2. Edite as Configurações

```javascript
class MeuConversor {
    constructor() {
        // Extensões aceitas na entrada
        this.supportedInputExtensions = ['.pdf', '.doc'];
        
        // Extensão do arquivo de saída
        this.outputExtension = '.txt';
        
        // Ferramentas externas necessárias (vazio se não usar)
        this.requiredTools = ['pdftotext'];
        
        // Nome para logs
        this.name = 'MeuConversor';
    }
}
```

### 3. Implemente a Conversão

No método `convert()`, substitua o placeholder:

```javascript
// Exemplo com ferramenta externa
const { stdout, stderr, exitCode } = await executeCommand(
    'pdftotext',
    [inputPath, outputPath],
    { timeout: 60000 }
);

if (exitCode !== 0) {
    return { success: false, errors: [stderr] };
}
```

### 4. Teste em Dry-Run Mode

```bash
CONVERTER_DRY_RUN=1 node -e "
const converter = require('./converters/meu-conversor');
converter.convert('test.pdf', 'output.txt').then(console.log);
"
```

### 5. Crie um Teste Unitário

```javascript
// tests/converters/meu-conversor.test.js
const converter = require('../../converters/meu-conversor');

describe('MeuConversor', () => {
    test('should convert in dry-run mode', async () => {
        process.env.CONVERTER_DRY_RUN = '1';
        const result = await converter.convert('test.pdf', 'output.txt');
        expect(result.success).toBe(true);
        expect(result.metadata.dryRun).toBe(true);
    });
});
```

## Interface Obrigatória

Todo conversor DEVE exportar:

### `convert(inputPath, outputPath, options)`

```typescript
async function convert(
    inputPath: string,
    outputPath: string,
    options?: object
): Promise<{
    success: boolean;
    errors?: string[];
    metadata?: {
        converter: string;
        inputPath: string;
        outputPath: string;
        inputInfo?: FileInfo;
        outputInfo?: FileInfo;
        dryRun?: boolean;
        [key: string]: any;
    };
}>
```

### Propriedades Recomendadas

- `supportedInputExtensions: string[]`
- `outputExtension: string`
- `requiredTools: string[]`
- `name: string`

## Utilitários Disponíveis (converters/utils.js)

| Função | Descrição |
|--------|-----------|
| `fileExists(path)` | Verifica se arquivo existe |
| `ensureOutputDir(path)` | Cria diretório de saída |
| `getFileInfo(path)` | Retorna info do arquivo |
| `checkToolInstalled(tool)` | Verifica ferramenta externa |
| `executeCommand(cmd, args, opts)` | Executa comando com timeout |
| `validateInput(path, extensions)` | Valida arquivo de entrada |
| `createDryRunOutput(path, meta)` | Cria placeholder dry-run |
| `logger.info/warn/error/debug()` | Logging estruturado |
| `measureTime(fn)` | Mede tempo de execução |
| `cleanupTempFiles(paths)` | Remove arquivos temp |

## Dry-Run Mode

Todos os conversores devem suportar dry-run para testes:

```bash
# Ativar dry-run
export CONVERTER_DRY_RUN=1

# Testar sem executar conversão real
npm run test:converters
```

No dry-run, o conversor:
1. Valida o arquivo de entrada
2. Verifica dependências
3. Cria um arquivo placeholder de saída
4. Retorna sucesso sem executar conversão real

## Checklist para Novos Conversores

- [ ] Herda estrutura do template
- [ ] Define `supportedInputExtensions`
- [ ] Define `outputExtension`
- [ ] Define `requiredTools` (se aplicável)
- [ ] Implementa `convert()`
- [ ] Suporta dry-run mode
- [ ] Tem tratamento de erros (try-catch)
- [ ] Usa logger para mensagens
- [ ] Tem teste unitário
- [ ] Está documentado aqui

## Conversores Implementados

| Conversor | Entrada | Saída | Status |
|-----------|---------|-------|--------|
| mppToXml | .mpp | .xml | ✅ Funcional |
| excelToCsv | .xlsx, .xls | .csv | ✅ Funcional |
| jsonToCsv | .json | .csv | ✅ Funcional |
| zipToXml | .zip | .xml | ✅ Funcional |
| xmlToMpp | .xml | .mpp | ✅ Funcional |

## Scripts Úteis

```bash
# Auditar conversores
npm run audit:converters

# Testar todos os conversores
npm run test:converters

# Rodar smoke test
npm run smoke
```
