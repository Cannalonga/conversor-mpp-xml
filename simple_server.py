#!/usr/bin/env python3
"""
Servidor MPP Converter - Versão Compatível Universal
"""

import http.server
import socketserver
import json
import time
import random
import os
import urllib.parse
from pathlib import Path
from datetime import datetime

PORT = 8080
HOST = '0.0.0.0'  # Aceita conexões de qualquer IP

# MIME types para melhor compatibilidade
MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.ico': 'image/x-icon',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif'
}

class MPPHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=".", **kwargs)

    def do_GET(self):
        # Remove query parameters para log limpo
        clean_path = self.path.split('?')[0]
        print(f"📁 GET: {clean_path}")
        
        if clean_path == "/" or clean_path == "/index.html":
            self.serve_file("public/index.html", "text/html; charset=utf-8")
        elif clean_path.startswith("/js/"):
            self.serve_file(f"public{clean_path}", "application/javascript; charset=utf-8")
        elif clean_path.startswith("/css/"):
            self.serve_file(f"public{clean_path}", "text/css; charset=utf-8")
        elif clean_path == "/admin" or clean_path == "/admin/":
            self.serve_file("admin/index.html", "text/html; charset=utf-8")
        elif clean_path == "/favicon.ico":
            self.send_favicon()
        elif clean_path.endswith('.html'):
            self.serve_file(clean_path[1:], "text/html; charset=utf-8")
        else:
            # Tentar servir arquivo com extensão correta
            self.serve_static_file(clean_path[1:])

    def add_universal_headers(self):
        """Adiciona headers universais para compatibilidade"""
        # CORS headers
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
        
        # Security headers
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.send_header("X-XSS-Protection", "1; mode=block")
        
        # Cache control
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        
        # Encoding
        self.send_header("Accept-Ranges", "bytes")
        
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        print(f"🔄 OPTIONS: {self.path}")
        
        self.send_response(200)
        self.add_universal_headers()
        self.end_headers()
        
    def send_favicon(self):
        """Envia favicon vazio para evitar erro 404"""
        self.send_response(204)  # No Content
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

    def do_POST(self):
        print(f"📤 POST: {self.path}")
        
        if self.path == "/api/upload-test":
            self.handle_test_upload()
        elif self.path == "/api/upload":
            self.handle_regular_upload()
        elif self.path.startswith("/api/download/"):
            self.handle_secure_download()
        else:
            self.send_error(404)

    def serve_file(self, filepath, content_type):
        try:
            if not os.path.exists(filepath):
                raise FileNotFoundError(f"File not found: {filepath}")
                
            with open(filepath, 'rb') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(content)))
            
            # Headers essenciais
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-cache")
            
            self.end_headers()
            
            self.wfile.write(content)
            print(f"✅ Served: {filepath} ({len(content)} bytes)")
            
        except FileNotFoundError:
            print(f"❌ File not found: {filepath}")
            self.send_error(404, f"File not found: {filepath}")
        except Exception as e:
            print(f"❌ Error serving {filepath}: {e}")
            self.send_error(500, f"Internal server error: {str(e)}")
            
    def serve_static_file(self, filepath):
        """Serve arquivo estático com tipo MIME correto"""
        try:
            if not os.path.exists(filepath):
                self.send_error(404, f"File not found: {filepath}")
                return
                
            # Detectar tipo MIME pela extensão
            ext = os.path.splitext(filepath)[1].lower()
            content_type = MIME_TYPES.get(ext, 'application/octet-stream')
            
            self.serve_file(filepath, content_type)
            
        except Exception as e:
            print(f"❌ Error serving static file {filepath}: {e}")
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
            
            # Parse multipart data (simplified)
            content_type = self.headers.get('Content-Type', '')
            if 'multipart/form-data' in content_type:
                # Extract boundary
                boundary = content_type.split('boundary=')[1].encode()
                parts = post_data.split(b'--' + boundary)
                
                file_data = None
                filename = "arquivo.mpp"
                
                for part in parts:
                    if b'Content-Disposition' in part and b'filename=' in part:
                        # Extract filename
                        disp_line = part.split(b'\r\n')[1].decode()
                        if 'filename=' in disp_line:
                            filename = disp_line.split('filename="')[1].split('"')[0]
                        
                        # Extract file data
                        file_data = part.split(b'\r\n\r\n')[1].split(b'\r\n--')[0]
                        break
                
                if file_data:
                    print(f"📄 Arquivo processado: {filename} ({len(file_data)} bytes)")
                else:
                    print("⚠️ Usando dados raw do POST")
            
            # Simular conversão
            print("🔄 Simulando conversão...")
            time.sleep(1)  # Simular processamento
            
            # Gerar XML de exemplo
            xml_content = self.generate_sample_xml()
            
            response = {
                "success": True,
                "message": "Conversão realizada com sucesso!",
                "xmlContent": xml_content,
                "fileId": f"test-{int(time.time())}",
                "fileSize": len(xml_content),
                "contentType": "application/xml",
                "encoding": "UTF-8",
                "timestamp": datetime.now().isoformat()
            }
            
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(json.dumps(response, ensure_ascii=False).encode('utf-8'))))
            self.add_universal_headers()
            self.end_headers()
            
            response_data = json.dumps(response, ensure_ascii=False, indent=2).encode('utf-8')
            self.wfile.write(response_data)
            
            print("✅ Conversão de teste concluída")
            
        except Exception as e:
            print(f"❌ Erro na conversão: {e}")
            import traceback
            traceback.print_exc()
            
            error_response = {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
                "path": self.path
            }
            
            self.send_response(500)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.add_universal_headers()
            self.end_headers()
            
            error_data = json.dumps(error_response, ensure_ascii=False, indent=2).encode('utf-8')
            self.wfile.write(error_data)

    def handle_secure_download(self):
        """Download seguro de XML"""
        try:
            file_id = self.path.split('/')[-1]
            print(f"📥 Download solicitado para: {file_id}")
            
            # Gerar XML de exemplo (em produção, buscar do banco de dados)
            xml_content = self.generate_sample_xml()
            filename = f"projeto_convertido_{file_id}.xml"
            
            # Headers seguros para download
            self.send_response(200)
            self.send_header("Content-Type", "application/xml; charset=utf-8")
            self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
            self.send_header("Content-Length", str(len(xml_content.encode('utf-8'))))
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("X-Frame-Options", "DENY")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            
            self.wfile.write(xml_content.encode('utf-8'))
            print(f"✅ Download seguro concluído: {filename}")
            
        except Exception as e:
            print(f"❌ Erro no download seguro: {e}")
            self.send_error(500)

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
        """Gera XML de exemplo baseado em Microsoft Project - Formato Seguro"""
        import html
        from datetime import datetime
        
        # Data atual formatada
        current_date = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
        
        xml_content = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Project xmlns="http://schemas.microsoft.com/project" 
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://schemas.microsoft.com/project project.xsd">
    <SaveVersion>14</SaveVersion>
    <Name>Projeto Convertido - Seguro</Name>
    <Title>Conversão MPP para XML - Validada</Title>
    <Subject>Arquivo convertido com segurança</Subject>
    <Category>Conversão</Category>
    <Company>MPP Converter</Company>
    <Manager>Sistema Automatizado</Manager>
    <Author>Conversor MPP-XML</Author>
    <CreationDate>{current_date}</CreationDate>
    <LastSaved>{current_date}</LastSaved>
    <ScheduleFromStart>1</ScheduleFromStart>
    <StartDate>2024-01-01T08:00:00</StartDate>
    <FinishDate>2024-12-31T17:00:00</FinishDate>
    <FYStartDate>1</FYStartDate>
    <CriticalSlackLimit>0</CriticalSlackLimit>
    <CurrencyDigits>2</CurrencyDigits>
    <CurrencySymbol>R$</CurrencySymbol>
    <CurrencyCode>BRL</CurrencyCode>
    <CurrencySymbolPosition>0</CurrencySymbolPosition>
    <CalendarUID>1</CalendarUID>
    <DefaultStartTime>08:00:00</DefaultStartTime>
    <DefaultFinishTime>17:00:00</DefaultFinishTime>
    <MinutesPerDay>480</MinutesPerDay>
    <MinutesPerWeek>2400</MinutesPerWeek>
    <DaysPerMonth>20</DaysPerMonth>
    <DefaultTaskType>1</DefaultTaskType>
    <DefaultFixedCostAccrual>3</DefaultFixedCostAccrual>
    <DefaultStandardRate>0</DefaultStandardRate>
    <DefaultOvertimeRate>0</DefaultOvertimeRate>
    <DurationFormat>7</DurationFormat>
    <WorkFormat>2</WorkFormat>
    <EditableActualCosts>0</EditableActualCosts>
    <HonorConstraints>1</HonorConstraints>
    <EarnedValueMethod>0</EarnedValueMethod>
    <InsertedProjectsLikeSummary>1</InsertedProjectsLikeSummary>
    <MultipleCriticalPaths>0</MultipleCriticalPaths>
    <NewTasksEffortDriven>1</NewTasksEffortDriven>
    <NewTasksEstimated>1</NewTasksEstimated>
    <SplitsInProgressTasks>1</SplitsInProgressTasks>
    <SpreadActualCost>0</SpreadActualCost>
    <SpreadPercentComplete>0</SpreadPercentComplete>
    <TaskUpdatesResource>0</TaskUpdatesResource>
    <FiscalYearStart>0</FiscalYearStart>
    <WeekStartDay>1</WeekStartDay>
    <MoveCompletedEndsBack>0</MoveCompletedEndsBack>
    <MoveRemainingStartsBack>0</MoveRemainingStartsBack>
    <MoveRemainingStartsForward>0</MoveRemainingStartsForward>
    <MoveCompletedEndsForward>0</MoveCompletedEndsForward>
    <BaselineForEarnedValue>0</BaselineForEarnedValue>
    <AutoAddNewResourcesAndTasks>1</AutoAddNewResourcesAndTasks>
    <StatusDate>{current_date}</StatusDate>
    <CurrentDate>{current_date}</CurrentDate>
    <MicrosoftProjectServerURL>0</MicrosoftProjectServerURL>
    <Autolink>1</Autolink>
    <NewTaskStartDate>0</NewTaskStartDate>
    <DefaultTaskEVMethod>0</DefaultTaskEVMethod>
    <ProjectExternallyEdited>0</ProjectExternallyEdited>
    <ExtendedCreationDate>1900-01-01T00:00:00</ExtendedCreationDate>
    <ActualsInSync>1</ActualsInSync>
    <RemoveFileProperties>0</RemoveFileProperties>
    <AdminProject>0</AdminProject>
    
    <Calendars>
        <Calendar>
            <UID>1</UID>
            <Name>Padrão</Name>
            <IsBaseCalendar>1</IsBaseCalendar>
            <IsBaselineCalendar>0</IsBaselineCalendar>
            <BaseCalendarUID>-1</BaseCalendarUID>
        </Calendar>
    </Calendars>
    
    <Tasks>
        <Task>
            <UID>0</UID>
            <ID>0</ID>
            <Name>Projeto Principal</Name>
            <Type>1</Type>
            <IsNull>0</IsNull>
            <CreateDate>{current_date}</CreateDate>
            <Contact>Conversor MPP-XML</Contact>
            <WBS>0</WBS>
            <OutlineLevel>0</OutlineLevel>
            <Priority>500</Priority>
            <Start>2024-01-01T08:00:00</Start>
            <Finish>2024-12-31T17:00:00</Finish>
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
    
    <Assignments>
        <Assignment>
            <UID>1</UID>
            <TaskUID>2</TaskUID>
            <ResourceUID>1</ResourceUID>
            <PercentWorkComplete>0</PercentWorkComplete>
            <ActualCost>0</ActualCost>
            <ActualWork>PT0H0M0S</ActualWork>
            <Cost>0</Cost>
            <Work>PT40H0M0S</Work>
            <Start>2024-01-02T08:00:00</Start>
            <Finish>2024-01-31T17:00:00</Finish>
            <Units>1</Units>
        </Assignment>
        
        <Assignment>
            <UID>2</UID>
            <TaskUID>3</TaskUID>
            <ResourceUID>2</ResourceUID>
            <PercentWorkComplete>0</PercentWorkComplete>
            <ActualCost>0</ActualCost>
            <ActualWork>PT0H0M0S</ActualWork>
            <Cost>0</Cost>
            <Work>PT400H0M0S</Work>
            <Start>2024-02-01T08:00:00</Start>
            <Finish>2024-11-30T17:00:00</Finish>
            <Units>1</Units>
        </Assignment>
    </Assignments>
