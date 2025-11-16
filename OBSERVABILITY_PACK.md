# 🎯 OBSERVABILITY PACK - PRODUCTION READY

## Prometheus Metrics Exporter

### 1. Metrics Implementation

```python
# monitoring/metrics.py
from prometheus_client import Counter, Histogram, Gauge, CollectorRegistry, generate_latest
from prometheus_client.exposition import MetricsHandler
import time
from functools import wraps
from typing import Dict, Any
import asyncio

# Initialize Prometheus registry
registry = CollectorRegistry()

# Metrics definitions
excel_conversions_total = Counter(
    'excel_conversions_total',
    'Total number of Excel conversions processed',
    ['status', 'format', 'compression'],
    registry=registry
)

excel_conversion_duration = Histogram(
    'excel_conversion_duration_seconds',
    'Time spent converting Excel files',
    ['format', 'compression'],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0, 120.0, 300.0],
    registry=registry
)

excel_file_size_bytes = Histogram(
    'excel_file_size_bytes',
    'Size of Excel files being processed',
    ['format'],
    buckets=[1000, 10000, 100000, 1000000, 10000000, 100000000],
    registry=registry
)

excel_rows_processed = Counter(
    'excel_rows_processed_total',
    'Total number of Excel rows processed',
    ['format'],
    registry=registry
)

excel_memory_usage_bytes = Gauge(
    'excel_memory_usage_bytes',
    'Current memory usage during Excel processing',
    registry=registry
)

excel_workers_active = Gauge(
    'excel_workers_active',
    'Number of active Excel workers',
    registry=registry
)

excel_queue_size = Gauge(
    'excel_queue_size',
    'Number of jobs in Excel processing queue',
    registry=registry
)

excel_errors_total = Counter(
    'excel_errors_total',
    'Total number of Excel processing errors',
    ['error_type', 'format'],
    registry=registry
)

# Decorator for automatic metrics collection
def track_conversion_metrics(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        format_type = kwargs.get('output_format', 'unknown')
        compression = kwargs.get('compression', 'none')
        
        try:
            result = await func(*args, **kwargs)
            
            # Success metrics
            duration = time.time() - start_time
            excel_conversions_total.labels(
                status='success',
                format=format_type,
                compression=compression
            ).inc()
            
            excel_conversion_duration.labels(
                format=format_type,
                compression=compression
            ).observe(duration)
            
            # Track rows processed if available
            if hasattr(result, 'parsing_stats'):
                excel_rows_processed.labels(format=format_type).inc(
                    result.parsing_stats.total_rows_written
                )
            
            return result
            
        except Exception as e:
            # Error metrics
            excel_conversions_total.labels(
                status='error',
                format=format_type,
                compression=compression
            ).inc()
            
            excel_errors_total.labels(
                error_type=type(e).__name__,
                format=format_type
            ).inc()
            
            raise
    
    return wrapper

def track_file_size(file_size: int, format_type: str):
    """Track uploaded file size"""
    excel_file_size_bytes.labels(format=format_type).observe(file_size)

def update_worker_metrics(active_workers: int, queue_size: int):
    """Update worker and queue metrics"""
    excel_workers_active.set(active_workers)
    excel_queue_size.set(queue_size)

def track_memory_usage(memory_bytes: int):
    """Track memory usage"""
    excel_memory_usage_bytes.set(memory_bytes)

def get_metrics() -> str:
    """Get all metrics in Prometheus format"""
    return generate_latest(registry).decode('utf-8')


# FastAPI endpoint integration
from fastapi import APIRouter, Response

metrics_router = APIRouter(tags=["Metrics"])

@metrics_router.get("/metrics")
async def prometheus_metrics():
    """Prometheus metrics endpoint"""
    metrics_data = get_metrics()
    return Response(
        content=metrics_data,
        media_type="text/plain; version=0.0.4; charset=utf-8"
    )


# Worker pool metrics updater
class MetricsCollector:
    def __init__(self, worker_pool):
        self.worker_pool = worker_pool
        
    async def collect_worker_metrics(self):
        """Collect and update worker metrics periodically"""
        while True:
            try:
                stats = self.worker_pool.get_stats()
                update_worker_metrics(
                    stats['active_workers'],
                    stats['queue_size']
                )
                
                # Memory tracking (if available)
                import psutil
                process = psutil.Process()
                track_memory_usage(process.memory_info().rss)
                
            except Exception as e:
                print(f"Error collecting metrics: {e}")
            
            await asyncio.sleep(5)  # Update every 5 seconds
```

