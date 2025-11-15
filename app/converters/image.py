"""
Image Converter - Enterprise Grade
Conversão de imagens usando PIL/Pillow com otimizações avançadas
"""

import os
import io
import hashlib
import time
from pathlib import Path
from typing import Optional, Tuple, Dict, List, Union
from PIL import Image, ImageOps, ExifTags
from PIL.PdfImagePlugin import PdfImageFile
import tempfile
import logging

logger = logging.getLogger(__name__)

class ImageConverter:
    """
    Conversor de imagens enterprise-grade com suporte a:
    - Formatos: PNG, JPG, JPEG, WebP, BMP, GIF, TIFF → PDF, PNG, JPG, WebP
    - Compressão inteligente com qualidade preservada
    - Resize mantendo aspect ratio
    - Rotação automática baseada em EXIF
    - Processamento em batch
    - Otimização de memória para arquivos grandes
    """
    
    # Configurações padrão
    DEFAULT_QUALITY = 85
    DEFAULT_MAX_WIDTH = 2048
    DEFAULT_MAX_HEIGHT = 2048
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    SUPPORTED_INPUT = {'.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif', '.tiff', '.tif', '.pdf'}
    SUPPORTED_OUTPUT = {'.png', '.jpg', '.jpeg', '.webp', '.pdf'}
    
    # Preços por conversão (em R$)
    PRICING = {
        'basic': 2.00,      # Conversão simples
        'compress': 3.00,   # Com compressão
        'resize': 3.00,     # Com resize
        'premium': 5.00,    # Compressão + resize + otimizações
        'batch': 1.50,      # Por imagem em lote (min 5 imagens)
    }
    
    def __init__(self, temp_dir: Optional[str] = None):
        self.temp_dir = temp_dir or tempfile.gettempdir()
        self.stats = {
            'conversions': 0,
            'total_input_size': 0,
            'total_output_size': 0,
            'total_processing_time': 0,
            'formats_processed': {},
            'errors': 0
        }
    
    def validate_file(self, file_path: str) -> Dict[str, any]:
        """
        Valida arquivo de imagem
        
        Returns:
            Dict com informações de validação
        """
        try:
            file_path = Path(file_path)
            
            # Verificar se arquivo existe
            if not file_path.exists():
                return {'valid': False, 'error': 'Arquivo não encontrado'}
            
            # Verificar tamanho
            file_size = file_path.stat().st_size
            if file_size > self.MAX_FILE_SIZE:
                return {
                    'valid': False, 
                    'error': f'Arquivo muito grande ({file_size / 1024 / 1024:.1f}MB > {self.MAX_FILE_SIZE / 1024 / 1024:.0f}MB)'
                }
            
            # Verificar extensão
            extension = file_path.suffix.lower()
            if extension not in self.SUPPORTED_INPUT:
                return {
                    'valid': False,
                    'error': f'Formato não suportado: {extension}. Suportados: {", ".join(self.SUPPORTED_INPUT)}'
                }
            
            # Tentar abrir imagem para validar
            try:
                with Image.open(file_path) as img:
                    width, height = img.size
                    mode = img.mode
                    format_name = img.format
                    
                    # Verificar dimensões razoáveis
                    if width * height > 50_000_000:  # ~50MP
                        return {
                            'valid': False,
                            'error': f'Imagem muito grande ({width}x{height}). Máximo ~50MP'
                        }
                    
                    return {
                        'valid': True,
                        'file_size': file_size,
                        'dimensions': (width, height),
                        'mode': mode,
                        'format': format_name,
                        'extension': extension
                    }
                    
            except Exception as e:
                return {'valid': False, 'error': f'Não é uma imagem válida: {str(e)}'}
                
        except Exception as e:
            return {'valid': False, 'error': f'Erro validando arquivo: {str(e)}'}
    
    def optimize_image(self, img: Image.Image, target_format: str, 
                      quality: int = None, max_width: int = None, 
                      max_height: int = None) -> Image.Image:
        """
        Otimiza imagem com base no formato de destino
        """
        # Copiar imagem para evitar modificar original
        optimized = img.copy()
        
        # Auto-rotacionar baseado em EXIF
        try:
            optimized = ImageOps.exif_transpose(optimized)
        except:
            pass  # Se não tiver EXIF, ignorar
        
        # Resize se necessário
        if max_width or max_height:
            max_w = max_width or self.DEFAULT_MAX_WIDTH
            max_h = max_height or self.DEFAULT_MAX_HEIGHT
            optimized.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
        
        # Otimizações específicas por formato
        if target_format.lower() == 'jpg' or target_format.lower() == 'jpeg':
            # Converter para RGB se necessário
            if optimized.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', optimized.size, (255, 255, 255))
                if optimized.mode == 'P':
                    optimized = optimized.convert('RGBA')
                background.paste(optimized, mask=optimized.split()[-1] if optimized.mode == 'RGBA' else None)
                optimized = background
        
        elif target_format.lower() == 'png':
            # Manter transparência para PNG
            if optimized.mode not in ('RGBA', 'LA', 'P'):
                optimized = optimized.convert('RGBA')
        
        elif target_format.lower() == 'webp':
            # WebP suporta tanto RGB quanto RGBA
            if optimized.mode not in ('RGB', 'RGBA'):
                optimized = optimized.convert('RGBA')
        
        return optimized
    
    def convert_single(self, input_path: str, output_path: str,
                      target_format: Optional[str] = None,
                      quality: int = None, max_width: int = None,
                      max_height: int = None, 
                      compression: bool = True) -> Dict[str, any]:
        """
        Converte uma única imagem
        
        Args:
            input_path: Caminho do arquivo de entrada
            output_path: Caminho do arquivo de saída
            target_format: Formato de destino (inferido da extensão se None)
            quality: Qualidade JPEG/WebP (1-100)
            max_width: Largura máxima
            max_height: Altura máxima
            compression: Aplicar compressão otimizada
        
        Returns:
            Dict com resultado da conversão
        """
        start_time = time.time()
        
        try:
            # Validar arquivo de entrada
            validation = self.validate_file(input_path)
            if not validation['valid']:
                return {'success': False, 'error': validation['error']}
            
            # Determinar formato de destino
            if not target_format:
                target_format = Path(output_path).suffix[1:].lower()
            
            if f'.{target_format}' not in self.SUPPORTED_OUTPUT:
                return {
                    'success': False,
                    'error': f'Formato de saída não suportado: {target_format}'
                }
            
            # Configurar qualidade padrão
            quality = quality or self.DEFAULT_QUALITY
            
            # Abrir e processar imagem
            with Image.open(input_path) as img:
                original_size = validation['file_size']
                original_dimensions = validation['dimensions']
                
                # Otimizar imagem
                optimized_img = self.optimize_image(
                    img, target_format, quality, max_width, max_height
                )
                
                # Preparar opções de salvamento
                save_kwargs = {}
                
                if target_format.lower() in ('jpg', 'jpeg'):
                    save_kwargs.update({
                        'format': 'JPEG',
                        'quality': quality,
                        'optimize': compression,
                        'progressive': compression
                    })
                
                elif target_format.lower() == 'png':
                    save_kwargs.update({
                        'format': 'PNG',
                        'optimize': compression,
                        'compress_level': 6 if compression else 1
                    })
                
                elif target_format.lower() == 'webp':
                    save_kwargs.update({
                        'format': 'WebP',
                        'quality': quality,
                        'method': 6 if compression else 0
                    })
                
                elif target_format.lower() == 'pdf':
                    save_kwargs.update({
                        'format': 'PDF',
                        'resolution': 100.0
                    })
                
                # Salvar imagem
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
                optimized_img.save(output_path, **save_kwargs)
                
                # Calcular estatísticas
                output_size = os.path.getsize(output_path)
                processing_time = time.time() - start_time
                compression_ratio = (1 - output_size / original_size) * 100
                
                # Atualizar estatísticas globais
                self.stats['conversions'] += 1
                self.stats['total_input_size'] += original_size
                self.stats['total_output_size'] += output_size
                self.stats['total_processing_time'] += processing_time
                
                format_key = f"{validation['extension']} → .{target_format}"
                self.stats['formats_processed'][format_key] = \
                    self.stats['formats_processed'].get(format_key, 0) + 1
                
                return {
                    'success': True,
                    'input_size': original_size,
                    'output_size': output_size,
                    'compression_ratio': compression_ratio,
                    'processing_time': processing_time,
                    'original_dimensions': original_dimensions,
                    'final_dimensions': optimized_img.size,
                    'format_conversion': format_key,
                    'output_path': output_path
                }
                
        except Exception as e:
            self.stats['errors'] += 1
            logger.error(f"Erro convertendo {input_path}: {e}")
            return {'success': False, 'error': str(e)}
    
    def convert_to_pdf(self, image_paths: List[str], output_path: str,
                      max_width: int = None, max_height: int = None) -> Dict[str, any]:
        """
        Converte múltiplas imagens para um único PDF
        
        Args:
            image_paths: Lista de caminhos das imagens
            output_path: Caminho do PDF de saída
            max_width: Largura máxima das páginas
            max_height: Altura máxima das páginas
        
        Returns:
            Dict com resultado da conversão
        """
        start_time = time.time()
        
        try:
            if not image_paths:
                return {'success': False, 'error': 'Nenhuma imagem fornecida'}
            
            processed_images = []
            total_input_size = 0
            
            # Processar cada imagem
            for img_path in image_paths:
                validation = self.validate_file(img_path)
                if not validation['valid']:
                    logger.warning(f"Pulando arquivo inválido: {img_path} - {validation['error']}")
                    continue
                
                total_input_size += validation['file_size']
                
                # Abrir e otimizar imagem
                with Image.open(img_path) as img:
                    optimized = self.optimize_image(img, 'pdf', max_width=max_width, max_height=max_height)
                    
                    # Converter para RGB se necessário
                    if optimized.mode not in ('RGB', 'L'):
                        if optimized.mode in ('RGBA', 'LA'):
                            background = Image.new('RGB', optimized.size, (255, 255, 255))
                            background.paste(optimized, mask=optimized.split()[-1] if optimized.mode == 'RGBA' else None)
                            optimized = background
                        else:
                            optimized = optimized.convert('RGB')
                    
                    processed_images.append(optimized.copy())
            
            if not processed_images:
                return {'success': False, 'error': 'Nenhuma imagem válida encontrada'}
            
            # Criar PDF
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            if len(processed_images) == 1:
                processed_images[0].save(output_path, 'PDF', resolution=100.0)
            else:
                processed_images[0].save(
                    output_path, 'PDF', 
                    save_all=True, 
                    append_images=processed_images[1:],
                    resolution=100.0
                )
            
            # Calcular estatísticas
            output_size = os.path.getsize(output_path)
            processing_time = time.time() - start_time
            
            return {
                'success': True,
                'pages_created': len(processed_images),
                'input_size': total_input_size,
                'output_size': output_size,
                'processing_time': processing_time,
                'output_path': output_path,
                'compression_ratio': (1 - output_size / total_input_size) * 100 if total_input_size > 0 else 0
            }
            
        except Exception as e:
            logger.error(f"Erro criando PDF: {e}")
            return {'success': False, 'error': str(e)}
        finally:
            # Limpar imagens da memória
            for img in processed_images:
                try:
                    img.close()
                except:
                    pass
    
    def calculate_price(self, conversion_type: str, file_count: int = 1,
                       has_compression: bool = False, has_resize: bool = False) -> float:
        """
        Calcula preço da conversão
        
        Args:
            conversion_type: Tipo de conversão ('basic', 'compress', 'resize', 'premium', 'batch')
            file_count: Número de arquivos
            has_compression: Se aplica compressão
            has_resize: Se aplica resize
        
        Returns:
            Preço total em R$
        """
        if file_count >= 5:
            return self.PRICING['batch'] * file_count
        
        if has_compression and has_resize:
            base_price = self.PRICING['premium']
        elif has_compression:
            base_price = self.PRICING['compress']
        elif has_resize:
            base_price = self.PRICING['resize']
        else:
            base_price = self.PRICING['basic']
        
        return base_price * file_count
    
    def get_stats(self) -> Dict[str, any]:
        """Retorna estatísticas de uso"""
        stats = self.stats.copy()
        
        if stats['conversions'] > 0:
            stats['avg_compression'] = (
                1 - stats['total_output_size'] / stats['total_input_size']
            ) * 100
            stats['avg_processing_time'] = stats['total_processing_time'] / stats['conversions']
        else:
            stats['avg_compression'] = 0
            stats['avg_processing_time'] = 0
        
        return stats
    
    def cleanup(self):
        """Limpa recursos e arquivos temporários"""
        # Implementar limpeza se necessário
        pass

# Função de conveniência para uso rápido
def convert_image(input_path: str, output_path: str, **kwargs) -> Dict[str, any]:
    """
    Converte uma imagem com parâmetros simples
    
    Args:
        input_path: Arquivo de entrada
        output_path: Arquivo de saída
        **kwargs: Argumentos adicionais (quality, max_width, max_height, etc.)
    
    Returns:
        Resultado da conversão
    """
    converter = ImageConverter()
    return converter.convert_single(input_path, output_path, **kwargs)

if __name__ == "__main__":
    # Exemplo de uso
    converter = ImageConverter()
    print("🖼️ Image Converter Enterprise - Pronto para uso!")
    print(f"Formatos suportados: {', '.join(converter.SUPPORTED_INPUT)} → {', '.join(converter.SUPPORTED_OUTPUT)}")
    print(f"Preços: {converter.PRICING}")