from pydantic import BaseModel, Field, validator
from typing import Optional, List, Literal
from datetime import datetime
from enum import Enum


class OutputFormat(str, Enum):
    """Formatos de saída suportados"""
    CSV = "csv"
    JSON = "json"
    XML = "xml"
    TSV = "tsv"
    PARQUET = "parquet"


class CompressionType(str, Enum):
    """Tipos de compressão para saída"""
    NONE = "none"
    GZIP = "gzip"
    ZIP = "zip"
    BZIP2 = "bz2"


class ExcelConversionRequest(BaseModel):
    """Schema para requisição de conversão Excel"""
    
    # Configurações básicas
    output_format: OutputFormat = Field(
        default=OutputFormat.CSV,
        description="Formato de saída desejado"
    )
    
    # Seleção de planilhas
    sheets: Optional[List[str]] = Field(
        default=None,
        description="Lista de nomes das planilhas a converter. Se None, converte todas"
    )
    
    sheet_indices: Optional[List[int]] = Field(
        default=None,
        description="Lista de índices das planilhas (0-based). Alternativa a 'sheets'"
    )
    
    # Configurações de parsing
    header_row: int = Field(
        default=0,
        ge=0,
        le=100,
        description="Linha que contém os cabeçalhos (0-based)"
    )
    
    skip_rows: int = Field(
        default=0,
        ge=0,
        le=1000,
        description="Número de linhas a pular no início"
    )
    
    max_rows: Optional[int] = Field(
        default=None,
        ge=1,
        le=1000000,
        description="Máximo de linhas a processar por planilha"
    )
    
    # Processamento de dados
    normalize_columns: bool = Field(
        default=True,
        description="Normalizar nomes de colunas (remover espaços, caracteres especiais)"
    )
    
    remove_empty_rows: bool = Field(
        default=True,
        description="Remover linhas completamente vazias"
    )
    
    remove_empty_columns: bool = Field(
        default=False,
        description="Remover colunas completamente vazias"
    )
    
    # Saída e compressão
    compression: CompressionType = Field(
        default=CompressionType.NONE,
        description="Tipo de compressão do arquivo de saída"
    )
    
    include_metadata: bool = Field(
        default=True,
        description="Incluir metadados sobre a conversão no resultado"
    )
    
    # Configurações avançadas
    chunk_size: int = Field(
        default=50000,
        ge=1000,
        le=100000,
        description="Tamanho do chunk para processamento em streaming"
    )
    
    date_format: Optional[str] = Field(
        default=None,
        description="Formato personalizado para datas (ex: %Y-%m-%d)"
    )
    
    decimal_separator: str = Field(
        default=".",
        regex=r"^[,.]$",
        description="Separador decimal para números"
    )
    
    @validator('sheets', 'sheet_indices')
    def validate_sheet_selection(cls, v, values):
        """Validar que apenas um método de seleção de planilhas foi usado"""
        if 'sheets' in values and values['sheets'] is not None and v is not None:
            raise ValueError("Use apenas 'sheets' OU 'sheet_indices', não ambos")
        return v


class ExcelFileInfo(BaseModel):
    """Informações sobre o arquivo Excel processado"""
    filename: str
    file_size: int
    sheets_count: int
    sheets_names: List[str]
    total_rows: int
    total_columns: int
    processing_time_ms: int
    has_macros: bool = Field(description="Se o arquivo contém macros (xlsm, xltm)")


class ExcelConversionResult(BaseModel):
    """Resultado da conversão Excel"""
    
    # Identificação
    conversion_id: str
    user_id: Optional[str] = None
    
    # Status
    success: bool
    status: Literal["completed", "failed", "processing"] = "completed"
    error_message: Optional[str] = None
    
    # Arquivo processado
    file_info: ExcelFileInfo
    
    # Resultados
    output_format: OutputFormat
    sheets_processed: List[str]
    rows_processed: int
    columns_processed: int
    
    # Arquivos gerados
    output_files: List[dict] = Field(
        description="Lista de arquivos gerados com URLs de download"
    )
    
    # Billing
    billable_rows: int = Field(description="Linhas processadas para cobrança")
    processing_cost: float = Field(description="Custo da conversão em R$")
    
    # Metadados
    created_at: datetime = Field(default_factory=datetime.now)
    expires_at: datetime = Field(description="Quando os arquivos de resultado expiram")
    
    # Qualidade dos dados
    warnings: List[str] = Field(
        default_factory=list,
        description="Avisos sobre a conversão (dados perdidos, formatos, etc.)"
    )


class ExcelParsingStats(BaseModel):
    """Estatísticas do processo de parsing"""
    total_sheets: int
    sheets_processed: int
    total_rows_read: int
    total_rows_written: int
    empty_rows_skipped: int
    empty_columns_removed: int
    processing_time_seconds: float
    memory_peak_mb: float
    chunk_count: int


class ExcelSecurityCheck(BaseModel):
    """Resultado da verificação de segurança do arquivo"""
    filename: str
    file_extension: str
    is_macro_enabled: bool
    has_external_references: bool
    has_vba_code: bool
    security_risk_level: Literal["low", "medium", "high"]
    blocked_reason: Optional[str] = None
    allowed_to_process: bool


class ExcelWorkerConfig(BaseModel):
    """Configurações do worker Excel"""
    
    # Limites de processamento
    max_file_size_mb: int = Field(default=100, description="Tamanho máximo do arquivo")
    max_rows_per_sheet: int = Field(default=500000, description="Máximo de linhas por planilha")
    max_sheets_per_file: int = Field(default=50, description="Máximo de planilhas por arquivo")
    max_memory_mb: int = Field(default=2048, description="Limite de memória do worker")
    
    # Segurança
    allow_macro_files: bool = Field(default=False, description="Permitir arquivos com macros")
    sandbox_mode: bool = Field(default=True, description="Processar em modo sandbox")
    virus_scan_enabled: bool = Field(default=True, description="Escanear vírus")
    
    # Performance
    chunk_size: int = Field(default=50000, description="Tamanho padrão dos chunks")
    parallel_sheets: bool = Field(default=False, description="Processar planilhas em paralelo")
    
    # Storage
    result_expiry_hours: int = Field(default=24, description="Validade dos resultados em horas")
    cleanup_temp_files: bool = Field(default=True, description="Limpar arquivos temporários")
    
    # Billing
    cost_per_1000_rows: float = Field(default=0.10, description="Custo por 1000 linhas em R$")
    minimum_charge: float = Field(default=2.00, description="Cobrança mínima em R$")


# Schemas para API responses
class ExcelUploadResponse(BaseModel):
    """Response do upload de arquivo Excel"""
    upload_id: str
    filename: str
    file_size: int
    security_check: ExcelSecurityCheck
    estimated_cost: float
    processing_time_estimate: str


class ExcelJobStatus(BaseModel):
    """Status de um job de conversão Excel"""
    job_id: str
    status: Literal["queued", "processing", "completed", "failed", "cancelled"]
    progress_percentage: int = Field(ge=0, le=100)
    current_sheet: Optional[str] = None
    rows_processed: int = 0
    estimated_remaining_seconds: Optional[int] = None
    error_message: Optional[str] = None
    result: Optional[ExcelConversionResult] = None