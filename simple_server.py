#!/usr/bin/env python3
"""
Servidor MPP Converter - Versão Estável
"""

import http.server
import socketserver
import json
import time
import random
from pathlib import Path

PORT = 3000

class MPPHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=".", **kwargs)

    def do_GET(self):
        print(f"📁 GET: {self.path}")
        
        if self.path == "/" or self.path.startswith("/?"):
            self.serve_file("public/index.html", "text/html")
        elif self.path.startswith("/js/"):
            self.serve_file(f"public{self.path}", "application/javascript")
        elif self.path.startswith("/css/"):
            self.serve_file(f"public{self.path}", "text/css")
        elif self.path == "/admin":
            self.serve_file("admin/index.html", "text/html")
        else:
            super().do_GET()

    def do_POST(self):
        print(f"📤 POST: {self.path}")
        
        if self.path == "/api/upload-test":
            self.handle_test_upload()
        elif self.path == "/api/upload":
            self.handle_regular_upload()
        else:
            self.send_error(404)

    def serve_file(self, filepath, content_type):
        try:
            with open(filepath, 'rb') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(content)
            print(f"✅ Served: {filepath}")
        except FileNotFoundError:
            self.send_error(404, f"File not found: {filepath}")
        except Exception as e:
            print(f"❌ Error serving {filepath}: {e}")
            self.send_error(500)

    def handle_test_upload(self):
        """Conversão de teste sem PIX"""
        try:
            # Lê dados do upload
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                raise Exception("Nenhum arquivo enviado")
            
            post_data = self.rfile.read(content_length)
            print(f"📦 Arquivo recebido: {content_length} bytes")
            
            # Simular conversão
            time.sleep(1)  # Simular processamento
            
            # Gerar XML de exemplo
            xml_content = self.generate_sample_xml()
            
            response = {
                "success": True,
                "message": "Conversão realizada com sucesso!",
                "xmlContent": xml_content,
                "fileId": f"test-{int(time.time())}"
            }
            
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())
            
            print("✅ Conversão de teste concluída")
            
        except Exception as e:
            print(f"❌ Erro na conversão: {e}")
            
            error_response = {
                "success": False,
                "error": str(e)
            }
            
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(error_response).encode())

    def handle_regular_upload(self):
        """Upload regular para PIX"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            response = {
                "success": True,
                "message": "Upload realizado com sucesso!",
                "fileId": f"upload-{int(time.time())}-{random.randint(1000, 9999)}"
            }
            
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())
            
        except Exception as e:
            print(f"❌ Erro no upload: {e}")
            self.send_error(500)

    def generate_sample_xml(self):
        """Gera XML de exemplo baseado em Microsoft Project"""
        return '''<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://schemas.microsoft.com/project">
    <Name>Projeto Convertido</Name>
    <Title>Conversão de Arquivo MPP</Title>
    <CreationDate>2024-11-13T00:00:00</CreationDate>
    <LastSaved>2024-11-13T00:00:00</LastSaved>
    <ScheduleFromStart>1</ScheduleFromStart>
    <StartDate>2024-01-01T08:00:00</StartDate>
    <FinishDate>2024-12-31T17:00:00</FinishDate>
    <CalendarUID>1</CalendarUID>
    <DefaultStartTime>08:00:00</DefaultStartTime>
    <DefaultFinishTime>17:00:00</DefaultFinishTime>
    
    <Tasks>
        <Task>
            <UID>1</UID>
            <ID>1</ID>
            <Name>Início do Projeto</Name>
            <Type>0</Type>
            <Start>2024-01-01T08:00:00</Start>
            <Finish>2024-01-01T08:00:00</Finish>
            <Duration>PT0H0M0S</Duration>
            <DurationFormat>7</DurationFormat>
            <Work>PT0H0M0S</Work>
            <Milestone>1</Milestone>
        </Task>
        
        <Task>
            <UID>2</UID>
            <ID>2</ID>
            <Name>Fase de Planejamento</Name>
            <Type>0</Type>
            <Start>2024-01-02T08:00:00</Start>
            <Finish>2024-01-31T17:00:00</Finish>
            <Duration>PT200H0M0S</Duration>
            <DurationFormat>7</DurationFormat>
            <Work>PT200H0M0S</Work>
        </Task>
        
        <Task>
            <UID>3</UID>
            <ID>3</ID>
            <Name>Fase de Execução</Name>
            <Type>0</Type>
            <Start>2024-02-01T08:00:00</Start>
            <Finish>2024-11-30T17:00:00</Finish>
            <Duration>PT2000H0M0S</Duration>
            <DurationFormat>7</DurationFormat>
            <Work>PT2000H0M0S</Work>
        </Task>
        
        <Task>
            <UID>4</UID>
            <ID>4</ID>
            <Name>Finalização</Name>
            <Type>0</Type>
            <Start>2024-12-01T08:00:00</Start>
            <Finish>2024-12-31T17:00:00</Finish>
            <Duration>PT200H0M0S</Duration>
            <DurationFormat>7</DurationFormat>
            <Work>PT200H0M0S</Work>
        </Task>
    </Tasks>
    
    <Resources>
        <Resource>
            <UID>1</UID>
            <ID>1</ID>
            <Name>Gerente de Projeto</Name>
            <Type>1</Type>
            <IsNull>0</IsNull>
        </Resource>
        
        <Resource>
            <UID>2</UID>
            <ID>2</ID>
            <Name>Equipe Técnica</Name>
            <Type>1</Type>
            <IsNull>0</IsNull>
        </Resource>
    </Resources>
</Project>'''

def main():
    print("🚀 ===================================")
    print("   SERVIDOR MPP CONVERTER")
    print("🚀 ===================================")
    print(f"📍 Porta: {PORT}")
    print("📁 Modo: Estável")
    print("🚀 ===================================")
    print()
    
    try:
        with socketserver.TCPServer(("", PORT), MPPHandler) as httpd:
            print("✅ Servidor iniciado com sucesso!")
            print(f"🌐 Acesse: http://localhost:{PORT}")
            print("🛑 Ctrl+C para parar")
            print()
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Servidor finalizado")
    except Exception as e:
        print(f"❌ Erro: {e}")

if __name__ == "__main__":
    main()