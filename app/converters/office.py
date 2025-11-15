#!/usr/bin/env python3
"""
Office Converter Module - MPP-XML Converter Pro
Supports: DOCX ↔ PDF, XLSX ↔ CSV, PPTX ↔ PDF, ODT ↔ DOCX
Uses LibreOffice headless for enterprise-grade conversion
"""

import subprocess
import shlex
from pathlib import Path
import logging
import tempfile
import os
from typing import Tuple, List, Dict
import time

log = logging.getLogger("converters.office")

# Supported format mappings
SUPPORTED_FORMATS = {
    'input': {
        'docx', 'doc', 'odt', 'rtf',  # Text documents
        'xlsx', 'xls', 'ods', 'csv',  # Spreadsheets
        'pptx', 'ppt', 'odp',         # Presentations
    },
    'output': {
        'pdf', 'docx', 'odt', 'rtf',  # Text outputs
        'xlsx', 'ods', 'csv',         # Spreadsheet outputs
        'pptx', 'odp', 'png', 'jpg'   # Presentation outputs
    },
    'conversions': {
        # Popular conversions with pricing
        ('docx', 'pdf'): {'price': 5.00, 'complexity': 'low'},
        ('doc', 'pdf'): {'price': 5.00, 'complexity': 'low'},
        ('xlsx', 'pdf'): {'price': 5.00, 'complexity': 'low'},
        ('xlsx', 'csv'): {'price': 3.00, 'complexity': 'low'},
        ('pptx', 'pdf'): {'price': 5.00, 'complexity': 'medium'},
        ('pdf', 'docx'): {'price': 8.00, 'complexity': 'high'},
        ('csv', 'xlsx'): {'price': 3.00, 'complexity': 'low'},
        ('odt', 'docx'): {'price': 4.00, 'complexity': 'low'},
    }
}

# Security limits
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
CONVERSION_TIMEOUT = 300  # 5 minutes
MAX_PAGES = 500  # For documents

class OfficeConverterError(Exception):
    """Custom exception for office conversion errors"""
    pass

