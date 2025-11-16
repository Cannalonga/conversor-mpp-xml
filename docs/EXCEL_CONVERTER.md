# Excel Converter - Documentação Completa

## Visão Geral

O Excel Converter é um sistema completo de conversão de arquivos Excel e CSV para múltiplos formatos, desenvolvido com streaming para alta performance e processamento seguro.

### Características Principais

- ✅ **Streaming Processing**: Processa arquivos grandes sem sobrecarregar memória
- ✅ **Múltiplos Formatos**: CSV, JSON, XML, TSV, Parquet
- ✅ **Validação de Segurança**: Detecção de macros e código malicioso
- ✅ **Processamento Assíncrono**: Workers em background para arquivos grandes
- ✅ **Compressão**: Suporte a GZIP, ZIP, BZIP2
- ✅ **API REST**: Endpoints FastAPI com documentação automática

## Formatos Suportados

### Entrada
- **Excel**: `.xlsx`, `.xls`, `.xlsm` (macros bloqueadas por segurança)
- **CSV**: `.csv` com auto-detecção de encoding
- **TSV**: `.tsv` (Tab-separated values)

### Saída
- **CSV**: Valores separados por vírgula
- **JSON**: Array de objetos
- **XML**: Estrutura hierárquica
- **TSV**: Valores separados por tabulação
- **Parquet**: Formato colunar Apache Parquet

### Compressão
- **GZIP**: `.gz` (recomendado para CSV/JSON)
- **ZIP**: `.zip` (compatibilidade universal)
- **BZIP2**: `.bz2` (máxima compressão)

## API Endpoints

### 1. Conversão Simples
```http
POST /api/excel/convert
Content-Type: multipart/form-data

file: arquivo.xlsx
output_format: csv
compression: none
chunk_size: 50000
```

**Resposta:**
```json
{
  "success": true,
  "output_filename": "arquivo.csv",
  "output_format": "csv",
  "file_info": {
    "sheets_count": 1,
    "total_rows": 1000,
    "has_macros": false
  },
  "parsing_stats": {
    "processing_time_seconds": 2.5,
    "memory_peak_mb": 45.2
  },
  "download_url": "/api/excel/download/arquivo.csv"
}
```

### 2. Conversão Assíncrona (Recomendado para arquivos grandes)
```http
POST /api/excel/convert-async
Content-Type: multipart/form-data

file: arquivo_grande.xlsx
output_format: json
```

**Resposta:**
```json
{
  "task_id": "uuid-123-456",
  "status": "queued",
  "estimated_time_minutes": 5,
  "status_url": "/api/excel/status/uuid-123-456"
}
```

### 3. Status da Conversão
```http
GET /api/excel/status/{task_id}
```

**Resposta:**
```json
{
  "task_id": "uuid-123-456",
  "status": "processing",
  "progress_percentage": 65.0,
  "current_step": "Processando dados",
  "estimated_remaining_seconds": 45
}
```

### 4. Download do Arquivo
```http
GET /api/excel/download/{filename}
```

### 5. Informações do Arquivo
```http
POST /api/excel/info
Content-Type: multipart/form-data

file: arquivo.xlsx
```

### 6. Formatos Suportados
```http
GET /api/excel/formats
```

## Configurações Avançadas

### Parser Configuration
```python
{
  "chunk_size": 50000,          # Linhas por chunk (ajustar conforme memória)
  "max_memory_mb": 2048,        # Limite de memória (MB)
  "enable_streaming": True,     # Habilitar streaming
  "normalize_columns": True,    # Normalizar nomes de colunas
  "remove_empty_rows": True,    # Remover linhas vazias
  "date_format": "%Y-%m-%d",    # Formato de data opcional
  "decimal_separator": "."      # Separador decimal
}
```

### Worker Configuration
```python
{
  "max_concurrent_tasks": 4,    # Workers simultâneos
  "queue_max_size": 100,        # Tamanho máximo da fila
  "worker_timeout_seconds": 300 # Timeout por worker
}
```

## Segurança

### Validações Automáticas
- **Extensões permitidas**: Apenas formatos suportados
- **Tamanho máximo**: 100MB por arquivo
- **Detecção de macros**: Bloqueio automático de arquivos com VBA
- **Sanitização**: Limpeza de nomes de arquivo e paths

### Níveis de Risco
- **Baixo**: Arquivos Excel sem macros ou referências externas
- **Médio**: Arquivos com referências externas (permitido)
- **Alto**: Arquivos com macros ou VBA (bloqueado)

## Exemplos de Uso

### 1. Conversão Básica (Python)
```python
import requests

files = {'file': open('planilha.xlsx', 'rb')}
data = {
    'output_format': 'csv',
    'normalize_columns': True
}

response = requests.post(
    'http://localhost:8000/api/excel/convert',
    files=files,
    data=data
)

result = response.json()
print(f"Arquivo convertido: {result['download_url']}")
```

### 2. Conversão com JavaScript
```javascript
const convertExcel = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('output_format', 'json');
    formData.append('compression', 'gzip');

    const response = await fetch('/api/excel/convert', {
        method: 'POST',
        body: formData
    });

    const result = await response.json();
    
    if (result.success) {
        // Download automático
        window.location.href = result.download_url;
    }
};
```

### 3. Processamento Assíncrono
```python
import requests
import time

# Enviar arquivo grande
files = {'file': open('arquivo_grande.xlsx', 'rb')}
response = requests.post(
    'http://localhost:8000/api/excel/convert-async',
    files=files,
    data={'output_format': 'json'}
)

task_id = response.json()['task_id']
print(f"Tarefa criada: {task_id}")

# Aguardar conclusão
while True:
    status_response = requests.get(
        f'http://localhost:8000/api/excel/status/{task_id}'
    )
    status = status_response.json()
    
    print(f"Status: {status['status']} ({status['progress_percentage']}%)")
    
    if status['status'] in ['completed', 'failed']:
        break
    
    time.sleep(2)

if status['status'] == 'completed':
    print(f"Download: {status['result_url']}")
```

