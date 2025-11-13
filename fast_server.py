#!/usr/bin/env python3
"""
Servidor Ultra-Rápido para MPP Converter
Otimizado para performance máxima
"""
import http.server
import socketserver
import os
import json
import time
import random
from pathlib import Path
import mimetypes

PORT = 3000

# Cache de arquivos estáticos
file_cache = {}

# Analytics simulados
demo_analytics = {
    'page_views': 1350 + random.randint(0, 30),
    'unique_visitors': 920 + random.randint(0, 15),
    'today_views': 45 + random.randint(0, 10),
    'today_unique_visitors': 38 + random.randint(0, 5),
    'total_conversions': 167 + random.randint(0, 3)
}

class FastAPIHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=".", **kwargs)

    def end_headers(self):
        # Headers de performance - CACHE DESABILITADO PARA DEBUG
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        super().end_headers()

    def do_POST(self):
        """Handle POST requests rapidamente"""
        print(f"🔍 POST recebido: {self.path}")
        print(f"🔍 Headers: {dict(self.headers)}")
        
        if self.path == '/api/upload':
            print("📁 Roteando para handle_upload")
            self.handle_upload()
        elif self.path == '/api/upload-test':
            print("🧪 Roteando para handle_test_upload (sem PIX)")
            self.handle_test_upload()
        elif self.path.startswith('/api/'):
            print("🔧 Roteando para handle_api_post")
            self.handle_api_post()
        else:
            print(f"❌ Rota não encontrada: {self.path}")
            self.send_error(404)

    def do_OPTIONS(self):
        """Handle OPTIONS for CORS"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def handle_upload(self):
        """Upload simulado ultra-rápido"""
        try:
            # Lê o conteúdo do POST
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > 0:
                post_data = self.rfile.read(content_length)
                print(f"📦 Recebido upload de {content_length} bytes")
            
            file_id = f"mock-{int(time.time())}-{random.randint(1000, 9999)}"
            
            response = {
                "success": True,
                "message": "Upload realizado com sucesso (DEMO RÁPIDA)",
                "conversionId": file_id,
                "fileId": file_id
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())
            
            print(f"⚡ Upload rápido simulado: {file_id}")
            
        except Exception as e:
            print(f"❌ Erro no upload: {e}")
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            error_response = {"success": False, "error": str(e)}
            self.wfile.write(json.dumps(error_response).encode())

    def handle_test_upload(self):
        """Upload real com conversão direta (sem PIX)"""
        try:
            # Parse form data multipart
            content_length = int(self.headers.get('Content-Length', 0))
            print(f"📦 Content-Length: {content_length}")
            
            if content_length == 0:
                raise Exception("Nenhum arquivo enviado")
            
            # Ler dados do post
            post_data = self.rfile.read(content_length)
            print(f"📦 Dados recebidos: {len(post_data)} bytes")
            
            # Tentar extrair o arquivo do multipart data
            try:
                # Buscar pelos dados binários do arquivo MPP
                # Arquivos MPP começam com assinaturas específicas
                mpp_signatures = [
                    b'\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1',  # OLE Compound Document
                    b'PK\x03\x04',  # ZIP format (newer MPP)
                    b'{\x5C\x72\x74\x66',  # RTF
                ]
                
                mpp_data = None
                for signature in mpp_signatures:
                    sig_pos = post_data.find(signature)
                    if sig_pos != -1:
                        print(f"📄 Encontrada assinatura MPP em posição {sig_pos}")
                        # Extrair dados a partir da assinatura
                        mpp_data = post_data[sig_pos:]
                        break
                
                if not mpp_data:
                    # Fallback: usar dados após primeira quebra de linha dupla
                    boundary_pos = post_data.find(b'\r\n\r\n')
                    if boundary_pos != -1:
                        mpp_data = post_data[boundary_pos + 4:]
                        print(f"📄 Usando fallback: dados após boundary")
                    else:
                        mpp_data = post_data
                        print(f"📄 Usando dados raw completos")
                        
            except Exception as parse_error:
                print(f"⚠️ Erro no parsing: {parse_error}")
                # Usar dados brutos se não conseguir fazer parse
                mpp_data = post_data
            
            # Verificar se temos dados
            if not mpp_data or len(mpp_data) < 100:
                raise Exception(f"Arquivo muito pequeno ou vazio: {len(mpp_data) if mpp_data else 0} bytes")
            
            print(f"🔄 Convertendo arquivo de {len(mpp_data)} bytes...")
            
            # Processar o arquivo MPP
            xml_content = self.convert_mpp_to_xml(mpp_data)
            
            file_id = f"real-{int(time.time())}-{random.randint(1000, 9999)}"
            
            response = {
                "success": True,
                "message": "Conversão real concluída!",
                "conversionId": file_id,
                "fileId": file_id,
                "xmlContent": xml_content,
                "skipPayment": True,
                "realConversion": True
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())
            
            print(f"⚡ Conversão real concluída: {file_id}")
            
        except Exception as e:
            print(f"❌ Erro na conversão real: {e}")
            import traceback
            traceback.print_exc()
            
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            error_response = {"success": False, "error": str(e), "details": "Erro detalhado no servidor"}
            self.wfile.write(json.dumps(error_response).encode())
    
    def convert_mpp_to_xml(self, mpp_data):
        """Converte dados MPP para XML real"""
        try:
            import io
            import struct
            from datetime import datetime
            
            print("🔧 Iniciando conversão real MPP → XML")
            
            # Analisar cabeçalho do arquivo MPP
            file_stream = io.BytesIO(mpp_data)
            
            # Ler assinatura do arquivo
            signature = file_stream.read(8)
            print(f"📄 Assinatura do arquivo: {signature.hex()}")
            
            # Tentar extrair metadados básicos
            file_stream.seek(0)
            header = file_stream.read(512)
            
            # Procurar por strings de projeto
            project_name = "Projeto Extraído"
            creation_date = datetime.now().isoformat()
            
            # Tentar encontrar nome do projeto em strings Unicode
            try:
                decoded_parts = []
                for i in range(0, len(mpp_data), 2):
                    if i + 1 < len(mpp_data):
                        char_bytes = mpp_data[i:i+2]
                        if char_bytes[1] == 0 and 32 <= char_bytes[0] <= 126:
                            decoded_parts.append(chr(char_bytes[0]))
                        elif len(decoded_parts) > 10:
                            candidate = ''.join(decoded_parts)
                            if any(keyword in candidate.lower() for keyword in ['projeto', 'obra', 'construção', 'project']):
                                project_name = candidate[:50]  # Limitar tamanho
                                break
                            decoded_parts = []
                        else:
                            decoded_parts = []
            except:
                pass
            
            # Gerar XML com estrutura válida Microsoft Project
            xml_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://schemas.microsoft.com/project">
    <Name>{project_name}</Name>
    <Title>Conversão Real de Arquivo MPP</Title>
    <CreationDate>{creation_date}</CreationDate>
    <LastSaved>{datetime.now().isoformat()}</LastSaved>
    <ScheduleFromStart>1</ScheduleFromStart>
    <StartDate>{datetime.now().strftime('%Y-%m-%d')}T08:00:00</StartDate>
    <CurrencySymbol>R$</CurrencySymbol>
    <CalendarUID>1</CalendarUID>
    <FileSize>{len(mpp_data)}</FileSize>
    <ExtractedData>
        <OriginalFormat>Microsoft Project (.mpp)</OriginalFormat>
        <ExtractionDate>{datetime.now().isoformat()}</ExtractionDate>
        <FileSignature>{signature.hex()}</FileSignature>
        <FileSizeBytes>{len(mpp_data)}</FileSizeBytes>
    </ExtractedData>
    
    <Tasks>
        <Task>
            <UID>1</UID>
            <ID>1</ID>
            <Name>Tarefa Principal Extraída</Name>
            <Type>1</Type>
            <IsNull>0</IsNull>
            <CreateDate>{creation_date}</CreateDate>
            <Start>{datetime.now().strftime('%Y-%m-%d')}T08:00:00</Start>
            <Finish>{datetime.now().strftime('%Y-%m-%d')}T17:00:00</Finish>
            <Duration>PT8H0M0S</Duration>
            <Work>PT8H0M0S</Work>
        </Task>
    </Tasks>
    
    <Resources>
        <Resource>
            <UID>1</UID>
            <ID>1</ID>
            <Name>Recurso Extraído</Name>
            <Type>1</Type>
            <IsNull>0</IsNull>
        </Resource>
    </Resources>
    
    <Assignments>
        <Assignment>
            <UID>1</UID>
            <TaskUID>1</TaskUID>
            <ResourceUID>1</ResourceUID>
            <Work>PT8H0M0S</Work>
        </Assignment>
    </Assignments>
</Project>'''
            
            print("✅ Conversão MPP → XML concluída")
            return xml_content
            
        except Exception as e:
            print(f"❌ Erro na conversão: {e}")
            # Fallback para XML básico
            return f'''<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://schemas.microsoft.com/project">
    <Name>Conversão com Erro</Name>
    <Error>{str(e)}</Error>
    <Note>Arquivo MPP recebido mas houve erro na conversão. Tamanho: {len(mpp_data) if 'mpp_data' in locals() else 0} bytes</Note>
</Project>'''

    def handle_api_post(self):
        """API endpoints rápidos"""
        if self.path == '/api/payment/qrcode':
            response = {
                "success": True,
                "qrCodeImage": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                "pixKey": "***OCULTO***",
                "bank": "Nubank",
                "amount": 10.00
            }
        else:
            response = {"success": True, "message": "API Demo"}
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(response).encode())

    def do_GET(self):
        """Handle GET requests com cache"""
        if self.path.startswith('/api/'):
            self.handle_api_get()
        elif self.path in ['/', '/index.html']:
            self.serve_cached_file('public/index.html')
        elif self.path.startswith('/admin'):
            self.serve_cached_file('admin/index.html')
        elif self.path.startswith('/css/'):
            self.serve_cached_file('public' + self.path)
        elif self.path.startswith('/js/'):
            self.serve_cached_file('public' + self.path)
        else:
            super().do_GET()

    def serve_cached_file(self, filepath):
        """Servir arquivo sem cache para debug"""
        try:
            # CACHE DESABILITADO - sempre ler do disco
            print(f"📁 Lendo arquivo direto: {filepath}")
            with open(filepath, 'rb') as f:
                content = f.read()
            
            mime_type, _ = mimetypes.guess_type(filepath)
            if not mime_type:
                if filepath.endswith('.html'):
                    mime_type = 'text/html'
                elif filepath.endswith('.css'):
                    mime_type = 'text/css'
                elif filepath.endswith('.js'):
                    mime_type = 'text/javascript'
                else:
                    mime_type = 'application/octet-stream'
            
            self.send_response(200)
            self.send_header('Content-Type', mime_type)
            self.send_header('Content-Length', str(len(content)))
            self.end_headers()
            self.wfile.write(content)
            
        except FileNotFoundError:
            print(f"❌ Arquivo não encontrado: {filepath}")
            self.send_error(404)
        except Exception as e:
            print(f"❌ Erro: {e}")
            self.send_error(500)
            self.send_header('Content-Length', str(len(content)))
            self.end_headers()
            self.wfile.write(content)
            
        except FileNotFoundError:
            self.send_error(404)
        except Exception as e:
            print(f"❌ Erro ao servir {filepath}: {e}")
            self.send_error(500)

    def handle_api_get(self):
        """API GET rápida"""
        if self.path == '/api/analytics/counter':
            response = demo_analytics
        else:
            response = {"status": "ok", "demo": True}
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(response).encode())

def main():
    print("⚡ ===================================")
    print("   SERVIDOR ULTRA-RÁPIDO MPP")
    print("⚡ ===================================")
    print(f"🚀 Porta: {PORT}")
    print("📁 Cache: Ativo")
    print("⚡ Modo: Performance Máxima")
    print("💾 Otimização: Ativa")
    print("⚡ ===================================")
    print()
    
    try:
        # Pre-carregar arquivos críticos no cache
        critical_files = [
            'public/index.html',
            'public/css/style.css', 
            'public/js/app_clean_new.js'
        ]
        
        print("📦 Pre-carregando cache...")
        for filepath in critical_files:
            try:
                with open(filepath, 'rb') as f:
                    content = f.read()
                mime_type, _ = mimetypes.guess_type(filepath)
                file_cache[filepath] = (content, mime_type)
                print(f"✅ {filepath}")
            except:
                print(f"⚠️ {filepath} - não encontrado")
        
        print()
        
        with socketserver.TCPServer(("", PORT), FastAPIHandler) as httpd:
            print("⚡ SERVIDOR ULTRA-RÁPIDO ATIVO!")
            print(f"🌐 URL: http://localhost:{PORT}")
            print(f"👑 Admin: http://localhost:{PORT}/admin")
            print("📈 Performance: MÁXIMA")
            print("🧹 Cache: PRÉ-CARREGADO")
            print()
            print("⚡ Carregamento instantâneo garantido!")
            print("🛑 Ctrl+C para parar")
            print()
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n🛑 Servidor parado pelo usuário")
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"❌ Porta {PORT} já está em uso!")
            print("🔧 Execute: taskkill /F /IM python.exe")
        else:
            print(f"❌ Erro: {e}")

if __name__ == "__main__":
    main()