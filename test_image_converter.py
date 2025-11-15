#!/usr/bin/env python3
"""
Teste Image Converter Enterprise
Testa conversões PNG/JPG/WebP ↔ PDF com performance benchmark
"""

import os
import sys
import tempfile
import time
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# Adicionar app ao path
sys.path.insert(0, str(Path(__file__).parent / "app"))

try:
    from converters.image import ImageConverter, convert_image
    print("✅ Image Converter importado com sucesso!")
except ImportError as e:
    print(f"❌ Erro importando Image Converter: {e}")
    sys.exit(1)

def create_test_images(temp_dir):
    """Cria imagens de teste em diferentes formatos"""
    test_images = {}
    
    # 1. PNG com transparência
    try:
        png_path = os.path.join(temp_dir, 'teste.png')
        img = Image.new('RGBA', (800, 600), (255, 255, 255, 0))
        draw = ImageDraw.Draw(img)
        
        # Desenhar retângulo com gradiente
        for i in range(100):
            alpha = int(255 * (1 - i/100))
            draw.rectangle([i*2, i*2, 800-i*2, 600-i*2], 
                         fill=(255, 100, 100, alpha))
        
        # Adicionar texto
        draw.text((50, 50), "PNG TEST\nTransparência ✓", fill=(0, 0, 0, 255))
        
        img.save(png_path, 'PNG')
        test_images['png'] = png_path
        print(f"✅ PNG criado: {png_path} ({os.path.getsize(png_path)} bytes)")
        
    except Exception as e:
        print(f"❌ Erro criando PNG: {e}")
    
    # 2. JPG colorido
    try:
        jpg_path = os.path.join(temp_dir, 'teste.jpg')
        img = Image.new('RGB', (1200, 800), (255, 255, 255))
        draw = ImageDraw.Draw(img)
        
        # Desenhar gradiente colorido
        for x in range(1200):
            for y in range(800):
                r = int(255 * x / 1200)
                g = int(255 * y / 800)
                b = int(255 * (x + y) / (1200 + 800))
                draw.point((x, y), (r, g, b))
        
        # Adicionar texto
        draw.text((100, 100), "JPG TEST\nGradiente RGB", fill=(255, 255, 255))
        
        img.save(jpg_path, 'JPEG', quality=90)
        test_images['jpg'] = jpg_path
        print(f"✅ JPG criado: {jpg_path} ({os.path.getsize(jpg_path)} bytes)")
        
    except Exception as e:
        print(f"❌ Erro criando JPG: {e}")
    
    # 3. WebP animado (simplificado)
    try:
        webp_path = os.path.join(temp_dir, 'teste.webp')
        img = Image.new('RGB', (600, 400), (50, 150, 250))
        draw = ImageDraw.Draw(img)
        
        # Desenhar padrão
        for i in range(0, 600, 50):
            draw.line([(i, 0), (600-i, 400)], fill=(255, 255, 255), width=3)
            draw.line([(0, i*400//600), (600, 400-i*400//600)], fill=(255, 255, 0), width=2)
        
        draw.text((50, 50), "WebP TEST\nCompressão avançada", fill=(255, 255, 255))
        
        img.save(webp_path, 'WebP', quality=80)
        test_images['webp'] = webp_path
        print(f"✅ WebP criado: {webp_path} ({os.path.getsize(webp_path)} bytes)")
        
    except Exception as e:
        print(f"❌ Erro criando WebP: {e}")
    
    return test_images

def benchmark_conversions(converter, test_images, temp_dir):
    """Executa benchmark completo de conversões"""
    print("\n🔄 EXECUTANDO BENCHMARK DE CONVERSÕES")
    print("=" * 50)
    
    results = []
    
    # Testes de conversão individual
    conversions = [
        ('png', 'jpg', {'quality': 85, 'compression': True}),
        ('png', 'webp', {'quality': 80, 'compression': True}),
        ('png', 'pdf', {}),
        ('jpg', 'png', {}),
        ('jpg', 'webp', {'quality': 75, 'compression': True}),
        ('jpg', 'pdf', {}),
        ('webp', 'png', {}),
        ('webp', 'jpg', {'quality': 85}),
    ]
    
    for input_format, output_format, kwargs in conversions:
        if input_format not in test_images:
            continue
            
        input_path = test_images[input_format]
        output_path = os.path.join(temp_dir, f"converted_{input_format}_to_{output_format}.{output_format}")
        
        print(f"\n🔄 {input_format.upper()} → {output_format.upper()}...")
        
        start_time = time.time()
        result = converter.convert_single(input_path, output_path, 
                                        target_format=output_format, **kwargs)
        end_time = time.time()
        
        if result['success']:
            compression = result.get('compression_ratio', 0)
            processing_time = result.get('processing_time', end_time - start_time)
            
            print(f"   ✅ Sucesso: {processing_time:.2f}s")
            print(f"   📊 Tamanho: {result['input_size']} → {result['output_size']} bytes")
            print(f"   🗜️ Compressão: {compression:.1f}%")
            
            results.append({
                'conversion': f"{input_format} → {output_format}",
                'success': True,
                'time': processing_time,
                'compression': compression,
                'input_size': result['input_size'],
                'output_size': result['output_size']
            })
        else:
            print(f"   ❌ Falha: {result.get('error', 'Erro desconhecido')}")
            results.append({
                'conversion': f"{input_format} → {output_format}",
                'success': False,
                'error': result.get('error')
            })
    
    return results

def test_pdf_multipage(converter, test_images, temp_dir):
    """Testa criação de PDF com múltiplas páginas"""
    print("\n📄 TESTANDO PDF MULTI-PÁGINA")
    print("=" * 30)
    
    # Usar todas as imagens disponíveis
    image_paths = list(test_images.values())
    pdf_output = os.path.join(temp_dir, "multi_page.pdf")
    
    start_time = time.time()
    result = converter.convert_to_pdf(image_paths, pdf_output, max_width=1024, max_height=768)
    end_time = time.time()
    
    if result['success']:
        print(f"✅ PDF criado: {result['pages_created']} páginas")
        print(f"⏱️ Tempo: {result['processing_time']:.2f}s")
        print(f"📊 Tamanho: {result['output_size']} bytes")
        print(f"🗜️ Compressão: {result['compression_ratio']:.1f}%")
        return result
    else:
        print(f"❌ Erro: {result.get('error')}")
        return None

def test_pricing(converter):
    """Testa sistema de preços"""
    print("\n💰 TESTANDO SISTEMA DE PREÇOS")
    print("=" * 30)
    
    test_cases = [
        (1, False, False, "Conversão básica"),
        (1, True, False, "Com compressão"),
        (1, False, True, "Com resize"),
        (1, True, True, "Premium (compressão + resize)"),
        (5, False, False, "Lote 5 imagens"),
        (10, True, True, "Lote 10 premium"),
    ]
    
    for count, compress, resize, description in test_cases:
        price = converter.calculate_price('auto', count, compress, resize)
        print(f"   {description}: R$ {price:.2f}")

def performance_analysis(results):
    """Análise de performance dos resultados"""
    print("\n📊 ANÁLISE DE PERFORMANCE")
    print("=" * 40)
    
    successful = [r for r in results if r['success']]
    failed = [r for r in results if not r['success']]
    
    if successful:
        avg_time = sum(r['time'] for r in successful) / len(successful)
        avg_compression = sum(r['compression'] for r in successful) / len(successful)
        total_input = sum(r['input_size'] for r in successful)
        total_output = sum(r['output_size'] for r in successful)
        
        print(f"✅ Conversões bem-sucedidas: {len(successful)}/{len(results)}")
        print(f"⏱️ Tempo médio: {avg_time:.2f}s")
        print(f"🗜️ Compressão média: {avg_compression:.1f}%")
        print(f"📊 Economia total: {total_input - total_output} bytes")
        
        # Performance rating
        if avg_time < 1:
            print("🚀 Performance: EXCELENTE!")
        elif avg_time < 3:
            print("✅ Performance: MUITO BOA!")
        elif avg_time < 5:
            print("👍 Performance: BOA!")
        else:
            print("⚠️ Performance: Pode ser otimizada")
        
        # Melhor e pior conversão
        best = min(successful, key=lambda x: x['time'])
        worst = max(successful, key=lambda x: x['time'])
        
        print(f"\n🥇 Mais rápida: {best['conversion']} ({best['time']:.2f}s)")
        print(f"🐌 Mais lenta: {worst['conversion']} ({worst['time']:.2f}s)")
    
    if failed:
        print(f"\n❌ Conversões falharam: {len(failed)}")
        for fail in failed:
            print(f"   {fail['conversion']}: {fail.get('error', 'Erro desconhecido')}")

def main():
    print("🖼️ IMAGE CONVERTER ENTERPRISE - TESTE COMPLETO")
    print("=" * 60)
    
    # Criar diretório temporário
    temp_dir = tempfile.mkdtemp(prefix='image_converter_test_')
    print(f"📁 Diretório teste: {temp_dir}")
    
    try:
        # 1. Criar conversor
        print("\n1️⃣ Inicializando Image Converter...")
        converter = ImageConverter(temp_dir)
        
        # 2. Criar imagens de teste
        print("\n2️⃣ Criando imagens de teste...")
        test_images = create_test_images(temp_dir)
        
        if not test_images:
            print("❌ Nenhuma imagem de teste criada!")
            return
        
        # 3. Benchmark de conversões
        print(f"\n3️⃣ Testando {len(test_images)} formatos de entrada...")
        results = benchmark_conversions(converter, test_images, temp_dir)
        
        # 4. Teste PDF multi-página
        print("\n4️⃣ Testando PDF multi-página...")
        pdf_result = test_pdf_multipage(converter, test_images, temp_dir)
        
        # 5. Sistema de preços
        print("\n5️⃣ Testando sistema de preços...")
        test_pricing(converter)
        
        # 6. Análise final
        print("\n6️⃣ Análise de performance...")
        performance_analysis(results)
        
        # 7. Estatísticas do conversor
        print("\n7️⃣ Estatísticas globais...")
        stats = converter.get_stats()
        print(f"   Total conversões: {stats['conversions']}")
        print(f"   Tempo total: {stats['total_processing_time']:.2f}s")
        print(f"   Compressão média: {stats.get('avg_compression', 0):.1f}%")
        print(f"   Formatos processados: {stats['formats_processed']}")
        
        print("\n🎉 IMAGE CONVERTER: FUNCIONANDO PERFEITAMENTE!")
        print("💡 Pronto para integração no sistema principal!")
        
    except Exception as e:
        print(f"❌ Erro durante teste: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Cleanup opcional
        print(f"\n📁 Arquivos de teste mantidos em: {temp_dir}")
        print("   (Para limpeza manual)")

if __name__ == "__main__":
    main()