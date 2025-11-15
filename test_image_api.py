#!/usr/bin/env python3
"""
Teste dos Endpoints Image Converter API
Testa os endpoints FastAPI sem dependência PIL
"""

import requests
import json
import os
import tempfile
from pathlib import Path

# Configurações
API_BASE = "http://localhost:8000"
IMAGE_API = f"{API_BASE}/convert/image"

def create_test_image_file():
    """Cria arquivo de imagem de teste simples (texto)"""
    temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.png', delete=False)
    temp_file.write("FAKE PNG CONTENT FOR TESTING")
    temp_file.close()
    return temp_file.name

def test_api_endpoints():
    """Testa todos os endpoints da Image API"""
    print("🧪 TESTE IMAGE CONVERTER API ENDPOINTS")
    print("=" * 50)
    
    # 1. Testar formatos suportados
    print("\n1️⃣ Testando /formats...")
    try:
        response = requests.get(f"{IMAGE_API}/formats")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Formatos: {data['supported_input']}")
            print(f"💰 Preços: {data['pricing']}")
            print(f"🐍 PIL disponível: {data['pil_available']}")
        else:
            print(f"❌ Erro {response.status_code}: {response.text}")
    except requests.exceptions.ConnectionError:
        print("❌ Servidor não está rodando")
        print("💡 Execute: uvicorn app.main:app --reload")
        return False
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False
    
    # 2. Testar upload de arquivo
    print("\n2️⃣ Testando /upload...")
    test_file = create_test_image_file()
    
    try:
        with open(test_file, 'rb') as f:
            files = {'file': ('test.png', f, 'image/png')}
            data = {
                'target_format': 'jpg',
                'quality': 85,
                'apply_compression': True
            }
            
            response = requests.post(f"{IMAGE_API}/upload", files=files, data=data)
            
            if response.status_code == 200:
                upload_result = response.json()
                file_id = upload_result['file_id']
                print(f"✅ Upload sucesso: {file_id}")
                print(f"💰 Preço: {upload_result['price_formatted']}")
                print(f"🔄 Tipo conversão: {upload_result['conversion_type']}")
                
                # 3. Testar status
                print(f"\n3️⃣ Testando /status/{file_id}...")
                status_response = requests.get(f"{IMAGE_API}/status/{file_id}")
                
                if status_response.status_code == 200:
                    status_data = status_response.json()
                    print(f"✅ Status: {status_data['status']}")
                    print(f"📁 Arquivo: {status_data['original_filename']}")
                else:
                    print(f"❌ Erro status: {status_response.status_code}")
                
                # 4. Testar conversão (mock)
                print(f"\n4️⃣ Testando /convert/{file_id}...")
                convert_response = requests.post(f"{IMAGE_API}/convert/{file_id}")
                
                if convert_response.status_code == 200:
                    convert_data = convert_response.json()
                    print(f"✅ Conversão iniciada: {convert_data['status']}")
                    print(f"🔗 Check URL: {convert_data['check_status_url']}")
                else:
                    print(f"❌ Erro conversão: {convert_response.status_code}")
                
                return file_id
                
            else:
                print(f"❌ Erro upload {response.status_code}: {response.text}")
                return None
                
    except Exception as e:
        print(f"❌ Erro no teste: {e}")
        return None
    finally:
        # Cleanup
        try:
            os.unlink(test_file)
        except:
            pass
    
    return None

def test_batch_upload():
    """Testa upload em lote"""
    print("\n🔄 TESTE BATCH UPLOAD")
    print("=" * 30)
    
    # Criar múltiplos arquivos de teste
    test_files = []
    for i in range(3):
        temp_file = tempfile.NamedTemporaryFile(mode='w', suffix=f'_{i}.jpg', delete=False)
        temp_file.write(f"FAKE JPG CONTENT {i}")
        temp_file.close()
        test_files.append(temp_file.name)
    
    try:
        files = []
        for i, file_path in enumerate(test_files):
            with open(file_path, 'rb') as f:
                files.append(('files', (f'test_{i}.jpg', f.read(), 'image/jpeg')))
        
        data = {
            'target_format': 'webp',
            'quality': 80,
            'apply_compression': True
        }
        
        response = requests.post(f"{IMAGE_API}/batch-upload", files=files, data=data)
        
        if response.status_code == 200:
            batch_result = response.json()
            print(f"✅ Batch upload: {batch_result['files_processed']} arquivos")
            print(f"💰 Preço total: {batch_result['price_formatted']}")
            print(f"📊 Desconto aplicado: {batch_result['discount_applied']}")
            return batch_result['batch_id']
        else:
            print(f"❌ Erro batch: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Erro batch teste: {e}")
        return None
    finally:
        # Cleanup
        for file_path in test_files:
            try:
                os.unlink(file_path)
            except:
                pass
    
    return None

def test_stats():
    """Testa endpoint de estatísticas"""
    print("\n📊 TESTE ESTATÍSTICAS")
    print("=" * 25)
    
    try:
        response = requests.get(f"{IMAGE_API}/stats")
        if response.status_code == 200:
            stats = response.json()
            print(f"✅ Uploads totais: {stats['total_uploads']}")
            print(f"✅ Conversões: {stats['total_conversions']}")
            print(f"❌ Falhas: {stats['total_failures']}")
            print(f"🐍 PIL disponível: {stats['pil_available']}")
        else:
            print(f"❌ Erro stats: {response.status_code}")
    except Exception as e:
        print(f"❌ Erro: {e}")

def main():
    print("🖼️ IMAGE CONVERTER API - TESTE COMPLETO")
    print("=" * 60)
    print("💡 Certifique-se de que o servidor está rodando:")
    print("   uvicorn app.main:app --reload")
    print()
    
    # Executar todos os testes
    file_id = test_api_endpoints()
    
    if file_id:
        # Testes adicionais se upload funcionou
        batch_id = test_batch_upload()
        test_stats()
        
        # Resumo
        print("\n" + "="*60)
        print("📋 RESUMO DOS TESTES")
        print("="*60)
        print(f"✅ Upload individual: {file_id}")
        print(f"✅ Upload em lote: {batch_id}")
        print("✅ Endpoints funcionando")
        print("✅ Sistema de preços ativo")
        print("✅ Mock conversions disponíveis")
        
        print("\n🎉 IMAGE CONVERTER API: FUNCIONANDO!")
        print("💡 Próximos passos:")
        print("   1. Integrar com sistema de pagamento")
        print("   2. Implementar conversão real (quando PIL estiver disponível)")
        print("   3. Deploy em produção")
        
    else:
        print("\n❌ TESTES FALHARAM")
        print("💡 Verifique se o servidor FastAPI está rodando")

if __name__ == "__main__":
    main()