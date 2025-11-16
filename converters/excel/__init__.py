# Conversor Excel
# Módulo para conversão de arquivos Excel (.xlsx) e CSV para múltiplos formatos

from .api import router as excel_router
from .parser import parse_excel_to_format, ExcelParserConfig
from .worker import process_excel_conversion
from .schemas import ExcelConversionRequest, ExcelConversionResult

__all__ = [
    "excel_router",
    "parse_excel_to_format", 
    "ExcelParserConfig",
    "process_excel_conversion",
    "ExcelConversionRequest",
    "ExcelConversionResult"
]

__version__ = "1.0.0"
__description__ = "Conversor Excel/CSV para múltiplos formatos com streaming e segurança"