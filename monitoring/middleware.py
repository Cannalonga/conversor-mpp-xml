"""
FastAPI Monitoring Middleware
Integrates Prometheus metrics and Sentry tracing into Excel Converter API
"""

import time
from typing import Optional, Dict, Any, Callable
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.base import BaseHTTPMiddleware
from starlette.middleware.base import RequestResponseEndpoint
import logging
import asyncio
from datetime import datetime

from .metrics import (
    REQUEST_COUNT, REQUEST_DURATION, REQUEST_SIZE, RESPONSE_SIZE,
    CONVERSION_COUNT, CONVERSION_DURATION, CONVERSION_ERRORS, ACTIVE_CONVERSIONS,
    track_system_resources, conversion_metrics
)
from .sentry_config import (
    track_conversion_context, capture_conversion_error, 
    capture_performance_issue, sentry_trace_conversion
)

logger = logging.getLogger(__name__)

class PrometheusMiddleware(BaseHTTPMiddleware):
    """
    Prometheus metrics collection middleware for FastAPI
    Tracks all HTTP requests, responses, and performance metrics
    """
    
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Start timing
        start_time = time.time()
        
        # Extract request info
        method = request.method
        endpoint = request.url.path
        
        # Handle route parameters for better grouping
        if endpoint.startswith("/api/excel/convert"):
            endpoint = "/api/excel/convert/{format}"
        elif "/files/" in endpoint:
            endpoint = "/api/files/{operation}"
        
        # Track request size
        request_size = 0
        if hasattr(request, 'headers'):
            content_length = request.headers.get('content-length')
            if content_length:
                request_size = int(content_length)
        
        # Label for metrics
        labels = {
            'method': method,
            'endpoint': endpoint,
            'status': None  # Will be set after response
        }
        
        try:
            # Process request
            response = await call_next(request)
            
            # Calculate metrics
            duration = time.time() - start_time
            response_size = 0
            
            # Get response size if available
            if hasattr(response, 'headers'):
                content_length = response.headers.get('content-length')
                if content_length:
                    response_size = int(content_length)
            
            # Update labels with response status
            labels['status'] = str(response.status_code)
            status_class = f"{response.status_code // 100}xx"
            
            # Record metrics
            REQUEST_COUNT.labels(**labels).inc()
            REQUEST_DURATION.labels(**labels).observe(duration)
            
            if request_size > 0:
                REQUEST_SIZE.labels(**labels).observe(request_size)
            
            if response_size > 0:
                RESPONSE_SIZE.labels(**labels).observe(response_size)
            
            # Log slow requests
            if duration > 5.0:  # 5 seconds threshold
                logger.warning(f"Slow request: {method} {endpoint} took {duration:.2f}s")
                
                # Report to Sentry if available
                try:
                    from .sentry_config import capture_performance_issue
                    capture_performance_issue(
                        operation=f"{method} {endpoint}",
                        duration=duration,
                        threshold=5.0,
                        context={
                            'request_size': request_size,
                            'response_size': response_size,
                            'status_code': response.status_code
                        }
                    )
                except ImportError:
                    pass
            
            return response
            
        except Exception as e:
            # Calculate duration for failed requests
            duration = time.time() - start_time
            
            # Determine status code
            status_code = 500
            if isinstance(e, HTTPException):
                status_code = e.status_code
            
            labels['status'] = str(status_code)
            
            # Record metrics for errors
            REQUEST_COUNT.labels(**labels).inc()
            REQUEST_DURATION.labels(**labels).observe(duration)
            
            logger.error(f"Request failed: {method} {endpoint} - {str(e)}")
            
            # Re-raise the exception
            raise