</Project>'''
        
        return xml_content

def main():
    print("🚀 ===================================")
    print("   SERVIDOR MPP CONVERTER")
    print("🚀 ===================================")
    print(f"📍 Porta: {PORT}")
    print("📁 Modo: Estável")
    print("🚀 ===================================")
    print()
    
    try:
        # Configurar servidor com timeout e buffer adequados
        socketserver.TCPServer.allow_reuse_address = True
        
        with socketserver.TCPServer((HOST, PORT), MPPHandler) as httpd:
            httpd.timeout = 30  # Timeout de 30 segundos
            
            print("✅ Servidor iniciado com sucesso!")
            print(f"🌐 Acesse: http://localhost:{PORT}")
            print(f"🌐 Ou: http://127.0.0.1:{PORT}")
            print(f"🌐 Rede local: http://{HOST}:{PORT}")
            print(f"📡 Porta: {PORT} em todas as interfaces")
            print(f"⏰ Timeout: 30 segundos")
            print(f"🔧 Modo: Compatibilidade Universal")
            print("🛑 Ctrl+C para parar")
            print()
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n👋 Servidor finalizado pelo usuário")
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"❌ Porta {PORT} já está em uso!")
            print("💡 Tente: taskkill /f /im python.exe")
        else:
            print(f"❌ Erro de rede: {e}")
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()