class OfficeConverter:
    """Enterprise Office Document Converter"""
    
    def __init__(self, temp_dir: str = None):
        self.temp_dir = temp_dir or tempfile.gettempdir()
        self.stats = {
            'conversions_total': 0,
            'conversions_success': 0,
            'conversions_failed': 0,
            'total_processing_time': 0
        }
    
    def validate_conversion(self, input_ext: str, output_ext: str) -> Dict:
        """Validate if conversion is supported and get pricing info"""
        input_ext = input_ext.lower().lstrip('.')
        output_ext = output_ext.lower().lstrip('.')
        
        if input_ext not in SUPPORTED_FORMATS['input']:
            raise OfficeConverterError(f"Formato de entrada não suportado: {input_ext}")
        
        if output_ext not in SUPPORTED_FORMATS['output']:
            raise OfficeConverterError(f"Formato de saída não suportado: {output_ext}")
        
        conversion_key = (input_ext, output_ext)
        if conversion_key in SUPPORTED_FORMATS['conversions']:
            return SUPPORTED_FORMATS['conversions'][conversion_key]
        
        # Default pricing for unlisted but supported combinations
        return {'price': 6.00, 'complexity': 'medium'}
    
    def check_libreoffice_available(self) -> bool:
        """Check if LibreOffice is available in the system"""
        try:
            result = subprocess.run(
                ['libreoffice', '--version'], 
                capture_output=True, 
                timeout=10,
                check=False
            )
            return result.returncode == 0
        except Exception:
            return False
    
    def convert_with_libreoffice(self, input_path: str, output_dir: str, 
                               target_ext: str, timeout: int = CONVERSION_TIMEOUT) -> Tuple[bool, str]:
        """Convert document using LibreOffice headless
        
        Returns:
            Tuple[bool, str]: (success, output_path_or_error_message)
        """
        start_time = time.time()
        input_path = Path(input_path)
        out_dir = Path(output_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        
        # Validate file size
        if input_path.stat().st_size > MAX_FILE_SIZE:
            raise OfficeConverterError(f"Arquivo excede limite de {MAX_FILE_SIZE//1024//1024}MB")
        
        # Ensure LibreOffice is available
        if not self.check_libreoffice_available():
            raise OfficeConverterError("LibreOffice não está instalado ou disponível")
        
        # Build secure command
        cmd_parts = [
            'libreoffice',
            '--headless',
            '--nologo', 
            '--nofirststartwizard',
            '--norestore',
            '--invisible',
            '--convert-to', target_ext,
            '--outdir', str(out_dir),
            str(input_path)
        ]
        
        log.info(f"Converting {input_path.name} to {target_ext} using LibreOffice")
        log.debug(f"Command: {' '.join(cmd_parts)}")
        
        try:
            # Execute conversion with security limits
            proc = subprocess.run(
                cmd_parts,
                capture_output=True,
                timeout=timeout,
                check=False,
                cwd=out_dir,  # Run in output directory
                env={
                    **os.environ,
                    'HOME': str(out_dir),  # Sandbox home directory
                    'TMPDIR': str(out_dir)
                }
            )
            
            stdout = proc.stdout.decode(errors="ignore")
            stderr = proc.stderr.decode(errors="ignore")
            
            log.debug(f"LibreOffice stdout: {stdout[:500]}")
            if stderr:
                log.warning(f"LibreOffice stderr: {stderr[:500]}")
            
            # Find output file
            expected_output = out_dir / f"{input_path.stem}.{target_ext}"
            
            if expected_output.exists():
                processing_time = time.time() - start_time
                self.stats['conversions_success'] += 1
                self.stats['total_processing_time'] += processing_time
                
                log.info(f"Conversion successful: {expected_output.name} ({processing_time:.2f}s)")
                return True, str(expected_output)
            
            # Try to find alternative output files
            candidates = list(out_dir.glob(f"{input_path.stem}.*"))
            output_candidates = [f for f in candidates if f.suffix.lstrip('.') == target_ext]
            
            if output_candidates:
                self.stats['conversions_success'] += 1
                return True, str(output_candidates[0])
            
            # Conversion failed
            error_msg = f"Conversão falhou. Exit code: {proc.returncode}"
            if stderr:
                error_msg += f". Erro: {stderr[:200]}"
            
            self.stats['conversions_failed'] += 1
            log.error(error_msg)
            return False, error_msg
            
        except subprocess.TimeoutExpired:
            error_msg = f"Conversão excedeu timeout de {timeout}s"
            self.stats['conversions_failed'] += 1
            log.error(error_msg)
            return False, error_msg
            
        except Exception as e:
            error_msg = f"Erro inesperado na conversão: {str(e)}"
            self.stats['conversions_failed'] += 1
            log.exception("LibreOffice conversion error")
            return False, error_msg
        
        finally:
            self.stats['conversions_total'] += 1
    
    def convert_document(self, input_file: str, output_dir: str, 
                        target_format: str, **options) -> Dict:
        """High-level document conversion with enhanced options
        
        Args:
            input_file: Path to input document
            output_dir: Directory for output
            target_format: Target format (pdf, docx, xlsx, etc)
            **options: Additional conversion options
            
        Returns:
            Dict with conversion results
        """
        try:
            input_path = Path(input_file)
            
            # Validate conversion
            input_ext = input_path.suffix.lstrip('.')
            conversion_info = self.validate_conversion(input_ext, target_format)
            
            # Perform conversion
            success, result = self.convert_with_libreoffice(
                str(input_path), 
                output_dir, 
                target_format,
                timeout=options.get('timeout', CONVERSION_TIMEOUT)
            )
            
            if success:
                output_path = Path(result)
                return {
                    'success': True,
                    'input_file': str(input_path),
                    'output_file': str(output_path),
                    'input_format': input_ext,
                    'output_format': target_format,
                    'file_size': output_path.stat().st_size,
                    'pricing_info': conversion_info,
                    'conversion_time': time.time()
                }
            else:
                return {
                    'success': False,
                    'error': result,
                    'input_file': str(input_path),
                    'input_format': input_ext,
                    'target_format': target_format
                }
                
        except Exception as e:
            log.exception("High-level conversion error")
            return {
                'success': False,
                'error': str(e),
                'input_file': input_file,
                'target_format': target_format
            }
    
    def get_supported_conversions(self) -> List[Dict]:
        """Get list of all supported conversions with pricing"""
        conversions = []
        for (input_fmt, output_fmt), info in SUPPORTED_FORMATS['conversions'].items():
            conversions.append({
                'from': input_fmt,
                'to': output_fmt,
                'price_brl': info['price'],
                'complexity': info['complexity'],
                'popular': info['complexity'] == 'low'
            })
        return conversions
    
    def get_stats(self) -> Dict:
        """Get converter statistics"""
        stats = self.stats.copy()
        if stats['conversions_total'] > 0:
            stats['success_rate'] = stats['conversions_success'] / stats['conversions_total']
            stats['avg_processing_time'] = stats['total_processing_time'] / stats['conversions_total']
        return stats

# Utility functions for backward compatibility
def convert_with_libreoffice(input_path: str, output_dir: str, target_ext: str, 
                           timeout: int = CONVERSION_TIMEOUT) -> Tuple[bool, str]:
    """Legacy function wrapper"""
    converter = OfficeConverter()
    return converter.convert_with_libreoffice(input_path, output_dir, target_ext, timeout)

def validate_office_format(filename: str) -> bool:
    """Quick format validation"""
    ext = Path(filename).suffix.lstrip('.').lower()
    return ext in SUPPORTED_FORMATS['input']

def get_conversion_price(input_ext: str, output_ext: str) -> float:
    """Get pricing for specific conversion"""
    try:
        converter = OfficeConverter()
        info = converter.validate_conversion(input_ext, output_ext)
        return info['price']
    except:
        return 6.00  # Default price

if __name__ == "__main__":
    # Test the converter
    converter = OfficeConverter()
    print("📄 Office Converter Ready!")
    print(f"✅ LibreOffice Available: {converter.check_libreoffice_available()}")
    print(f"📊 Supported Conversions: {len(converter.get_supported_conversions())}")
    
    for conversion in converter.get_supported_conversions()[:5]:
        print(f"  • {conversion['from'].upper()} → {conversion['to'].upper()}: R$ {conversion['price_brl']}")
