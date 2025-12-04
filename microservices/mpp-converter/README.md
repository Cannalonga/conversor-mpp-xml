# MPP Converter Microservice

Microserviço Java Spring Boot que converte arquivos Microsoft Project (.mpp) para XML usando a biblioteca MPXJ.

## Endpoints

### POST /convert
Converte arquivo MPP para MS Project XML.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` - arquivo .mpp, .mpx ou .xml

**Response:**
- Content-Type: `application/xml`
- Headers:
  - `Content-Disposition: attachment; filename="converted.xml"`
  - `X-Conversion-Time-Ms`: tempo de conversão
  - `X-Tasks-Count`: número de tarefas
  - `X-Resources-Count`: número de recursos

### POST /info
Retorna informações do projeto sem conversão completa.

**Response JSON:**
```json
{
  "success": true,
  "filename": "projeto.mpp",
  "projectName": "Meu Projeto",
  "tasksCount": 150,
  "resourcesCount": 25,
  "calendarsCount": 3,
  "startDate": "2025-01-01",
  "finishDate": "2025-12-31"
}
```

### GET /health
Health check para monitoramento.

## Build Local

### Requisitos
- Java 17+
- Maven 3.8+

### Comandos
```bash
# Build
mvn clean package

# Run
java -jar target/mpp-converter.jar

# Test endpoint
curl -X POST -F "file=@projeto.mpp" http://localhost:8080/convert -o output.xml
```

## Docker

### Build
```bash
docker build -t canna/mpp-converter:latest .
```

### Run
```bash
docker run -p 8080:8080 canna/mpp-converter:latest
```

### Docker Compose (com o sistema principal)
```bash
docker-compose up mpp-converter
```

## Configuração

| Variável | Default | Descrição |
|----------|---------|-----------|
| SERVER_PORT | 8080 | Porta do servidor |
| SPRING_SERVLET_MULTIPART_MAX_FILE_SIZE | 100MB | Tamanho máximo de arquivo |

## Formatos Suportados

### Input
- `.mpp` - Microsoft Project 2003-2021
- `.mpx` - Microsoft Project Exchange
- `.xml` - MS Project XML (MSPDI)
- `.mpt` - Microsoft Project Template

### Output
- MS Project XML (MSPDI format)

## Integração com Backend Node.js

O backend Node.js chama este microserviço via HTTP:

```javascript
const FormData = require('form-data');
const axios = require('axios');

async function convertMpp(filePath) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  
  const response = await axios.post('http://mpp-converter:8080/convert', form, {
    headers: form.getHeaders(),
    responseType: 'arraybuffer'
  });
  
  return response.data; // XML buffer
}
```

## Troubleshooting

### OutOfMemoryError
Aumente a memória do container:
```bash
docker run -e JAVA_OPTS="-Xmx512m" -p 8080:8080 canna/mpp-converter
```

### Arquivo corrompido
Verifique se o arquivo não está danificado. Use `/info` para diagnóstico rápido.

### Timeout
Arquivos grandes podem demorar. Aumente timeout no cliente.
