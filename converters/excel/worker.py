import asyncio
import uuid
import time
import logging
from pathlib import Path
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import json
import traceback

from .parser import (
    parse_excel_to_format, 
    ExcelParserConfig,
    ExcelSecurityValidator,
    get_excel_info
)
from .schemas import (
    OutputFormat, 
    CompressionType,
    ExcelWorkerConfig,
    ExcelParsingStats,
    ExcelSecurityCheck
)

logger = logging.getLogger(__name__)


class TaskStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class ExcelConversionTask:
    """Tarefa de conversão Excel"""
    
    task_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    input_file: Path = None
    output_format: OutputFormat = OutputFormat.CSV
    compression: CompressionType = CompressionType.NONE
    user_id: Optional[str] = None
    
    # Configurações do parser
    chunk_size: int = 50000
    max_memory_mb: int = 2048
    enable_streaming: bool = True
    normalize_columns: bool = True
    remove_empty_rows: bool = True
    sheets_to_convert: Optional[List[str]] = None
    
    # Estado da tarefa
    status: TaskStatus = TaskStatus.QUEUED
    progress: float = 0.0
    current_step: str = "Aguardando na fila"
    
    # Timing
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Resultado
    output_file: Optional[Path] = None
    download_url: Optional[str] = None
    error_message: Optional[str] = None
    parsing_stats: Optional[ExcelParsingStats] = None
    security_check: Optional[ExcelSecurityCheck] = None
    
    # Metadados
    file_info: Dict[str, Any] = field(default_factory=dict)
    estimated_remaining_time: Optional[float] = None
    
    @property
    def is_completed(self) -> bool:
        return self.status in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED]
    
    @property
    def processing_time(self) -> Optional[float]:
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None
    
    def to_dict(self) -> dict:
        """Converte tarefa para dicionário"""
        return {
            "task_id": self.task_id,
            "status": self.status.value,
            "progress": self.progress,
            "current_step": self.current_step,
            "created_at": self.created_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "processing_time": self.processing_time,
            "output_format": self.output_format.value,
            "compression": self.compression.value,
            "download_url": self.download_url,
            "error_message": self.error_message,
            "estimated_remaining_time": self.estimated_remaining_time,
            "file_info": self.file_info,
            "parsing_stats": self.parsing_stats.dict() if self.parsing_stats else None,
            "security_check": self.security_check.dict() if self.security_check else None
        }