## Performance e Otimização

### Recomendações por Tamanho
- **< 1MB**: Conversão síncrona, chunk_size=10000
- **1-10MB**: Conversão síncrona, chunk_size=50000  
- **10-50MB**: Conversão assíncrona, chunk_size=100000
- **> 50MB**: Conversão assíncrona, streaming obrigatório

### Monitoramento
```python
# Estatísticas em tempo real
response = requests.get('http://localhost:8000/api/excel/stats')
stats = response.json()

print(f"Workers ativos: {stats['active_workers']}")
print(f"Fila de conversões: {stats['queue_size']}")
print(f"Tempo médio: {stats['average_processing_time']}s")
```

## Deployment

### Docker Compose
```yaml
services:
  excel-converter:
    image: conversor-excel:latest
    ports:
      - "8000:8000"
    environment:
      - EXCEL_MAX_MEMORY_MB=2048
      - EXCEL_MAX_WORKERS=4
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./uploads:/app/uploads
    depends_on:
      - redis
```

### Variáveis de Ambiente
```env
# Configurações Excel
EXCEL_MAX_FILE_SIZE=104857600     # 100MB
EXCEL_MAX_MEMORY_MB=2048          # 2GB RAM
EXCEL_MAX_WORKERS=4               # Workers paralelos
EXCEL_WORKER_TIMEOUT=300          # 5 minutos

# Storage
UPLOAD_DIR=/app/uploads
TEMP_FILE_TTL=86400               # 24 horas

# Redis (para workers)
REDIS_URL=redis://localhost:6379
CELERY_BROKER_URL=redis://localhost:6379
```

### Health Checks
```bash
# Verificar API
curl http://localhost:8000/health

# Verificar workers
curl http://localhost:8000/api/excel/stats
```

## Troubleshooting

### Problemas Comuns

**1. Erro de Memória**
```
Solution: Reduzir chunk_size ou max_memory_mb
Config: chunk_size=25000, max_memory_mb=1024
```

**2. Arquivo Bloqueado por Segurança**
```
Error: "Arquivo bloqueado: Arquivo contém macros"
Solution: Salvar Excel sem macros (.xlsx ao invés de .xlsm)
```

**3. Timeout em Conversão**
```
Error: Worker timeout
Solution: Usar conversão assíncrona para arquivos grandes
```

**4. Formato não Suportado**
```
Error: "Formato não suportado"
Solution: Verificar extensão e formato com GET /api/excel/formats
```

### Debug Mode
```python
# Habilitar logs detalhados
import logging
logging.getLogger("converters.excel").setLevel(logging.DEBUG)
```

### Logs de Sistema
```bash
# Logs da aplicação
docker-compose logs -f excel-converter

# Logs dos workers
docker-compose logs -f excel-worker
```

## Testes

### Executar Suite de Testes
```bash
# Testes básicos
python test_excel_converter.py

# Testes com pytest
pytest converters/excel/tests/ -v

# Testes de performance
pytest converters/excel/tests/test_performance.py -v
```

### Teste Manual da API
```bash
# Upload e conversão
curl -X POST \
  http://localhost:8000/api/excel/convert \
  -F "file=@exemplo.xlsx" \
  -F "output_format=csv" \
  -F "compression=gzip"
```

## Desenvolvimento

### Estrutura do Código
```
converters/excel/
├── __init__.py          # Inicialização do módulo
├── schemas.py           # Modelos Pydantic
├── parser.py            # Processamento Excel
├── worker.py            # Workers assíncronos
├── api.py              # Endpoints FastAPI
└── tests/
    ├── __init__.py
    ├── test_parser.py
    ├── test_api.py
    └── test_worker.py
```

### Adicionar Novo Formato
```python
# 1. Adicionar enum em schemas.py
class OutputFormat(str, Enum):
    CSV = "csv"
    JSON = "json"
    XML = "xml"
    TSV = "tsv" 
    PARQUET = "parquet"
    NOVO_FORMATO = "novo"  # Adicionar aqui

# 2. Implementar em parser.py
def _write_novo_formato(self, df: pd.DataFrame, output_path: Path):
    # Implementar lógica de escrita
    pass
```

### Contribuição

1. Fork do repositório
2. Criar branch: `git checkout -b feature/nova-funcionalidade`
3. Implementar com testes
4. Commit: `git commit -m "feat: adicionar nova funcionalidade"`
5. Push: `git push origin feature/nova-funcionalidade`
6. Criar Pull Request

## Roadmap

### Próximas Versões

**v2.1.0**
- ✅ Suporte a planilhas múltiplas
- ✅ Compressão automática
- ✅ Validação de segurança avançada

**v2.2.0**
- 🔄 Suporte a ODS (OpenDocument Spreadsheet)
- 🔄 Conversão para banco de dados
- 🔄 API de preview de dados

**v2.3.0**
- 📝 Machine Learning para detecção de colunas
- 📝 Conversão de tipos automática
- 📝 Geração de relatórios

## Licença

Este projeto está licenciado sob MIT License. Veja o arquivo LICENSE para detalhes.

## Suporte

- **Documentação**: `/docs` (FastAPI automática)
- **Issues**: GitHub Issues
- **Email**: suporte@conversor.com
- **Comunidade**: Discord/Slack