"""
FastAPI Main Application - Simplified
PDF Converter API sem dependências externas
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
import logging
import os
import tempfile
import json
from datetime import datetime
from pathlib import Path
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("main")

# Create FastAPI app
app = FastAPI(
    title="PDF Converter API",
    description="PDF Text Extraction Service",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """API Root endpoint with HTML landing page"""
    
    html_content = """
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PDF Converter API</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
            }
            .container {
                max-width: 800px;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 20px;
                padding: 40px;
                text-align: center;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
            }
            h1 {
                font-size: 3rem;
                margin-bottom: 20px;
                background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            .subtitle {
                font-size: 1.2rem;
                margin-bottom: 40px;
                opacity: 0.9;
            }
            .status {
                display: inline-block;
                background: #28a745;
                padding: 8px 16px;
                border-radius: 25px;
                margin-bottom: 30px;
                font-weight: bold;
            }
            .endpoints {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin: 30px 0;
            }
            .endpoint {
                background: rgba(255, 255, 255, 0.15);
                border-radius: 15px;
                padding: 20px;
                transition: transform 0.3s ease;
            }
            .endpoint:hover {
                transform: translateY(-5px);
            }
            .endpoint h3 {
                color: #ff6b6b;
                margin-bottom: 10px;
            }
            .endpoint a {
                color: #4ecdc4;
                text-decoration: none;
                font-weight: bold;
            }
            .endpoint a:hover {
                text-decoration: underline;
            }
            .pricing {
                background: rgba(255, 215, 0, 0.2);
                border-radius: 15px;
                padding: 20px;
                margin: 30px 0;
            }
            .price {
                font-size: 2rem;
                font-weight: bold;
                color: #ffd700;
            }
            .features {
                display: flex;
                justify-content: space-around;
                margin: 30px 0;
                flex-wrap: wrap;
                gap: 20px;
            }
            .feature {
                flex: 1;
                min-width: 200px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                padding: 15px;
            }
            .emoji {
                font-size: 2rem;
                margin-bottom: 10px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📄 PDF Converter API</h1>
            <p class="subtitle">Extração de texto de PDFs com tecnologia profissional</p>
            
            <div class="status">✅ API Online</div>
            
            <div class="pricing">
                <h3>💰 Preço por Conversão</h3>
                <div class="price">R$ 3,00</div>
                <p>Valor justo para conversão profissional</p>
            </div>
            
            <div class="endpoints">
                <div class="endpoint">
                    <h3>🔍 Health Check</h3>
                    <p>Verificar status da API</p>
                    <a href="/health" target="_blank">GET /health</a>
                </div>
                
                <div class="endpoint">
                    <h3>📚 Documentação</h3>
                    <p>API interativa Swagger</p>
                    <a href="/docs" target="_blank">GET /docs</a>
                </div>
                
                <div class="endpoint">
                    <h3>🔄 Conversão</h3>
                    <p>Converter PDF para texto</p>
                    <a href="/docs#/default/convert_pdf_to_text_api_convert_pdf_text_post" target="_blank">POST /api/convert/pdf/text</a>
                </div>
                
                <div class="endpoint">
                    <h3>📊 Estatísticas</h3>
                    <p>Informações da API</p>
                    <a href="/api/stats" target="_blank">GET /api/stats</a>
                </div>
            </div>
            
            <div class="features">
                <div class="feature">
                    <div class="emoji">⚡</div>
                    <h4>Rápido</h4>
                    <p>Processamento em segundos</p>
                </div>
                
                <div class="feature">
                    <div class="emoji">🔒</div>
                    <h4>Seguro</h4>
                    <p>Arquivos processados com segurança</p>
                </div>
                
                <div class="feature">
                    <div class="emoji">🎯</div>
                    <h4>Preciso</h4>
                    <p>Extração de texto de alta qualidade</p>
                </div>
            </div>
            
            <p style="margin-top: 30px; opacity: 0.8;">
                <strong>Versão:</strong> 1.0.0 | 
                <strong>Limite:</strong> 40MB por arquivo | 
                <strong>Formatos:</strong> PDF
            </p>
        </div>
    </body>
    </html>
    """
    
    return HTMLResponse(content=html_content)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        health_status = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "api": "✅ Running"
            }
        }
        
        # Check PDF converter
        try:
            sys.path.insert(0, '/app')
            from app.converters.pdf_extract_text import extract_text_from_pdf
            health_status["services"]["pdf_converter"] = "✅ Available"
        except ImportError as e:
            health_status["services"]["pdf_converter"] = f"❌ Error: {e}"
            health_status["status"] = "degraded"
        
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

@app.post("/api/convert/pdf/text")
async def convert_pdf_to_text(file: UploadFile = File(...)):
    """Convert PDF to text - simplified version"""
    try:
        # Validações básicas
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Arquivo precisa ser PDF")

        # Ler arquivo
        content = await file.read()
        if len(content) > 40 * 1024 * 1024:  # 40MB limit
            raise HTTPException(status_code=413, detail="Arquivo PDF muito grande")

        # Salvar temporariamente
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
            tmp_file.write(content)
            tmp_path = tmp_file.name

        try:
            # Importar conversor
            sys.path.insert(0, '/app')
            from app.converters.pdf_extract_text import extract_text_from_pdf
            
            # Extrair texto
            success, result = extract_text_from_pdf(tmp_path)
            
            if success:
                # Gerar ID único
                from uuid import uuid4
                conversion_id = str(uuid4())[:8]
                
                return JSONResponse({
                    "success": True,
                    "conversion_id": conversion_id,
                    "filename": file.filename,
                    "file_size": len(content),
                    "text_length": len(result),
                    "extracted_text": result,
                    "price": "R$ 3,00",
                    "message": "PDF convertido com sucesso",
                    "timestamp": datetime.utcnow().isoformat()
                })
            else:
                raise HTTPException(status_code=422, detail=f"Falha na conversão: {result}")
                
        finally:
            # Cleanup
            os.unlink(tmp_path)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro na conversão: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@app.get("/api/stats")
async def get_stats():
    """API statistics"""
    return {
        "api_version": "1.0.0",
        "supported_formats": ["PDF"],
        "max_file_size": "40MB",
        "pricing": {
            "pdf_text_extraction": "R$ 3,00"
        },
        "features": [
            "PDF text extraction",
            "File validation", 
            "Size limits",
            "Mock processing"
        ]
    }

# Startup event
@app.on_event("startup")
async def startup_event():
    """Application startup"""
    logger.info("🚀 PDF Converter API Starting...")
    
    # Check dependencies
    try:
        sys.path.insert(0, '/app')
        from app.converters.pdf_extract_text import extract_text_from_pdf
        logger.info("✅ PDF converter available")
    except ImportError as e:
        logger.warning(f"⚠️ PDF converter import failed: {e}")
    
    logger.info("🎉 PDF Converter API Ready on port 8000!")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)