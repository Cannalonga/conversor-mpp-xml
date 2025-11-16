from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, status
from fastapi.responses import FileResponse
import os
import tempfile
import shutil
import asyncio
from pathlib import Path
from typing import Optional, List
import logging

from ..auth import require_auth  # Sistema de autenticação se existir
from .schemas import (
    ExcelConversionRequest, 
    ExcelConversionResult,
    ExcelConversionStatus,
    OutputFormat,
    CompressionType,
    ExcelParsingStats,
    ExcelSecurityCheck,
    ExcelAPIErrorResponse
)
from .parser import (
    parse_excel_to_format, 
    get_excel_info,
    ExcelParserConfig,
    ExcelSecurityValidator
)
from .worker import ExcelConversionTask
from ..billing import BillingService  # Sistema de cobrança
from ..storage import FileStorage    # Sistema de armazenamento

logger = logging.getLogger(__name__)

# Configurações
UPLOAD_MAX_SIZE = 100 * 1024 * 1024  # 100MB
ALLOWED_EXTENSIONS = {'.xlsx', '.xls', '.csv', '.tsv', '.xlsm'}
PROCESSING_TIMEOUT = 600  # 10 minutos

router = APIRouter(prefix="/excel", tags=["Excel Converter"])


def validate_file_upload(file: UploadFile) -> bool:
    """Valida arquivo de upload"""
    
    # Verificar extensão
    file_extension = Path(file.filename).suffix.lower()
    if file_extension not in ALLOWED_EXTENSIONS:
        return False
    
    # Verificar tamanho (se possível)
    if hasattr(file, 'size') and file.size > UPLOAD_MAX_SIZE:
        return False
    
    return True


@router.post("/convert", response_model=ExcelConversionResult)
async def convert_excel_file(
    file: UploadFile = File(...),
    output_format: OutputFormat = OutputFormat.CSV,
    compression: CompressionType = CompressionType.NONE,
    chunk_size: int = 50000,
    max_memory_mb: int = 2048,
    enable_streaming: bool = True,
    normalize_columns: bool = True,
    remove_empty_rows: bool = True,
    sheets_to_convert: Optional[List[str]] = None,
    user_id: Optional[str] = None  # Para sistema de billing
):
    """
    Converte arquivo Excel para outros formatos
    """
    
    try:
        # Validar arquivo
        if not validate_file_upload(file):
            raise HTTPException(
                status_code=400,
                detail="Arquivo inválido. Verifique extensão e tamanho."
            )
        
        # Criar arquivo temporário
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as temp_file:
            # Salvar upload
            shutil.copyfileobj(file.file, temp_file)
            input_path = Path(temp_file.name)
        
        try:
            # Verificação de segurança
            security_check = ExcelSecurityValidator.check_file_security(input_path)
            
            if not security_check.allowed_to_process:
                raise HTTPException(
                    status_code=403,
                    detail=f"Arquivo bloqueado por segurança: {security_check.blocked_reason}"
                )
            
            # Obter informações do arquivo
            file_info = get_excel_info(input_path)
            
            # Configurar parser
            parser_config = ExcelParserConfig(
                chunk_size=chunk_size,
                max_memory_mb=max_memory_mb,
                enable_streaming=enable_streaming,
                normalize_columns=normalize_columns,
                remove_empty_rows=remove_empty_rows
            )
            
            # Criar arquivo de saída
            output_filename = f"{Path(file.filename).stem}.{output_format.value}"
            output_path = Path(tempfile.mkdtemp()) / output_filename
            
            # Executar conversão
            logger.info(f"Iniciando conversão: {file.filename} -> {output_format.value}")
            
            stats = parse_excel_to_format(
                input_path=input_path,
                output_path=output_path,
                output_format=output_format,
                config=parser_config,
                sheets=sheets_to_convert,
                compression=compression
            )
            
            # Verificar se arquivo foi criado
            if not output_path.exists():
                raise HTTPException(
                    status_code=500,
                    detail="Erro na conversão - arquivo de saída não foi gerado"
                )
            
            # Sistema de billing (se configurado)
            billing_info = {}
            if user_id and hasattr(BillingService, 'record_conversion'):
                try:
                    billing_info = BillingService.record_conversion(
                        user_id=user_id,
                        conversion_type="excel",
                        file_size=input_path.stat().st_size,
                        processing_time=stats.processing_time_seconds
                    )
                except Exception as e:
                    logger.warning(f"Erro no billing: {e}")
            
            # Preparar resposta
            result = ExcelConversionResult(
                success=True,
                output_filename=output_filename,
                output_format=output_format,
                compression_used=compression,
                file_info=file_info,
                security_check=security_check,
                parsing_stats=stats,
                download_url=f"/excel/download/{output_path.name}",
                billing_info=billing_info
            )
            
            # Armazenar arquivo para download (temporariamente)
            if hasattr(FileStorage, 'store_temp_file'):
                FileStorage.store_temp_file(output_path, ttl_hours=24)
            
            logger.info(f"Conversão concluída: {stats.sheets_processed} planilhas, "
                       f"{stats.total_rows_written} linhas em {stats.processing_time_seconds:.2f}s")
            
            return result
            
        finally:
            # Limpar arquivo temporário de entrada
            if input_path.exists():
                input_path.unlink()
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro na conversão Excel: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro interno na conversão: {str(e)}"
        )