class ExcelWorkerPool:
    """Pool de workers para processamento Excel"""
    
    def __init__(self, config: ExcelWorkerConfig):
        self.config = config
        self.tasks: Dict[str, ExcelConversionTask] = {}
        self.processing_queue: asyncio.Queue = asyncio.Queue(maxsize=config.queue_max_size)
        self.workers: List[asyncio.Task] = []
        self.is_running = False
        
        # Estatísticas
        self.stats = {
            "total_tasks": 0,
            "completed_tasks": 0,
            "failed_tasks": 0,
            "active_workers": 0,
            "queue_size": 0,
            "average_processing_time": 0.0
        }
    
    async def start(self):
        """Inicia o pool de workers"""
        self.is_running = True
        
        # Criar workers
        for i in range(self.config.max_concurrent_tasks):
            worker = asyncio.create_task(self._worker(f"worker-{i}"))
            self.workers.append(worker)
        
        logger.info(f"Excel worker pool iniciado com {self.config.max_concurrent_tasks} workers")
    
    async def stop(self):
        """Para o pool de workers"""
        self.is_running = False
        
        # Cancelar workers
        for worker in self.workers:
            worker.cancel()
        
        # Aguardar conclusão
        await asyncio.gather(*self.workers, return_exceptions=True)
        
        logger.info("Excel worker pool parado")
    
    async def submit_task(self, task: ExcelConversionTask) -> str:
        """Submete uma nova tarefa"""
        
        if not self.is_running:
            raise RuntimeError("Worker pool não está rodando")
        
        # Verificar limites
        if self.processing_queue.qsize() >= self.config.queue_max_size:
            raise RuntimeError("Fila de processamento cheia")
        
        # Registrar tarefa
        self.tasks[task.task_id] = task
        self.stats["total_tasks"] += 1
        
        # Adicionar à fila
        await self.processing_queue.put(task)
        self.stats["queue_size"] = self.processing_queue.qsize()
        
        logger.info(f"Tarefa {task.task_id} adicionada à fila")
        
        return task.task_id
    
    def get_task(self, task_id: str) -> Optional[ExcelConversionTask]:
        """Obtém tarefa por ID"""
        return self.tasks.get(task_id)
    
    def get_stats(self) -> dict:
        """Obtém estatísticas do pool"""
        active_tasks = sum(1 for task in self.tasks.values() if task.status == TaskStatus.PROCESSING)
        
        self.stats.update({
            "active_workers": active_tasks,
            "queue_size": self.processing_queue.qsize(),
            "total_tasks_in_memory": len(self.tasks)
        })
        
        return self.stats.copy()
    
    async def _worker(self, worker_name: str):
        """Worker que processa tarefas"""
        
        logger.info(f"Worker {worker_name} iniciado")
        
        while self.is_running:
            try:
                # Aguardar nova tarefa (com timeout)
                task = await asyncio.wait_for(
                    self.processing_queue.get(), 
                    timeout=self.config.worker_timeout_seconds
                )
                
                # Processar tarefa
                await self._process_task(task, worker_name)
                
                # Marcar tarefa como concluída na fila
                self.processing_queue.task_done()
                
            except asyncio.TimeoutError:
                # Timeout é normal, continua loop
                continue
            except asyncio.CancelledError:
                logger.info(f"Worker {worker_name} cancelado")
                break
            except Exception as e:
                logger.error(f"Erro no worker {worker_name}: {e}")
                await asyncio.sleep(1)  # Evitar loop infinito em caso de erro
        
        logger.info(f"Worker {worker_name} finalizado")
    
    async def _process_task(self, task: ExcelConversionTask, worker_name: str):
        """Processa uma tarefa individual"""
        
        start_time = time.time()
        
        try:
            logger.info(f"Worker {worker_name} processando tarefa {task.task_id}")
            
            # Atualizar status
            task.status = TaskStatus.PROCESSING
            task.started_at = datetime.now()
            task.current_step = "Verificando segurança"
            task.progress = 10.0
            
            # Verificar segurança do arquivo
            security_check = ExcelSecurityValidator.check_file_security(task.input_file)
            task.security_check = security_check
            
            if not security_check.allowed_to_process:
                raise ValueError(f"Arquivo bloqueado: {security_check.blocked_reason}")
            
            # Obter informações do arquivo
            task.current_step = "Analisando arquivo"
            task.progress = 20.0
            
            task.file_info = get_excel_info(task.input_file)
            
            # Estimar tempo restante
            estimated_rows = task.file_info.get("total_rows", 0)
            estimated_time = max(30, estimated_rows / 10000 * 60)  # 10k linhas por minuto
            task.estimated_remaining_time = estimated_time
            
            # Configurar parser
            task.current_step = "Configurando conversão"
            task.progress = 30.0
            
            parser_config = ExcelParserConfig(
                chunk_size=task.chunk_size,
                max_memory_mb=task.max_memory_mb,
                enable_streaming=task.enable_streaming,
                normalize_columns=task.normalize_columns,
                remove_empty_rows=task.remove_empty_rows
            )
            
            # Preparar arquivo de saída
            output_dir = Path("uploads/converted")
            output_dir.mkdir(parents=True, exist_ok=True)
            
            output_filename = f"{task.task_id}_{task.input_file.stem}.{task.output_format.value}"
            task.output_file = output_dir / output_filename
            
            # Executar conversão
            task.current_step = "Convertendo arquivo"
            task.progress = 40.0
            
            # Simular progresso durante conversão
            conversion_task = asyncio.create_task(
                self._run_conversion_with_progress(task, parser_config)
            )
            
            # Aguardar conversão
            parsing_stats = await conversion_task
            task.parsing_stats = parsing_stats
            
            # Verificar resultado
            if not task.output_file.exists():
                raise RuntimeError("Arquivo de saída não foi gerado")
            
            # Finalizar tarefa
            task.current_step = "Finalizando"
            task.progress = 90.0
            
            # Gerar URL de download
            task.download_url = f"/excel/download/{output_filename}"
            
            # Concluir
            task.status = TaskStatus.COMPLETED
            task.completed_at = datetime.now()
            task.progress = 100.0
            task.current_step = "Concluído"
            task.estimated_remaining_time = 0.0
            
            # Estatísticas
            self.stats["completed_tasks"] += 1
            processing_time = time.time() - start_time
            
            # Atualizar média de tempo de processamento
            total_completed = self.stats["completed_tasks"]
            current_avg = self.stats["average_processing_time"]
            new_avg = (current_avg * (total_completed - 1) + processing_time) / total_completed
            self.stats["average_processing_time"] = new_avg
            
            logger.info(f"Tarefa {task.task_id} concluída em {processing_time:.2f}s")
            
        except Exception as e:
            # Marcar tarefa como falha
            task.status = TaskStatus.FAILED
            task.completed_at = datetime.now()
            task.error_message = str(e)
            task.current_step = f"Erro: {str(e)}"
            task.estimated_remaining_time = 0.0
            
            self.stats["failed_tasks"] += 1
            
            logger.error(f"Erro na tarefa {task.task_id}: {e}")
            logger.debug(traceback.format_exc())
        
        finally:
            # Limpar arquivo de entrada
            if task.input_file and task.input_file.exists():
                try:
                    task.input_file.unlink()
                except Exception as e:
                    logger.warning(f"Erro ao remover arquivo de entrada: {e}")
    
    async def _run_conversion_with_progress(
        self, 
        task: ExcelConversionTask, 
        parser_config: ExcelParserConfig
    ) -> ExcelParsingStats:
        """Executa conversão com atualizações de progresso"""
        
        # Executar conversão em thread separada para não bloquear
        loop = asyncio.get_event_loop()
        
        def conversion_worker():
            return parse_excel_to_format(
                input_path=task.input_file,
                output_path=task.output_file,
                output_format=task.output_format,
                config=parser_config,
                sheets=task.sheets_to_convert,
                compression=task.compression
            )
        
        # Simular progresso enquanto conversão roda
        progress_task = asyncio.create_task(self._simulate_progress(task))
        
        try:
            # Executar conversão
            stats = await loop.run_in_executor(None, conversion_worker)
            
            return stats
            
        finally:
            # Cancelar simulação de progresso
            progress_task.cancel()
            try:
                await progress_task
            except asyncio.CancelledError:
                pass
    
    async def _simulate_progress(self, task: ExcelConversionTask):
        """Simula progresso durante conversão"""
        
        start_progress = task.progress
        target_progress = 85.0
        
        steps = [
            ("Lendo planilhas", 50.0),
            ("Processando dados", 65.0), 
            ("Aplicando formatação", 75.0),
            ("Gerando arquivo final", 85.0)
        ]
        
        try:
            for step_name, step_progress in steps:
                # Aguardar um tempo baseado no tamanho do arquivo
                total_rows = task.file_info.get("total_rows", 1000)
                wait_time = min(10, max(1, total_rows / 100000))  # 1-10 segundos
                
                await asyncio.sleep(wait_time)
                
                # Atualizar progresso
                task.current_step = step_name
                task.progress = step_progress
                
                # Atualizar tempo estimado
                elapsed = (datetime.now() - task.started_at).total_seconds()
                remaining_ratio = (100.0 - task.progress) / max(1, task.progress)
                task.estimated_remaining_time = elapsed * remaining_ratio
                
        except asyncio.CancelledError:
            pass


