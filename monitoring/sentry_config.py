"""
Sentry Configuration for Excel Converter
Production-ready error tracking and performance monitoring
"""

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.asyncio import AsyncioIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from sentry_sdk import configure_scope, capture_exception, capture_message
import os
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

def init_sentry():
    """Initialize Sentry for error tracking and performance monitoring"""
    
    sentry_dsn = os.getenv("SENTRY_DSN")
    if not sentry_dsn:
        logger.warning("⚠️ SENTRY_DSN not configured - error tracking disabled")
        return False
    
    try:
        sentry_sdk.init(
            dsn=sentry_dsn,
            integrations=[
                FastApiIntegration(
                    auto_enabling_integrations=False,
                    failed_request_status_codes=[400, 499, 500, 599]
                ),
                AsyncioIntegration(),
                LoggingIntegration(
                    level=logging.INFO,        # Capture info and above as breadcrumbs
                    event_level=logging.ERROR  # Send errors as events
                ),
            ],
            
            # Performance monitoring
            traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1")),
            
            # Error filtering
            before_send=filter_sensitive_errors,
            before_send_transaction=filter_sensitive_transactions,
            
            # Environment configuration
            environment=os.getenv("ENV", "development"),
            
            # Release tracking
            release=os.getenv("APP_VERSION", "unknown"),
            
            # Additional options
            attach_stacktrace=True,
            send_default_pii=False,  # Important: Don't send PII
            max_breadcrumbs=50,
            
            # Set custom tags
            _experiments={
                "profiles_sample_rate": 0.1,
            }
        )
        
        # Set global context
        with configure_scope() as scope:
            scope.set_tag("service", "excel-converter")
            scope.set_tag("component", "api")
            
        logger.info("✅ Sentry initialized successfully")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize Sentry: {e}")
        return False

def filter_sensitive_errors(event, hint):
    """Filter out sensitive information from Sentry events"""
    
    # Remove file contents from stack traces
    if 'exception' in event:
        for exception in event['exception']['values']:
            if 'stacktrace' in exception:
                for frame in exception['stacktrace']['frames']:
                    if 'vars' in frame:
                        # Filter sensitive variables
                        filtered_vars = {}
                        for key, value in frame['vars'].items():
                            if any(sensitive in key.lower() for sensitive in ['file', 'data', 'content', 'buffer', 'password', 'token']):
                                filtered_vars[key] = "[FILTERED]"
                            else:
                                filtered_vars[key] = value
                        frame['vars'] = filtered_vars
    
    # Filter request data
    if 'request' in event:
        if 'data' in event['request']:
            event['request']['data'] = "[FILTERED - FILE UPLOAD]"
        
        # Filter headers that might contain sensitive info
        if 'headers' in event['request']:
            sensitive_headers = ['authorization', 'cookie', 'x-api-key']
            for header in sensitive_headers:
                if header in event['request']['headers']:
                    event['request']['headers'][header] = "[FILTERED]"
    
    # Add custom context
    event.setdefault('tags', {}).update({
        'component': 'excel-converter',
        'filtered': True
    })
    
    return event

def filter_sensitive_transactions(event, hint):
    """Filter sensitive information from performance transactions"""
    
    # Remove file upload data from transaction context
    if 'contexts' in event:
        if 'trace' in event['contexts']:
            trace = event['contexts']['trace']
            if 'data' in trace:
                # Filter file data
                if any(key in trace['data'] for key in ['file', 'upload', 'content']):
                    trace['data'] = {"message": "[FILTERED - Contains file data]"}
    
    return event

# ===== CONTEXT MANAGERS =====

def track_conversion_context(file_info: Dict[str, Any], user_id: Optional[str] = None):
    """Add conversion context to Sentry scope"""
    with configure_scope() as scope:
        scope.set_tag("operation", "excel_conversion")
        scope.set_tag("file_format", file_info.get('format', 'unknown'))
        
        # Safe file context (no sensitive data)
        scope.set_context("file_info", {
            "sheets_count": file_info.get('sheets_count'),
            "total_rows": file_info.get('total_rows'),
            "file_size": file_info.get('file_size'),
            "has_macros": file_info.get('has_macros', False),
            "security_risk": file_info.get('security_risk_level', 'unknown')
        })
        
        if user_id:
            scope.set_user({"id": user_id})
        
        # Add breadcrumb
        sentry_sdk.add_breadcrumb(
            message="Excel conversion started",
            category="conversion",
            level="info",
            data={
                "format": file_info.get('format'),
                "file_size": file_info.get('file_size')
            }
        )

