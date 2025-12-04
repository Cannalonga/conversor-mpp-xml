# MICROSERVICE INTEGRATION - Real MPP → XML Conversion

## Overview

Este documento descreve a integração do microserviço Java MPXJ para conversão real de arquivos Microsoft Project (.mpp) para XML.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js       │     │   Node.js       │     │   Java MPXJ     │
│   Frontend      │────▶│   Backend API   │────▶│   Microservice  │
│   (port 3000)   │     │   (port 3001)   │     │   (port 8080)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │                        │
                               ▼                        ▼
                        ┌─────────────┐          ┌─────────────┐
                        │   Redis     │          │   MPXJ      │
                        │   Queue     │          │   Library   │
                        └─────────────┘          └─────────────┘
```

## Components

### 1. Java Microservice (microservices/mpp-converter)

**Technology:**
- Java 17+
- Spring Boot 3.2.0
- MPXJ 12.0.0 (Microsoft Project file library)
- Apache POI (for binary MPP support)

**Endpoints:**
- `POST /convert` - Convert MPP file to MS Project XML
- `POST /info` - Extract project metadata without full conversion
- `GET /health` - Health check endpoint

**Build:**
```bash
cd microservices/mpp-converter
mvn clean package
```

**Run:**
```bash
# JAR
java -jar target/mpp-converter-1.0.0.jar

# Docker
docker build -t canna/mpp-converter .
docker run -p 8080:8080 canna/mpp-converter
```

### 2. Node.js Client (converters/mppConverter.js)

**Functions:**
- `convertMppToXml(inputPath, outputPath)` - Full conversion
- `getProjectInfo(inputPath)` - Metadata extraction
- `checkHealth()` - Check microservice status
- `isSupportedFormat(filename)` - Validate file extension

**Environment:**
```env
MPP_CONVERTER_URL=http://localhost:8080
```

### 3. Backend Integration (api/server-enterprise.js)

The job processing now:
1. Checks if converter is `mpp-to-xml` and file is `.mpp`
2. Verifies microservice health
3. If healthy → calls microservice for real conversion
4. If unhealthy → falls back to mock conversion

## Development Setup

### Option 1: Local Development

```bash
# Terminal 1: Start microservice
cd microservices/mpp-converter
mvn spring-boot:run

# Terminal 2: Start backend
npm run start

# Terminal 3: Start frontend
cd frontend && npm run dev
```

### Option 2: Docker Compose

```bash
# Start all services
docker-compose -f docker-compose.full.yml up

# With production profile (includes nginx)
docker-compose -f docker-compose.full.yml --profile production up
```

## Testing

### Test Microservice Integration

```bash
node scripts/test-mpp-microservice.js
```

### Test Conversion Flow

1. Upload .mpp file via frontend
2. Select "MPP to XML" converter
3. Start conversion
4. Download result

If microservice is running, you'll get real converted XML with proper MS Project structure.

## Files Created/Modified

### New Files

| File | Description |
|------|-------------|
| `microservices/mpp-converter/pom.xml` | Maven configuration |
| `microservices/mpp-converter/src/.../MppConverterApplication.java` | Spring Boot app |
| `microservices/mpp-converter/src/.../ConvertController.java` | REST endpoints |
| `microservices/mpp-converter/application.yml` | Server config |
| `microservices/mpp-converter/Dockerfile` | Docker build |
| `microservices/mpp-converter/README.md` | Microservice docs |
| `converters/mppConverter.js` | Node.js client |
| `docker-compose.full.yml` | Full stack orchestration |
| `scripts/test-mpp-microservice.js` | Integration tests |

### Modified Files

| File | Changes |
|------|---------|
| `api/server-enterprise.js` | Added `processJobAsync()` with microservice call |
| `package.json` | Added `form-data` dependency |
| `.env` | Added `MPP_CONVERTER_URL` |

## Fallback Behavior

The system gracefully handles microservice unavailability:

1. **Microservice Running** → Real MPXJ conversion
2. **Microservice Down** → Mock XML generation with warning
3. **Conversion Error** → Fallback to mock + error logging

This ensures the application never breaks, even if the Java microservice is offline.

## Production Considerations

### Resource Requirements

| Service | Memory | CPU |
|---------|--------|-----|
| Backend API | 256-512 MB | 0.5 core |
| MPP Converter | 512-768 MB | 1 core |
| Redis | 128-256 MB | 0.25 core |

### Scaling

The microservice is stateless and can be horizontally scaled:

```yaml
# docker-compose
mpp-converter:
  deploy:
    replicas: 3
```

### Health Monitoring

All services expose health endpoints:
- Backend: `GET /api/health`
- Microservice: `GET /health`
- Redis: `redis-cli ping`

## Troubleshooting

### Microservice Not Starting

```bash
# Check Java version
java -version  # Must be 17+

# Check logs
docker logs canna-mpp-converter

# Verify port
curl http://localhost:8080/health
```

### Conversion Failing

1. Check microservice logs
2. Verify file is valid MPP format
3. Check file size limits (100MB max)

### Network Issues (Docker)

Ensure services are on same network:
```bash
docker network inspect canna-network
```

## Next Steps

- [ ] Add BullMQ for proper queue management
- [ ] Implement retry logic with exponential backoff
- [ ] Add metrics/observability (Prometheus)
- [ ] Create Kubernetes manifests for production