### 2. Sentry Integration

```python
# monitoring/sentry_config.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.asyncio import AsyncioIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
import os

def init_sentry():
    """Initialize Sentry for error tracking"""
    
    sentry_dsn = os.getenv("SENTRY_DSN")
    if not sentry_dsn:
        print("⚠️ SENTRY_DSN not configured - error tracking disabled")
        return
    
    sentry_sdk.init(
        dsn=sentry_dsn,
        integrations=[
            FastApiIntegration(auto_enabling_integrations=False),
            AsyncioIntegration(),
            LoggingIntegration(
                level=logging.INFO,        # Capture info and above as breadcrumbs
                event_level=logging.ERROR  # Send errors as events
            ),
        ],
        
        # Performance monitoring
        traces_sample_rate=0.1,  # 10% of traces
        
        # Error filtering
        before_send=filter_sensitive_errors,
        
        # Environment
        environment=os.getenv("ENV", "development"),
        
        # Release tracking
        release=os.getenv("APP_VERSION", "unknown"),
        
        # Additional context
        attach_stacktrace=True,
        send_default_pii=False,  # Don't send PII
    )

def filter_sensitive_errors(event, hint):
    """Filter out sensitive information from Sentry events"""
    
    # Remove file contents from traces
    if 'exception' in event:
        for exception in event['exception']['values']:
            if 'stacktrace' in exception:
                for frame in exception['stacktrace']['frames']:
                    if 'vars' in frame:
                        # Remove file data variables
                        frame['vars'] = {
                            k: "[FILTERED]" if 'file' in k.lower() or 'data' in k.lower() 
                            else v for k, v in frame['vars'].items()
                        }
    
    # Filter request data
    if 'request' in event:
        if 'data' in event['request']:
            event['request']['data'] = "[FILTERED - FILE UPLOAD]"
    
    return event

# Context managers for Sentry
from sentry_sdk import configure_scope, capture_exception

def track_conversion_context(file_info: dict, user_id: str = None):
    """Add conversion context to Sentry"""
    with configure_scope() as scope:
        scope.set_tag("conversion_type", "excel")
        scope.set_tag("file_format", file_info.get('format', 'unknown'))
        scope.set_context("file_info", {
            "sheets_count": file_info.get('sheets_count'),
            "total_rows": file_info.get('total_rows'),
            "file_size": file_info.get('file_size'),
        })
        if user_id:
            scope.set_user({"id": user_id})

def capture_conversion_error(error: Exception, context: dict):
    """Capture conversion error with context"""
    with configure_scope() as scope:
        scope.set_context("conversion_error", context)
        capture_exception(error)
```

### 3. Grafana Dashboard JSON

```json
{
  "dashboard": {
    "id": null,
    "title": "Excel Converter Metrics",
    "tags": ["excel", "converter", "production"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Conversion Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(excel_conversions_total[5m])",
            "legendFormat": "{{status}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "palette-classic"
            },
            "unit": "reqps"
          }
        },
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Success vs Error Rate",
        "type": "timeseries",
        "targets": [
          {
            "expr": "rate(excel_conversions_total{status=\"success\"}[5m])",
            "legendFormat": "Success"
          },
          {
            "expr": "rate(excel_conversions_total{status=\"error\"}[5m])",
            "legendFormat": "Errors"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      },
      {
        "id": 3,
        "title": "Conversion Duration",
        "type": "timeseries",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(excel_conversion_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(excel_conversion_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s"
          }
        },
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8}
      },
      {
        "id": 4,
        "title": "Worker Queue Status",
        "type": "timeseries",
        "targets": [
          {
            "expr": "excel_workers_active",
            "legendFormat": "Active Workers"
          },
          {
            "expr": "excel_queue_size",
            "legendFormat": "Queue Size"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8}
      },
      {
        "id": 5,
        "title": "Memory Usage",
        "type": "timeseries",
        "targets": [
          {
            "expr": "excel_memory_usage_bytes / 1024 / 1024",
            "legendFormat": "Memory MB"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "decbytes"
          }
        },
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 16}
      },
      {
        "id": 6,
        "title": "Rows Processed per Second",
        "type": "timeseries",
        "targets": [
          {
            "expr": "rate(excel_rows_processed_total[1m])",
            "legendFormat": "{{format}}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 16}
      },
      {
        "id": 7,
        "title": "Error Breakdown",
        "type": "piechart",
        "targets": [
          {
            "expr": "excel_errors_total",
            "legendFormat": "{{error_type}}"
          }
        ],
        "gridPos": {"h": 8, "w": 24, "x": 0, "y": 24}
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "5s"
  }
}
```

