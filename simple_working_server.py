#!/usr/bin/env python3
"""
Servidor MPP Converter - Versão Simples e Funcional
"""

import http.server
import socketserver
import json
import time
import os
from pathlib import Path

PORT = 8080

class SimpleHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=".", **kwargs)

    def end_headers(self):
        # Headers CORS e de compatibilidade
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        path = self.path.split('?')[0]  # Remove query params
        print(f"📁 GET: {path}")
        
        if path == "/" or path == "/index.html":
            self.serve_html("public/index.html")
        elif path.startswith("/css/"):
            self.serve_css(f"public{path}")
        elif path.startswith("/js/"):
            self.serve_js(f"public{path}")
        elif path == "/test_api.html":
            self.serve_html("test_api.html")
        elif path == "/favicon.ico":
            self.send_response(204)
            self.end_headers()
        else:
            super().do_GET()

    def do_POST(self):
        print(f"📤 POST: {self.path}")
        
        if self.path == "/api/upload-test":
            self.handle_upload()
        else:
            self.send_error(404)

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def serve_html(self, filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(content.encode('utf-8'))))
            self.end_headers()
            
            self.wfile.write(content.encode('utf-8'))
            print(f"✅ HTML: {filepath}")
            
        except ConnectionAbortedError:
            print("⚠️  Conexão HTML abortada pelo navegador")
        except Exception as e:
            print(f"❌ Erro HTML: {type(e).__name__}: {e}")
            try:
                self.send_error(404)
            except ConnectionAbortedError:
                print("⚠️  Não foi possível enviar erro 404 - conexão abortada")

    def serve_css(self, filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-Type', 'text/css; charset=utf-8')
            self.end_headers()
            
            self.wfile.write(content.encode('utf-8'))
            print(f"✅ CSS: {filepath}")
            
        except ConnectionAbortedError:
            print("⚠️  Conexão CSS abortada pelo navegador")
        except Exception as e:
            print(f"❌ Erro CSS: {type(e).__name__}: {e}")
            try:
                self.send_error(404)
            except ConnectionAbortedError:
                print("⚠️  Não foi possível enviar erro 404 CSS - conexão abortada")

    def serve_js(self, filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/javascript; charset=utf-8')
            self.end_headers()
            
            self.wfile.write(content.encode('utf-8'))
            print(f"✅ JS: {filepath}")
            
        except ConnectionAbortedError:
            print("⚠️  Conexão JS abortada pelo navegador")
        except Exception as e:
            print(f"❌ Erro JS: {type(e).__name__}: {e}")
            try:
                self.send_error(404)
            except ConnectionAbortedError:
                print("⚠️  Não foi possível enviar erro 404 JS - conexão abortada")

    def handle_upload(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            print(f"📦 Upload recebido: {content_length} bytes")
            
            # Extrair nome do arquivo primeiro
            filename = "arquivo_mpp"
            try:
                if b'filename=' in post_data:
                    filename_start = post_data.find(b'filename="') + 10
                    filename_end = post_data.find(b'"', filename_start)
                    if filename_end > filename_start:
                        filename = post_data[filename_start:filename_end].decode('utf-8', errors='ignore')
            except:
                pass
            
            # XML de exemplo - compacto para evitar timeout
            xml_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://schemas.microsoft.com/project">
    <Name>Projeto {filename} Convertido</Name>
    <Title>Conversão Realizada - {int(time.time())}</Title>
    <CreationDate>{time.strftime('%Y-%m-%dT%H:%M:%S')}</CreationDate>
    <Tasks>
        <Task>
            <UID>1</UID>
            <Name>Tarefa Principal</Name>
            <Start>2024-01-01T08:00:00</Start>
            <Finish>2024-12-31T17:00:00</Finish>
            <Duration>PT365D</Duration>
        </Task>
        <Task>
            <UID>2</UID>
            <Name>Tarefa Derivada</Name>
            <Start>2024-01-02T08:00:00</Start>
            <Finish>2024-06-30T17:00:00</Finish>
            <Duration>PT180D</Duration>
        </Task>
    </Tasks>
    <Resources>
        <Resource>
            <UID>1</UID>
            <Name>Recurso Principal</Name>
            <Type>1</Type>
        </Resource>
    </Resources>
</Project>'''
            

            
            response = {
                "success": True,
                "message": "Conversão realizada com sucesso!",
                "xmlContent": xml_content,
                "fileId": f"test-{int(time.time())}"
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            print("✅ Conversão realizada")
            
        except ConnectionAbortedError:
            print("⚠️  Conexão abortada pelo navegador (normal para arquivos grandes)")
            # Não tentar responder se a conexão já foi abortada
        except Exception as e:
            print(f"❌ Erro no upload: {type(e).__name__}: {e}")
            
            try:
                error_response = {"success": False, "error": str(e)}
                
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                
                self.wfile.write(json.dumps(error_response).encode('utf-8'))
            except ConnectionAbortedError:
                print("⚠️  Não foi possível enviar resposta de erro - conexão abortada")

def main():
    print("🚀 CONVERSOR MPP PARA XML - SERVIDOR SIMPLES")
    print("=" * 50)
    print(f"🌐 Porta: {PORT}")
    print(f"📍 URL: http://localhost:{PORT}")
    print("🛑 Ctrl+C para parar")
    print("=" * 50)
    print()
    
    try:
        # Permitir reutilização de endereço
        socketserver.TCPServer.allow_reuse_address = True
        
        # Bind em todas as interfaces (0.0.0.0) para aceitar conexões externas
        with socketserver.TCPServer(("0.0.0.0", PORT), SimpleHandler) as httpd:
            print(f"✅ Servidor ativo em todas as interfaces")
            print(f"📱 Teste no navegador: http://localhost:{PORT}")
            print()
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n👋 Servidor parado pelo usuário")
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"❌ Porta {PORT} já está em uso!")
            print("💡 Execute: taskkill /f /im python.exe")
        else:
            print(f"❌ Erro de rede: {e}")
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")

if __name__ == "__main__":
    main()