class ConversionTrackingMiddleware(BaseHTTPMiddleware):
    """
    Specialized middleware for tracking Excel conversion operations
    Provides detailed metrics for file processing workflows
    """
    
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Only track conversion endpoints
        if not request.url.path.startswith("/api/excel"):
            return await call_next(request)
        
        # Extract conversion info from request
        conversion_info = await self._extract_conversion_info(request)
        
        if conversion_info:
            # Start conversion tracking
            with ACTIVE_CONVERSIONS.track_inprogress():
                return await self._track_conversion(request, call_next, conversion_info)
        else:
            return await call_next(request)
    
    async def _extract_conversion_info(self, request: Request) -> Optional[Dict[str, Any]]:
        """Extract conversion information from request"""
        
        if request.method != "POST":
            return None
        
        # Extract format from URL path
        path_parts = request.url.path.split('/')
        output_format = "unknown"
        
        if len(path_parts) >= 4 and path_parts[3] == "convert":
            if len(path_parts) >= 5:
                output_format = path_parts[4]
        
        # Extract query parameters
        query_params = dict(request.query_params)
        
        return {
            'output_format': output_format,
            'compression': query_params.get('compression', 'none'),
            'sheet_names': query_params.get('sheet_names', ''),
            'row_limit': query_params.get('row_limit'),
            'include_empty': query_params.get('include_empty', 'false') == 'true',
            'request_time': datetime.utcnow(),
            'client_ip': request.client.host if request.client else 'unknown'
        }
    
    async def _track_conversion(self, request: Request, call_next: RequestResponseEndpoint, 
                              conversion_info: Dict[str, Any]) -> Response:
        """Track a conversion operation with detailed metrics"""
        
        start_time = time.time()
        output_format = conversion_info['output_format']
        compression = conversion_info['compression']
        
        # Create labels for conversion metrics
        conversion_labels = {
            'format': output_format,
            'compression': compression,
            'status': None  # Will be set based on response
        }
        
        try:
            # Add Sentry context if available
            try:
                track_conversion_context(conversion_info)
            except ImportError:
                pass
            
            # Process the request
            response = await call_next(request)
            
            # Calculate metrics
            duration = time.time() - start_time
            success = 200 <= response.status_code < 300
            
            # Update labels
            conversion_labels['status'] = 'success' if success else 'error'
            
            # Record conversion metrics
            CONVERSION_COUNT.labels(**conversion_labels).inc()
            CONVERSION_DURATION.labels(**conversion_labels).observe(duration)
            
            # Log conversion completion
            if success:
                logger.info(f"✅ Conversion completed: {output_format} in {duration:.2f}s")
            else:
                logger.warning(f"⚠️ Conversion failed: {output_format} - Status {response.status_code}")
                CONVERSION_ERRORS.labels(
                    format=output_format,
                    error_type=f"http_{response.status_code}"
                ).inc()
            
            return response
            
        except Exception as e:
            # Record conversion error
            duration = time.time() - start_time
            error_type = type(e).__name__
            
            conversion_labels['status'] = 'error'
            
            CONVERSION_COUNT.labels(**conversion_labels).inc()
            CONVERSION_DURATION.labels(**conversion_labels).observe(duration)
            CONVERSION_ERRORS.labels(
                format=output_format,
                error_type=error_type
            ).inc()
            
            logger.error(f"❌ Conversion error: {output_format} - {error_type}: {str(e)}")
            
            # Report to Sentry if available
            try:
                capture_conversion_error(e, conversion_info)
            except ImportError:
                pass
            
            raise

class HealthCheckMiddleware(BaseHTTPMiddleware):
    """
    Middleware to track application health and resource usage
    Updates system metrics and provides health check data
    """
    
    def __init__(self, app: FastAPI, update_interval: float = 30.0):
        super().__init__(app)
        self.update_interval = update_interval
        self.last_update = 0
        self._health_task = None
    
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Update system metrics periodically
        current_time = time.time()
        if current_time - self.last_update > self.update_interval:
            asyncio.create_task(self._update_system_metrics())
            self.last_update = current_time
        
        return await call_next(request)
    
    async def _update_system_metrics(self):
        """Update system resource metrics"""
        try:
            track_system_resources()
        except Exception as e:
            logger.error(f"Failed to update system metrics: {e}")