def track_worker_context(task_id: str, worker_name: str):
    """Add worker context to Sentry scope"""
    with configure_scope() as scope:
        scope.set_tag("component", "worker")
        scope.set_tag("worker_name", worker_name)
        scope.set_context("worker_info", {
            "task_id": task_id,
            "worker_name": worker_name
        })

def track_security_context(security_check: Dict[str, Any]):
    """Add security check context to Sentry"""
    with configure_scope() as scope:
        scope.set_tag("security_check", security_check.get('security_risk_level', 'unknown'))
        scope.set_context("security_info", {
            "risk_level": security_check.get('security_risk_level'),
            "has_macros": security_check.get('is_macro_enabled', False),
            "has_external_refs": security_check.get('has_external_references', False),
            "blocked": not security_check.get('allowed_to_process', True),
            "block_reason": security_check.get('blocked_reason')
        })

# ===== ERROR CAPTURE FUNCTIONS =====

def capture_conversion_error(error: Exception, context: Dict[str, Any]):
    """Capture conversion error with enriched context"""
    
    with configure_scope() as scope:
        scope.set_context("conversion_error", {
            "filename": context.get('filename', 'unknown'),
            "output_format": context.get('output_format'),
            "file_size": context.get('file_size'),
            "compression": context.get('compression'),
            "user_id": context.get('user_id'),
            "error_type": type(error).__name__
        })
        
        scope.set_tag("error_category", "conversion")
        scope.set_level("error")
        
        # Add breadcrumb
        sentry_sdk.add_breadcrumb(
            message="Conversion error occurred",
            category="error",
            level="error",
            data={"error_type": type(error).__name__}
        )
        
        capture_exception(error)

def capture_security_block(filename: str, security_check: Dict[str, Any]):
    """Capture security block event"""
    
    track_security_context(security_check)
    
    capture_message(
        f"File blocked due to security risk: {filename}",
        level="warning",
        extras={
            "filename": filename,
            "risk_level": security_check.get('security_risk_level'),
            "block_reason": security_check.get('blocked_reason')
        }
    )

def capture_worker_error(task_id: str, worker_name: str, error: Exception, context: Dict[str, Any]):
    """Capture worker processing error"""
    
    track_worker_context(task_id, worker_name)
    
    with configure_scope() as scope:
        scope.set_context("worker_error", context)
        scope.set_tag("error_category", "worker")
        
        capture_exception(error)

def capture_performance_issue(operation: str, duration: float, threshold: float, context: Dict[str, Any]):
    """Capture performance issues"""
    
    if duration > threshold:
        capture_message(
            f"Performance issue detected: {operation} took {duration:.2f}s (threshold: {threshold}s)",
            level="warning",
            extras={
                "operation": operation,
                "duration": duration,
                "threshold": threshold,
                "context": context
            }
        )

# ===== DECORATORS =====

def sentry_trace_conversion(func):
    """Decorator to trace conversion functions with Sentry"""
    from functools import wraps
    
    @wraps(func)
    async def wrapper(*args, **kwargs):
        with sentry_sdk.start_transaction(
            op="excel_conversion",
            name=f"convert_{kwargs.get('output_format', 'unknown')}"
        ) as transaction:
            
            # Add conversion context
            file_info = kwargs.get('file_info', {})
            transaction.set_tag("format", kwargs.get('output_format', 'unknown'))
            transaction.set_tag("compression", kwargs.get('compression', 'none'))
            
            try:
                result = await func(*args, **kwargs)
                transaction.set_data("success", True)
                return result
            except Exception as e:
                transaction.set_data("error", str(e))
                transaction.set_status("internal_error")
                raise
    
    return wrapper

# ===== HEALTH CHECK =====

def sentry_health_check() -> Dict[str, Any]:
    """Check Sentry health status"""
    
    try:
        # Test Sentry connection by sending a test event
        capture_message("Sentry health check", level="info")
        
        return {
            "status": "healthy",
            "dsn_configured": bool(os.getenv("SENTRY_DSN")),
            "environment": os.getenv("ENV", "development"),
            "release": os.getenv("APP_VERSION", "unknown")
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "dsn_configured": bool(os.getenv("SENTRY_DSN"))
        }

# ===== INITIALIZATION =====

def setup_sentry_logging():
    """Setup Sentry logging configuration"""
    
    # Configure Python logging to work well with Sentry
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Reduce noise from third-party libraries
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("requests").setLevel(logging.WARNING)
    logging.getLogger("docker").setLevel(logging.WARNING)
    
    logger.info("Sentry logging configured")

# Auto-initialize if DSN is available
if os.getenv("SENTRY_DSN"):
    setup_sentry_logging()
    init_sentry()