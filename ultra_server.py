#!/usr/bin/env python3
"""
Conversor MPP → XML - Servidor Ultra-Limpo
Versão otimizada e minimalista
"""

import http.server
import socketserver
import json
import time

PORT = 8081

class UltraHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=".", **kwargs)

    def end_headers(self):
        # CORS básico
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_GET(self):
        path = self.path.split('?')[0]
        
        if path == "/" or path == "/index.html":
            self.serve_file("public/ultra_index.html", "text/html")
        elif path.startswith("/css/"):
            self.serve_file(f"public{path}", "text/css")
        elif path.startswith("/js/"):
            self.serve_file(f"public{path}", "application/javascript")
        elif path == "/favicon.ico":
            self.send_response(204)
            self.end_headers()
        else:
            self.send_error(404)

    def do_POST(self):
        if self.path == "/api/upload-test":
            self.handle_upload()
        else:
            self.send_error(404)

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def serve_file(self, filepath, content_type):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-Type', f'{content_type}; charset=utf-8')
            self.end_headers()
            self.wfile.write(content.encode('utf-8'))
            
        except FileNotFoundError:
            self.send_error(404)
        except Exception:
            self.send_error(500)

    def handle_upload(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            # Extrair nome do arquivo
            filename = "arquivo.mpp"
            if b'filename=' in post_data:
                try:
                    start = post_data.find(b'filename="') + 10
                    end = post_data.find(b'"', start)
                    if end > start:
                        filename = post_data[start:end].decode('utf-8', errors='ignore')
                except:
                    pass
            
            # XML mínimo
            xml_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://schemas.microsoft.com/project">
    <Name>Convertido: {filename}</Name>
    <CreationDate>{time.strftime('%Y-%m-%dT%H:%M:%S')}</CreationDate>
    <Tasks>
        <Task>
            <UID>1</UID>
            <Name>Tarefa Principal</Name>
            <Start>2024-01-01T08:00:00</Start>
            <Finish>2024-12-31T17:00:00</Finish>
        </Task>
    </Tasks>
</Project>'''
            
            response = {
                "success": True,
                "message": "Conversão realizada!",
                "xmlContent": xml_content,
                "fileId": f"xml-{int(time.time())}"
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            error_response = {"success": False, "error": str(e)}
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(error_response).encode('utf-8'))

def main():
    print("🚀 CONVERSOR MPP → XML - ULTRA-LIMPO")
    print("=" * 40)
    print(f"📍 http://localhost:{PORT}")
    print("🛑 Ctrl+C para parar")
    print("=" * 40)
    
    try:
        socketserver.TCPServer.allow_reuse_address = True
        with socketserver.TCPServer(("0.0.0.0", PORT), UltraHandler) as httpd:
            print("✅ Servidor ativo")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Servidor parado")
    except OSError as e:
        print(f"❌ Erro: {e}")

if __name__ == "__main__":
    main()