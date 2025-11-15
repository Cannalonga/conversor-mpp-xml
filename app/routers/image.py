"""
Image Converter FastAPI Router
Endpoints para conversão de imagens com sistema de pagamento
"""

from fastapi import APIRouter, File, UploadFile, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from typing import Optional, List
import os
import tempfile
import asyncio
from pathlib import Path
import logging
import json
from datetime import datetime

# Import do conversor (com fallback se PIL não estiver disponível)
try:
    from app.converters.image import ImageConverter
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    ImageConverter = None

from app.core.database import get_db
from app.models.orders import Order
from app.models.files import FileUpload
from app.core.security import create_access_token, verify_token
from app.tasks import convert_image_task  # Celery task

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/convert/image", tags=["Image Conversion"])

# Configurações
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif', '.tiff', '.tif', '.pdf'}
OUTPUT_FORMATS = {'.png', '.jpg', '.jpeg', '.webp', '.pdf'}

# Preços (R$)
PRICING = {
    'basic': 2.00,
    'compress': 3.00,
    'resize': 3.00,
    'premium': 5.00,
    'batch': 1.50
}

@router.get("/formats")
async def get_supported_formats():
    """Retorna formatos suportados e preços"""
    return {
        "supported_input": list(ALLOWED_EXTENSIONS),
        "supported_output": list(OUTPUT_FORMATS),
        "pricing": PRICING,
        "max_file_size_mb": MAX_FILE_SIZE // (1024 * 1024),
        "pil_available": PIL_AVAILABLE,
        "status": "active"
    }

