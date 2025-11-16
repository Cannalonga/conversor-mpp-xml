"""
FastAPI Main Application
Enterprise Multi-Format Converter Platform
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import os
from datetime import datetime

# Import routers
from app.routers.convert_pdf import router as pdf_router
from converters.excel.api import router as excel_router
# from app.routers.image import router as image_router  # Future import
# from app.routers.office import router as office_router  # Future import

# Import monitoring components
try:
    from monitoring.middleware import setup_monitoring_middleware
    from monitoring.metrics import metrics_router
    from monitoring.sentry_config import init_sentry, setup_sentry_logging
    MONITORING_AVAILABLE = True
except ImportError as e:
    logging.warning(f"⚠️ Monitoring not available: {e}")
    MONITORING_AVAILABLE = False

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("main")

# Initialize Sentry error tracking (if available)
if MONITORING_AVAILABLE:
    setup_sentry_logging()
    sentry_initialized = init_sentry()
    logger.info("🔍 Monitoring and error tracking initialized")
else:
    logger.info("📊 Running without advanced monitoring")

# Create FastAPI app
app = FastAPI(
    title="Conversor Enterprise API",
    description="Multi-format file conversion platform with PDF, Office, and Image processing + Enterprise Monitoring",
    version="4.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup monitoring middleware (if available)
if MONITORING_AVAILABLE:
    setup_monitoring_middleware(
        app,
        enable_prometheus=True,
        enable_conversion_tracking=True,
        enable_health_tracking=True,
        system_metrics_interval=30.0
    )
    logger.info("📈 Prometheus metrics and conversion tracking enabled")

# Include monitoring endpoints
if MONITORING_AVAILABLE:
    app.include_router(metrics_router, prefix="/monitoring", tags=["Monitoring"])

# Include routers
app.include_router(pdf_router, prefix="/api", tags=["PDF Conversion"])
app.include_router(excel_router, prefix="/api", tags=["Excel Conversion"])
# app.include_router(image_router, prefix="/api", tags=["Image Conversion"])  # Future
# app.include_router(office_router, prefix="/api", tags=["Office Conversion"])  # Future

@app.get("/")
async def root():
    """API Root endpoint"""
    return {
        "message": "Conversor Enterprise API",
        "version": "4.0.0",
        "status": "active",
        "converters": {
            "pdf": "✅ PDF → Text extraction",
            "excel": "✅ Excel → CSV/JSON/XML/TSV/Parquet conversion with enterprise monitoring",
            "mpp": "✅ MPP → XML conversion", 
            "office": "🔄 Office formats (coming soon)",
            "image": "🔄 Image processing (coming soon)"
        },
        "monitoring": {
            "prometheus_metrics": "✅ Available" if MONITORING_AVAILABLE else "❌ Not available",
            "sentry_tracking": "✅ Available" if MONITORING_AVAILABLE else "❌ Not available",
            "performance_monitoring": "✅ Available" if MONITORING_AVAILABLE else "❌ Not available"
        },
        "endpoints": {
            "docs": "/docs",
            "health": "/health",
            "metrics": "/monitoring/metrics" if MONITORING_AVAILABLE else "Not available",
            "health_detailed": "/monitoring/health" if MONITORING_AVAILABLE else "Not available",
            "pdf_text": "/api/convert/pdf/text",
            "excel_convert": "/api/excel/convert",
            "excel_formats": "/api/excel/formats"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check system health
        health_status = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "api": "✅ Running",
                "pdf_converter": "✅ Available"
            }
        }
        
        # Check PDF converter
        try:
            from app.converters.pdf_extract_text import extract_text_from_pdf
            health_status["services"]["pdf_converter"] = "✅ PyPDF2 Available"
        except ImportError:
            health_status["services"]["pdf_converter"] = "❌ PyPDF2 Missing"
            health_status["status"] = "degraded"
        
        # Check Celery (optional)
        try:
            from app.tasks.pdf_tasks import convert_pdf_text
            health_status["services"]["worker"] = "✅ Celery Ready"
        except Exception:
            health_status["services"]["worker"] = "⚠️ Celery Not Ready"
        
        return JSONResponse(health_status)
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            },
            status_code=503
        )

@app.get("/stats")
async def get_api_stats():
    """API usage statistics"""
    return {
        "total_conversions": 0,  # TODO: Get from database
        "active_workers": 1,
        "supported_formats": {
            "pdf": ["pdf → txt"],
            "excel": ["xlsx → csv", "xlsx → json", "xlsx → xml", "csv → json"],
            "office": ["docx", "xlsx", "pptx"],  # Future
            "image": ["png", "jpg", "webp"]      # Future
        },
        "pricing": {
            "pdf_text": 3.00,
            "excel_convert": 5.00,
            "office_basic": 3.00,
            "image_basic": 2.00
        }
    }

@app.exception_handler(404)
async def not_found_handler(request, exc):
    """Custom 404 handler"""
    return JSONResponse(
        {
            "error": "Endpoint not found",
            "message": "Check /docs for available endpoints",
            "available_endpoints": [
                "/",
                "/health", 
                "/stats",
                "/api/convert/pdf/text",
                "/api/excel/convert",
                "/api/excel/formats"
            ]
        },
        status_code=404
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    """Custom 500 handler"""
    logger.error(f"Internal server error: {exc}")
    return JSONResponse(
        {
            "error": "Internal server error",
            "message": "Please try again later or contact support"
        },
        status_code=500
    )

# Startup event
@app.on_event("startup")
async def startup_event():
    """Application startup"""
    logger.info("🚀 Conversor Enterprise API Starting...")
    logger.info(f"📁 Working directory: {os.getcwd()}")
    
    # Check critical dependencies
    try:
        import PyPDF2
        logger.info("✅ PyPDF2 available for PDF processing")
    except ImportError:
        logger.warning("⚠️ PyPDF2 not available - PDF conversion will fail")
    
    # Initialize Excel worker pool
    try:
        from converters.excel.worker import get_worker_pool
        await get_worker_pool()
        logger.info("✅ Excel worker pool initialized")
    except Exception as e:
        logger.warning(f"⚠️ Excel worker pool failed to initialize: {e}")
    
    logger.info("🎉 Conversor Enterprise API Ready!")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown"""
    logger.info("🛑 Conversor Enterprise API Shutting down...")
    
    # Shutdown Excel worker pool
    try:
        from converters.excel.worker import shutdown_worker_pool
        await shutdown_worker_pool()
        logger.info("✅ Excel worker pool shutdown")
    except Exception as e:
        logger.warning(f"⚠️ Excel worker pool shutdown failed: {e}")

if __name__ == "__main__":
    import uvicorn
    
    # Run development server
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )