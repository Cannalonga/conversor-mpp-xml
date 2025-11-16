"""
Prometheus Metrics Exporter for Excel Converter
Production-ready observability implementation
"""

from prometheus_client import Counter, Histogram, Gauge, CollectorRegistry, generate_latest
from fastapi import APIRouter, Response
import time
import psutil
import asyncio
from functools import wraps
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

# Initialize Prometheus registry
registry = CollectorRegistry()

# ===== METRICS DEFINITIONS =====

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

excel_security_blocks = Counter(
    'excel_security_blocks_total',
    'Files blocked due to security issues',
    ['risk_level', 'reason'],
    registry=registry
)

excel_api_requests = Counter(
    'excel_api_requests_total',
    'Total API requests to Excel endpoints',
    ['endpoint', 'method', 'status_code'],
    registry=registry
)

# ===== METRIC TRACKING FUNCTIONS =====

def track_conversion_metrics(func):
    """Decorator for automatic metrics collection"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        format_type = kwargs.get('output_format', 'unknown')
        if hasattr(format_type, 'value'):
            format_type = format_type.value
        
        compression = kwargs.get('compression', 'none')
        if hasattr(compression, 'value'):
            compression = compression.value
        
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
            if hasattr(result, 'parsing_stats') and result.parsing_stats:
                excel_rows_processed.labels(format=format_type).inc(
                    result.parsing_stats.total_rows_written
                )
            
            logger.info(f"Conversion successful: {format_type}, duration: {duration:.2f}s")
            return result
            
        except Exception as e:
            # Error metrics
            duration = time.time() - start_time
            excel_conversions_total.labels(
                status='error',
                format=format_type,
                compression=compression
            ).inc()
            
            excel_errors_total.labels(
                error_type=type(e).__name__,
                format=format_type
            ).inc()
            
            logger.error(f"Conversion failed: {format_type}, error: {e}, duration: {duration:.2f}s")
            raise
    
    return wrapper

def track_file_size(file_size: int, format_type: str):
    """Track uploaded file size"""
    excel_file_size_bytes.labels(format=format_type).observe(file_size)

def track_security_block(risk_level: str, reason: str):
    """Track security blocks"""
    excel_security_blocks.labels(
        risk_level=risk_level,
        reason=reason
    ).inc()

def track_api_request(endpoint: str, method: str, status_code: int):
    """Track API requests"""
    excel_api_requests.labels(
        endpoint=endpoint,
        method=method,
        status_code=status_code
    ).inc()

def update_worker_metrics(active_workers: int, queue_size: int):
    """Update worker and queue metrics"""
    excel_workers_active.set(active_workers)
    excel_queue_size.set(queue_size)

def track_memory_usage():
    """Track current memory usage"""
    try:
        process = psutil.Process()
        memory_bytes = process.memory_info().rss
        excel_memory_usage_bytes.set(memory_bytes)
    except Exception as e:
        logger.warning(f"Could not track memory usage: {e}")

def get_metrics() -> str:
    """Get all metrics in Prometheus format"""
    return generate_latest(registry).decode('utf-8')

# ===== METRICS ROUTER =====

metrics_router = APIRouter(prefix="/metrics", tags=["Observability"])

@metrics_router.get("")
async def prometheus_metrics():
    """
    Prometheus metrics endpoint
    Returns metrics in Prometheus format for scraping
    """
    try:
        # Update memory metrics before serving
        track_memory_usage()
        
        metrics_data = get_metrics()
        return Response(
            content=metrics_data,
            media_type="text/plain; version=0.0.4; charset=utf-8"
        )
    except Exception as e:
        logger.error(f"Error serving metrics: {e}")
        return Response(
            content=f"# Error serving metrics: {e}\n",
            media_type="text/plain",
            status_code=500
        )

@metrics_router.get("/health")
async def metrics_health():
    """Health check for metrics system"""
    try:
        # Test metrics collection
        test_counter = Counter('test_metric', 'Test metric', registry=registry)
        test_counter.inc()
        
        return {
            "status": "healthy",
            "metrics_registry": "active",
            "memory_tracking": "enabled" if psutil else "disabled"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }

# ===== WORKER METRICS COLLECTOR =====

class MetricsCollector:
    """Background metrics collector for worker stats"""
    
    def __init__(self, worker_pool=None):
        self.worker_pool = worker_pool
        self.running = False
        
    async def start_collecting(self):
        """Start collecting metrics in background"""
        self.running = True
        asyncio.create_task(self._collect_loop())
        logger.info("Metrics collector started")
        
    async def stop_collecting(self):
        """Stop collecting metrics"""
        self.running = False
        logger.info("Metrics collector stopped")
        
    async def _collect_loop(self):
        """Main collection loop"""
        while self.running:
            try:
                # Update memory metrics
                track_memory_usage()
                
                # Update worker metrics if worker pool available
                if self.worker_pool:
                    stats = self.worker_pool.get_stats()
                    update_worker_metrics(
                        stats.get('active_workers', 0),
                        stats.get('queue_size', 0)
                    )
                
            except Exception as e:
                logger.error(f"Error collecting metrics: {e}")
            
            await asyncio.sleep(10)  # Collect every 10 seconds

# Global metrics collector instance
metrics_collector = MetricsCollector()

# ===== MIDDLEWARE FOR API TRACKING =====

from fastapi import Request
from fastapi.responses import Response as FastAPIResponse
import time

async def metrics_middleware(request: Request, call_next):
    """Middleware to track API requests"""
    start_time = time.time()
    
    response = await call_next(request)
    
    # Track the request
    endpoint = request.url.path
    method = request.method
    status_code = response.status_code
    
    track_api_request(endpoint, method, status_code)
    
    # Add response time header
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    
    return response