# ===== MIDDLEWARE SETUP FUNCTIONS =====

def setup_monitoring_middleware(app: FastAPI, 
                               enable_prometheus: bool = True,
                               enable_conversion_tracking: bool = True,
                               enable_health_tracking: bool = True,
                               system_metrics_interval: float = 30.0):
    """
    Setup all monitoring middleware for the FastAPI application
    
    Args:
        app: FastAPI application instance
        enable_prometheus: Enable Prometheus metrics collection
        enable_conversion_tracking: Enable detailed conversion tracking
        enable_health_tracking: Enable health and resource monitoring
        system_metrics_interval: Interval for system metrics updates (seconds)
    """
    
    logger.info("🔧 Setting up monitoring middleware...")
    
    # Add middlewares in reverse order (FastAPI processes them in LIFO order)
    
    if enable_health_tracking:
        app.add_middleware(HealthCheckMiddleware, update_interval=system_metrics_interval)
        logger.info("✅ Health check middleware enabled")
    
    if enable_conversion_tracking:
        app.add_middleware(ConversionTrackingMiddleware)
        logger.info("✅ Conversion tracking middleware enabled")
    
    if enable_prometheus:
        app.add_middleware(PrometheusMiddleware)
        logger.info("✅ Prometheus metrics middleware enabled")
    
    logger.info("🎯 All monitoring middleware configured successfully")

# ===== CONTEXT MANAGERS =====

class ConversionMetricsContext:
    """Context manager for tracking conversion operations"""
    
    def __init__(self, output_format: str, compression: str = "none"):
        self.output_format = output_format
        self.compression = compression
        self.start_time = None
        self.labels = {
            'format': output_format,
            'compression': compression,
            'status': None
        }
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = time.time() - self.start_time
        
        if exc_type is None:
            # Success
            self.labels['status'] = 'success'
            CONVERSION_COUNT.labels(**self.labels).inc()
            CONVERSION_DURATION.labels(**self.labels).observe(duration)
        else:
            # Error
            self.labels['status'] = 'error'
            error_type = exc_type.__name__ if exc_type else 'unknown'
            
            CONVERSION_COUNT.labels(**self.labels).inc()
            CONVERSION_DURATION.labels(**self.labels).observe(duration)
            CONVERSION_ERRORS.labels(
                format=self.output_format,
                error_type=error_type
            ).inc()

# ===== UTILITY FUNCTIONS =====

def get_middleware_status() -> Dict[str, Any]:
    """Get status of all monitoring middleware components"""
    
    return {
        "prometheus_metrics": {
            "enabled": True,
            "metrics_count": len([
                REQUEST_COUNT, REQUEST_DURATION, REQUEST_SIZE, RESPONSE_SIZE,
                CONVERSION_COUNT, CONVERSION_DURATION, CONVERSION_ERRORS, ACTIVE_CONVERSIONS
            ])
        },
        "conversion_tracking": {
            "enabled": True,
            "tracked_formats": ["csv", "json", "xml", "tsv", "parquet"]
        },
        "sentry_integration": {
            "enabled": True,  # Will be dynamic based on configuration
            "error_filtering": True,
            "performance_monitoring": True
        },
        "health_monitoring": {
            "enabled": True,
            "system_metrics": True,
            "resource_tracking": True
        }
    }

# ===== DECORATOR FOR MANUAL TRACKING =====

def track_conversion_operation(output_format: str, compression: str = "none"):
    """
    Decorator for manually tracking conversion operations
    Use this for background tasks or non-HTTP operations
    """
    def decorator(func: Callable):
        async def wrapper(*args, **kwargs):
            with ConversionMetricsContext(output_format, compression):
                return await func(*args, **kwargs)
        return wrapper
    return decorator