### 4. Integration with Excel Converter

```python
# converters/excel/api_instrumented.py
from monitoring.metrics import (
    track_conversion_metrics,
    track_file_size,
    track_memory_usage
)
from monitoring.sentry_config import track_conversion_context, capture_conversion_error

# Update the convert_excel_file endpoint
@router.post("/convert", response_model=ExcelConversionResult)
@track_conversion_metrics
async def convert_excel_file_instrumented(
    file: UploadFile = File(...),
    output_format: OutputFormat = OutputFormat.CSV,
    compression: CompressionType = CompressionType.NONE,
    user_id: Optional[str] = None
):
    """Instrumented Excel conversion endpoint"""
    
    try:
        # Track file size
        file_size = file.size if hasattr(file, 'size') else 0
        track_file_size(file_size, output_format.value)
        
        # Sentry context
        file_info = {
            'format': output_format.value,
            'file_size': file_size,
            'filename': file.filename
        }
        track_conversion_context(file_info, user_id)
        
        # Original conversion logic...
        result = await original_convert_logic(file, output_format, compression, user_id)
        
        return result
        
    except Exception as e:
        # Capture error with context
        capture_conversion_error(e, {
            'filename': file.filename,
            'output_format': output_format.value,
            'file_size': file_size,
            'user_id': user_id
        })
        raise
```

### 5. Docker Compose Observability Stack

```yaml
# docker-compose.observability.yml
version: '3.8'

services:
  # Your existing Excel converter service
  excel-converter:
    build: .
    ports:
      - "8000:8000"
    environment:
      - SENTRY_DSN=${SENTRY_DSN}
      - ENV=production
    depends_on:
      - redis
      - prometheus

  # Prometheus for metrics collection
  prometheus:
    image: prom/prometheus:v2.40.0
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'

  # Grafana for dashboards
  grafana:
    image: grafana/grafana:9.3.0
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources:ro
    depends_on:
      - prometheus

  # Redis for workers
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  prometheus_data:
  grafana_data:
```

### 6. Prometheus Configuration

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'excel-converter'
    static_configs:
      - targets: ['excel-converter:8000']
    metrics_path: '/metrics'
    scrape_interval: 5s
    
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
```

## 🚀 Setup Instructions

### 1. Quick Start
```bash
# Install dependencies
pip install prometheus-client sentry-sdk psutil

# Add to your app/main.py
from monitoring.metrics import metrics_router
from monitoring.sentry_config import init_sentry

# Initialize Sentry
init_sentry()

# Add metrics endpoint
app.include_router(metrics_router, prefix="/api")

# Start observability stack
docker-compose -f docker-compose.observability.yml up -d
```

### 2. Environment Variables
```bash
# .env.production
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
ENV=production
APP_VERSION=v1.0.0

# Optional: Grafana
GF_SECURITY_ADMIN_PASSWORD=your-secure-password
```

### 3. Access Points
- **Metrics**: http://localhost:8000/api/metrics
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin123)
- **Sentry**: Your Sentry dashboard

## 📊 Key Metrics Tracked

- **Conversion Rate**: Requests per second
- **Success/Error Ratio**: Success vs failure rate  
- **Duration**: P50, P95 conversion times
- **Throughput**: Rows processed per second
- **Resource Usage**: Memory, active workers, queue size
- **Error Breakdown**: By error type and format

## 🎯 Production Benefits

✅ **Real-time monitoring** of all conversions  
✅ **Automatic error tracking** with Sentry  
✅ **Performance insights** via Grafana dashboards  
✅ **Alerting capabilities** on key metrics  
✅ **Debug context** for failed conversions  
✅ **Capacity planning** data for scaling  

Your Excel converter is now **enterprise-grade observable**! 🔥