@router.post("/convert-async", response_model=dict)
async def convert_excel_async(
    file: UploadFile = File(...),
    output_format: OutputFormat = OutputFormat.CSV,
    compression: CompressionType = CompressionType.NONE,
    user_id: Optional[str] = None
):
    """
    Converte arquivo Excel de forma assíncrona (para arquivos grandes)
    """
    
    try:
        # Validar arquivo
        if not validate_file_upload(file):
            raise HTTPException(
                status_code=400,
                detail="Arquivo inválido"
            )
        
        # Salvar arquivo temporário
        upload_dir = Path("uploads/incoming")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = upload_dir / f"{asyncio.current_task().get_name()}_{file.filename}"
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Criar tarefa de conversão
        task = ExcelConversionTask(
            input_file=file_path,
            output_format=output_format,
            compression=compression,
            user_id=user_id
        )
        
        # Adicionar à fila de processamento
        task_id = await task.queue_for_processing()
        
        return {
            "task_id": task_id,
            "status": "queued",
            "message": "Arquivo enviado para conversão assíncrona",
            "estimated_time_minutes": 5,
            "status_url": f"/excel/status/{task_id}"
        }
        
    except Exception as e:
        logger.error(f"Erro ao iniciar conversão assíncrona: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao processar arquivo: {str(e)}"
        )