# Instância global do worker pool
_worker_pool: Optional[ExcelWorkerPool] = None


async def get_worker_pool() -> ExcelWorkerPool:
    """Obtém instância do worker pool"""
    global _worker_pool
    
    if _worker_pool is None:
        config = ExcelWorkerConfig()
        _worker_pool = ExcelWorkerPool(config)
        await _worker_pool.start()
    
    return _worker_pool


async def shutdown_worker_pool():
    """Finaliza worker pool"""
    global _worker_pool
    
    if _worker_pool:
        await _worker_pool.stop()
        _worker_pool = None


# Funções de conveniência para a API
async def queue_excel_conversion(
    input_file: Path,
    output_format: OutputFormat,
    compression: CompressionType = CompressionType.NONE,
    user_id: Optional[str] = None,
    **kwargs
) -> str:
    """Adiciona tarefa de conversão à fila"""
    
    task = ExcelConversionTask(
        input_file=input_file,
        output_format=output_format,
        compression=compression,
        user_id=user_id,
        **kwargs
    )
    
    worker_pool = await get_worker_pool()
    return await worker_pool.submit_task(task)


async def get_conversion_status(task_id: str) -> Optional[ExcelConversionTask]:
    """Obtém status de conversão"""
    
    worker_pool = await get_worker_pool()
    return worker_pool.get_task(task_id)


async def get_worker_stats() -> dict:
    """Obtém estatísticas dos workers"""
    
    worker_pool = await get_worker_pool()
    return worker_pool.get_stats()


# Implementação alternativa usando classes
class ExcelConversionTask:
    """Classe para compatibilidade com API"""
    
    @classmethod
    async def queue_for_processing(cls) -> str:
        """Adiciona tarefa à fila"""
        return await queue_excel_conversion(
            input_file=cls.input_file,
            output_format=cls.output_format,
            compression=cls.compression,
            user_id=cls.user_id
        )
    
    @classmethod
    def get_by_id(cls, task_id: str) -> Optional['ExcelConversionTask']:
        """Busca tarefa por ID"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(get_conversion_status(task_id))
        finally:
            loop.close()