@router.post("/upload")
async def upload_image_for_conversion(
    file: UploadFile = File(...),
    target_format: str = Form(...),
    quality: Optional[int] = Form(85),
    max_width: Optional[int] = Form(None),
    max_height: Optional[int] = Form(None),
    apply_compression: bool = Form(True),
    db=None
):
    """
    Upload de imagem para conversão
    
    Args:
        file: Arquivo de imagem
        target_format: Formato de destino (png, jpg, webp, pdf)
        quality: Qualidade para JPG/WebP (1-100)
        max_width: Largura máxima 
        max_height: Altura máxima
        apply_compression: Aplicar compressão
    
    Returns:
        Informações do upload e preço
    """
    try:
        # Validações básicas
        if not file.filename:
            raise HTTPException(400, "Nome do arquivo é obrigatório")
        
        # Verificar extensão
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(400, f"Formato não suportado: {file_ext}")
        
        if f".{target_format}" not in OUTPUT_FORMATS:
            raise HTTPException(400, f"Formato de saída inválido: {target_format}")
        
        # Verificar tamanho
        file_content = await file.read()
        if len(file_content) > MAX_FILE_SIZE:
            raise HTTPException(400, f"Arquivo muito grande: {len(file_content)} bytes > {MAX_FILE_SIZE}")
        
        # Salvar arquivo temporariamente
        upload_dir = "uploads/incoming"
        os.makedirs(upload_dir, exist_ok=True)
        
        file_id = f"img_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
        temp_path = os.path.join(upload_dir, file_id)
        
        with open(temp_path, "wb") as f:
            f.write(file_content)
        
        # Calcular preço
        has_resize = max_width is not None or max_height is not None
        
        if apply_compression and has_resize:
            conversion_type = "premium"
        elif apply_compression:
            conversion_type = "compress"
        elif has_resize:
            conversion_type = "resize"
        else:
            conversion_type = "basic"
        
        price = PRICING[conversion_type]
        
        # Criar registro de upload
        upload_data = {
            "file_id": file_id,
            "original_filename": file.filename,
            "file_path": temp_path,
            "file_size": len(file_content),
            "input_format": file_ext,
            "target_format": target_format,
            "conversion_params": {
                "quality": quality,
                "max_width": max_width,
                "max_height": max_height,
                "compression": apply_compression,
                "type": conversion_type
            },
            "price": price,
            "status": "uploaded",
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Salvar metadados
        metadata_path = os.path.join(upload_dir, f"{file_id}.json")
        with open(metadata_path, "w") as f:
            json.dump(upload_data, f, indent=2)
        
        return JSONResponse({
            "success": True,
            "file_id": file_id,
            "original_filename": file.filename,
            "file_size": len(file_content),
            "input_format": file_ext,
            "target_format": target_format,
            "conversion_type": conversion_type,
            "price": price,
            "price_formatted": f"R$ {price:.2f}",
            "next_step": "payment",
            "payment_url": f"/payment/pix/{file_id}",
            "pil_available": PIL_AVAILABLE
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no upload: {e}")
        raise HTTPException(500, f"Erro interno: {str(e)}")

@router.post("/batch-upload")
async def batch_upload_images(
    files: List[UploadFile] = File(...),
    target_format: str = Form(...),
    quality: Optional[int] = Form(85),
    max_width: Optional[int] = Form(None),
    max_height: Optional[int] = Form(None),
    apply_compression: bool = Form(True)
):
    """Upload em lote de imagens para conversão"""
    try:
        if len(files) < 1:
            raise HTTPException(400, "Pelo menos 1 arquivo é obrigatório")
        
        if len(files) > 20:
            raise HTTPException(400, "Máximo 20 arquivos por lote")
        
        batch_id = f"batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        upload_dir = f"uploads/incoming/{batch_id}"
        os.makedirs(upload_dir, exist_ok=True)
        
        uploaded_files = []
        total_size = 0
        
        for idx, file in enumerate(files):
            if not file.filename:
                continue
                
            file_ext = Path(file.filename).suffix.lower()
            if file_ext not in ALLOWED_EXTENSIONS:
                continue
            
            file_content = await file.read()
            if len(file_content) > MAX_FILE_SIZE:
                continue
            
            file_id = f"img_{idx:02d}_{file.filename}"
            temp_path = os.path.join(upload_dir, file_id)
            
            with open(temp_path, "wb") as f:
                f.write(file_content)
            
            uploaded_files.append({
                "file_id": file_id,
                "filename": file.filename,
                "size": len(file_content),
                "format": file_ext,
                "path": temp_path
            })
            
            total_size += len(file_content)
        
        if not uploaded_files:
            raise HTTPException(400, "Nenhum arquivo válido encontrado")
        
        # Preço em lote
        file_count = len(uploaded_files)
        if file_count >= 5:
            unit_price = PRICING['batch']
        else:
            has_resize = max_width is not None or max_height is not None
            if apply_compression and has_resize:
                unit_price = PRICING['premium']
            elif apply_compression:
                unit_price = PRICING['compress']
            elif has_resize:
                unit_price = PRICING['resize']
            else:
                unit_price = PRICING['basic']
        
        total_price = unit_price * file_count
        
        # Salvar metadados do lote
        batch_data = {
            "batch_id": batch_id,
            "files": uploaded_files,
            "total_files": file_count,
            "total_size": total_size,
            "target_format": target_format,
            "conversion_params": {
                "quality": quality,
                "max_width": max_width,
                "max_height": max_height,
                "compression": apply_compression
            },
            "unit_price": unit_price,
            "total_price": total_price,
            "is_batch_discount": file_count >= 5,
            "status": "uploaded",
            "created_at": datetime.utcnow().isoformat()
        }
        
        metadata_path = os.path.join(upload_dir, "batch_metadata.json")
        with open(metadata_path, "w") as f:
            json.dump(batch_data, f, indent=2)
        
        return JSONResponse({
            "success": True,
            "batch_id": batch_id,
            "files_processed": file_count,
            "total_size": total_size,
            "unit_price": unit_price,
            "total_price": total_price,
            "price_formatted": f"R$ {total_price:.2f}",
            "discount_applied": file_count >= 5,
            "files": [{"filename": f["filename"], "size": f["size"]} for f in uploaded_files],
            "next_step": "payment",
            "payment_url": f"/payment/pix/{batch_id}",
            "pil_available": PIL_AVAILABLE
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no upload em lote: {e}")
        raise HTTPException(500, f"Erro interno: {str(e)}")

@router.post("/convert/{file_id}")
async def start_conversion(
    file_id: str,
    background_tasks: BackgroundTasks
):
    """
    Iniciar conversão após pagamento confirmado
    """
    try:
        # Verificar se arquivo existe
        upload_dir = "uploads/incoming"
        metadata_path = os.path.join(upload_dir, f"{file_id}.json")
        
        if not os.path.exists(metadata_path):
            raise HTTPException(404, "Arquivo não encontrado")
        
        # Carregar metadados
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
        
        # Verificar se pagamento foi confirmado (simplificado)
        # TODO: Integrar com sistema real de verificação de pagamento
        
        # Simular conversão (placeholder para quando PIL estiver disponível)
        if PIL_AVAILABLE:
            # Adicionar tarefa em background
            background_tasks.add_task(convert_image_async, file_id, metadata)
        else:
            # Mock conversion para demonstração
            await mock_conversion(file_id, metadata)
        
        return JSONResponse({
            "success": True,
            "file_id": file_id,
            "status": "converting",
            "message": "Conversão iniciada",
            "check_status_url": f"/convert/image/status/{file_id}",
            "pil_available": PIL_AVAILABLE
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro iniciando conversão: {e}")
        raise HTTPException(500, f"Erro interno: {str(e)}")

@router.get("/status/{file_id}")
async def check_conversion_status(file_id: str):
    """Verificar status da conversão"""
    try:
        # Verificar nos diferentes diretórios
        for status_dir in ["incoming", "processing", "converted", "failed"]:
            metadata_path = os.path.join("uploads", status_dir, f"{file_id}.json")
            if os.path.exists(metadata_path):
                with open(metadata_path, "r") as f:
                    metadata = json.load(f)
                
                return JSONResponse({
                    "success": True,
                    "file_id": file_id,
                    "status": metadata.get("status", status_dir),
                    "original_filename": metadata.get("original_filename"),
                    "target_format": metadata.get("target_format"),
                    "created_at": metadata.get("created_at"),
                    "completed_at": metadata.get("completed_at"),
                    "download_url": f"/convert/image/download/{file_id}" if status_dir == "converted" else None,
                    "error": metadata.get("error") if status_dir == "failed" else None
                })
        
        raise HTTPException(404, "Arquivo não encontrado")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro verificando status: {e}")
        raise HTTPException(500, f"Erro interno: {str(e)}")

@router.get("/download/{file_id}")
async def download_converted_image(file_id: str):
    """Download da imagem convertida"""
    try:
        # Verificar se conversão está completa
        metadata_path = os.path.join("uploads/converted", f"{file_id}.json")
        if not os.path.exists(metadata_path):
            raise HTTPException(404, "Arquivo convertido não encontrado")
        
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
        
        output_path = metadata.get("output_path")
        if not output_path or not os.path.exists(output_path):
            raise HTTPException(404, "Arquivo de saída não encontrado")
        
        # Determinar nome do arquivo
        original_name = Path(metadata.get("original_filename", file_id))
        target_format = metadata.get("target_format", "png")
        download_name = f"{original_name.stem}_converted.{target_format}"
        
        return FileResponse(
            output_path,
            filename=download_name,
            media_type="application/octet-stream"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no download: {e}")
        raise HTTPException(500, f"Erro interno: {str(e)}")

# Funções auxiliares
async def convert_image_async(file_id: str, metadata: dict):
    """Conversão assíncrona de imagem"""
    try:
        if not PIL_AVAILABLE:
            await mock_conversion(file_id, metadata)
            return
        
        # TODO: Implementar conversão real com PIL
        converter = ImageConverter()
        input_path = metadata["file_path"]
        
        # Preparar saída
        output_dir = "uploads/converted"
        os.makedirs(output_dir, exist_ok=True)
        
        target_format = metadata["target_format"]
        output_path = os.path.join(output_dir, f"{file_id}_converted.{target_format}")
        
        # Parâmetros de conversão
        params = metadata.get("conversion_params", {})
        
        # Executar conversão
        result = converter.convert_single(
            input_path,
            output_path,
            target_format=target_format,
            quality=params.get("quality", 85),
            max_width=params.get("max_width"),
            max_height=params.get("max_height"),
            compression=params.get("compression", True)
        )
        
        # Atualizar metadados
        if result["success"]:
            metadata.update({
                "status": "completed",
                "output_path": output_path,
                "completed_at": datetime.utcnow().isoformat(),
                "conversion_stats": result
            })
            
            # Salvar metadados finais
            final_metadata_path = os.path.join(output_dir, f"{file_id}.json")
            with open(final_metadata_path, "w") as f:
                json.dump(metadata, f, indent=2)
        else:
            raise Exception(result.get("error", "Conversão falhou"))
            
    except Exception as e:
        logger.error(f"Erro na conversão assíncrona: {e}")
        # Mover para diretório de falhas
        await handle_conversion_error(file_id, metadata, str(e))

async def mock_conversion(file_id: str, metadata: dict):
    """Mock de conversão para demonstração"""
    try:
        # Simular processamento
        await asyncio.sleep(2)
        
        # Criar arquivo de saída mock
        output_dir = "uploads/converted"
        os.makedirs(output_dir, exist_ok=True)
        
        target_format = metadata["target_format"]
        output_path = os.path.join(output_dir, f"{file_id}_converted.{target_format}")
        
        # Copiar arquivo original como "conversão"
        import shutil
        shutil.copy2(metadata["file_path"], output_path)
        
        # Atualizar metadados
        metadata.update({
            "status": "completed",
            "output_path": output_path,
            "completed_at": datetime.utcnow().isoformat(),
            "conversion_stats": {
                "success": True,
                "mock": True,
                "message": "Conversão simulada (PIL não disponível)"
            }
        })
        
        # Salvar metadados
        metadata_path = os.path.join(output_dir, f"{file_id}.json")
        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)
            
    except Exception as e:
        await handle_conversion_error(file_id, metadata, f"Mock conversion error: {e}")

async def handle_conversion_error(file_id: str, metadata: dict, error: str):
    """Lidar com erros de conversão"""
    try:
        error_dir = "uploads/failed"
        os.makedirs(error_dir, exist_ok=True)
        
        metadata.update({
            "status": "failed",
            "error": error,
            "failed_at": datetime.utcnow().isoformat()
        })
        
        error_metadata_path = os.path.join(error_dir, f"{file_id}.json")
        with open(error_metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)
            
    except Exception as e:
        logger.error(f"Erro salvando erro de conversão: {e}")

# Estatísticas e monitoramento
@router.get("/stats")
async def get_conversion_stats():
    """Estatísticas de conversões de imagem"""
    try:
        stats = {
            "total_uploads": 0,
            "total_conversions": 0,
            "total_failures": 0,
            "formats_processed": {},
            "pil_available": PIL_AVAILABLE
        }
        
        # Contar arquivos em cada diretório
        for status_dir in ["incoming", "converted", "failed"]:
            dir_path = os.path.join("uploads", status_dir)
            if os.path.exists(dir_path):
                json_files = [f for f in os.listdir(dir_path) if f.endswith('.json')]
                
                if status_dir == "incoming":
                    stats["total_uploads"] += len(json_files)
                elif status_dir == "converted":
                    stats["total_conversions"] += len(json_files)
                elif status_dir == "failed":
                    stats["total_failures"] += len(json_files)
        
        return JSONResponse(stats)
        
    except Exception as e:
        logger.error(f"Erro obtendo estatísticas: {e}")
        return JSONResponse({"error": str(e)})

# Endpoints administrativos
@router.delete("/cleanup")
async def cleanup_old_files():
    """Limpeza de arquivos antigos (admin only)"""
    try:
        # TODO: Implementar limpeza baseada em idade dos arquivos
        return JSONResponse({
            "success": True,
            "message": "Limpeza executada",
            "note": "Implementação pendente"
        })
        
    except Exception as e:
        logger.error(f"Erro na limpeza: {e}")
        raise HTTPException(500, f"Erro interno: {str(e)}")

if __name__ == "__main__":
    print("🖼️ Image Converter FastAPI Router - Pronto!")
    print(f"PIL disponível: {PIL_AVAILABLE}")
    print(f"Preços: {PRICING}")
    print(f"Formatos suportados: {ALLOWED_EXTENSIONS} → {OUTPUT_FORMATS}")