@router.get("/status/{task_id}", response_model=ExcelConversionStatus)
async def get_conversion_status(task_id: str):
    """
    Verifica status de conversão assíncrona
    """
    
    try:
        task = ExcelConversionTask.get_by_id(task_id)
        
        if not task:
            raise HTTPException(
                status_code=404,
                detail="Tarefa não encontrada"
            )
        
        return ExcelConversionStatus(
            task_id=task_id,
            status=task.status,
            progress_percentage=task.progress,
            current_step=task.current_step,
            estimated_remaining_seconds=task.estimated_remaining_time,
            error_message=task.error_message,
            result_url=task.download_url if task.is_completed else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao verificar status: {e}")
        raise HTTPException(
            status_code=500,
            detail="Erro interno"
        )


@router.get("/download/{filename}")
async def download_converted_file(filename: str):
    """
    Download do arquivo convertido
    """
    
    try:
        # Buscar arquivo no sistema de armazenamento
        file_path = None
        
        # Tentar diretório de downloads temporários
        temp_download_dir = Path("uploads/converted")
        temp_file_path = temp_download_dir / filename
        
        if temp_file_path.exists():
            file_path = temp_file_path
        elif hasattr(FileStorage, 'get_temp_file'):
            file_path = FileStorage.get_temp_file(filename)
        
        if not file_path or not file_path.exists():
            raise HTTPException(
                status_code=404,
                detail="Arquivo não encontrado ou expirado"
            )
        
        # Determinar tipo de mídia baseado na extensão
        media_type_map = {
            '.csv': 'text/csv',
            '.json': 'application/json',
            '.xml': 'application/xml',
            '.tsv': 'text/tab-separated-values',
            '.parquet': 'application/octet-stream',
            '.gz': 'application/gzip',
            '.zip': 'application/zip',
            '.bz2': 'application/x-bzip2'
        }
        
        file_extension = Path(filename).suffix.lower()
        media_type = media_type_map.get(file_extension, 'application/octet-stream')
        
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type=media_type
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no download: {e}")
        raise HTTPException(
            status_code=500,
            detail="Erro interno no download"
        )


@router.get("/info/{filename}")
async def get_excel_file_info(
    file: UploadFile = File(...),
):
    """
    Obtém informações sobre arquivo Excel sem conversão
    """
    
    try:
        # Validar arquivo
        if not validate_file_upload(file):
            raise HTTPException(
                status_code=400,
                detail="Arquivo inválido"
            )
        
        # Salvar temporariamente
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_path = Path(temp_file.name)
        
        try:
            # Verificar segurança
            security_check = ExcelSecurityValidator.check_file_security(temp_path)
            
            # Obter informações
            file_info = get_excel_info(temp_path)
            
            return {
                "filename": file.filename,
                "file_info": file_info,
                "security_check": security_check.dict(),
                "supported_formats": [format.value for format in OutputFormat],
                "recommended_chunk_size": min(50000, file_info.get("total_rows", 50000) // 10)
            }
            
        finally:
            temp_path.unlink()
            
    except Exception as e:
        logger.error(f"Erro ao obter informações do arquivo: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao processar arquivo: {str(e)}"
        )


@router.get("/formats", response_model=dict)
async def get_supported_formats():
    """
    Lista formatos de saída suportados
    """
    
    return {
        "output_formats": [
            {
                "format": format.value,
                "description": {
                    "csv": "Valores separados por vírgula",
                    "json": "JavaScript Object Notation",
                    "xml": "eXtensible Markup Language", 
                    "tsv": "Valores separados por tabulação",
                    "parquet": "Apache Parquet (colunar)"
                }.get(format.value, format.value)
            }
            for format in OutputFormat
        ],
        "compression_types": [
            {
                "type": comp.value,
                "description": {
                    "none": "Sem compressão",
                    "gzip": "Compressão Gzip",
                    "zip": "Arquivo ZIP",
                    "bzip2": "Compressão Bzip2"
                }.get(comp.value, comp.value)
            }
            for comp in CompressionType
        ],
        "max_file_size_mb": UPLOAD_MAX_SIZE // 1024 // 1024,
        "supported_extensions": list(ALLOWED_EXTENSIONS),
        "processing_timeout_seconds": PROCESSING_TIMEOUT
    }


@router.delete("/cleanup")
async def cleanup_temp_files():
    """
    Remove arquivos temporários antigos (apenas para admins)
    """
    
    try:
        # Esta rota deveria ter autenticação de admin
        # if not require_auth("admin"):
        #     raise HTTPException(status_code=403, detail="Acesso negado")
        
        cleanup_paths = [
            Path("uploads/converted"),
            Path("uploads/processing"), 
            Path("uploads/expired")
        ]
        
        files_removed = 0
        for path in cleanup_paths:
            if path.exists():
                for file_path in path.iterdir():
                    if file_path.is_file():
                        file_path.unlink()
                        files_removed += 1
        
        return {
            "status": "success",
            "files_removed": files_removed,
            "message": f"Limpeza concluída: {files_removed} arquivos removidos"
        }
        
    except Exception as e:
        logger.error(f"Erro na limpeza: {e}")
        raise HTTPException(
            status_code=500,
            detail="Erro na limpeza de arquivos"
        )