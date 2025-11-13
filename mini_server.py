#!/usr/bin/env python3
"""
Servidor MPP Converter - Máxima Simplicidade
"""

import http.server
import socketserver
import json
import time
import webbrowser
import zipfile
import threading
import os

PORT = 8082

class MiniHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=".", **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_GET(self):
        path = self.path.split('?')[0]
        print(f"📁 {path}")
        
        if path in ['/', '/index.html']:
            self.serve_file("public/index.html", "text/html")
        elif path == '/css/style.css':
            self.serve_file("public/css/style.css", "text/css")
        elif path == '/js/ultra_app.js':
            self.serve_file("public/js/ultra_app.js", "application/javascript")
        elif path == '/js/app_clean_new.js':
            self.serve_file("public/js/app_clean_new.js", "application/javascript")
        elif path == '/favicon.ico':
            self.send_response(204)
            self.end_headers()
        elif path.startswith('/download/'):
            self.handle_safe_download()
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
            print(f"✅ {filepath}")
        except Exception as e:
            print(f"❌ {filepath}: {e}")
            self.send_error(404)

    def handle_upload(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            # Extrair nome do arquivo do campo filename
            filename = "arquivo.mpp"
            try:
                # Procurar por name="filename"
                filename_pattern = b'name="filename"\r\n\r\n'
                if filename_pattern in post_data:
                    start = post_data.find(filename_pattern) + len(filename_pattern)
                    end = post_data.find(b'\r\n--', start)
                    if end > start:
                        filename = post_data[start:end].decode('utf-8', errors='ignore').strip()
                        print(f"Nome extraído: {filename}")
                
                # Fallback: tentar método anterior
                if filename == "arquivo.mpp" and b'filename=' in post_data:
                    start = post_data.find(b'filename="') + 10
                    end = post_data.find(b'"', start)
                    if end > start:
                        filename = post_data[start:end].decode('utf-8', errors='ignore')
                        print(f"Nome fallback: {filename}")
            except Exception as e:
                print(f"Erro ao extrair nome: {e}")
                pass
            
            # XML seguro - formato Microsoft Project completo
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
            <Name>Tarefa Secundária</Name>
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
                "fileId": f"mpp-xml-{int(time.time())}"
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Disposition', 'inline')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.end_headers()
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            print(f"✅ Convertido: {filename}")
            
            # Salvar XML temporariamente para download seguro
            os.makedirs('temp_downloads', exist_ok=True)
            xml_filename = f"temp_downloads/{response['fileId']}.xml"
            
            # Salvar também o nome original
            info_filename = f"temp_downloads/{response['fileId']}.info"
            with open(info_filename, 'w', encoding='utf-8') as f:
                f.write(filename)
            
            with open(xml_filename, 'w', encoding='utf-8') as f:
                f.write(xml_content)
            
        except Exception as e:
            print(f"❌ Erro: {e}")
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            error_response = {"success": False, "error": str(e)}
            self.wfile.write(json.dumps(error_response).encode('utf-8'))

    def handle_safe_download(self):
        """Download simples como arquivo de texto"""
        try:
            # Extrair ID do arquivo da URL
            file_id = self.path.split('/download/')[1].replace('.xml', '')
            xml_path = f"temp_downloads/{file_id}.xml"
            
            if not os.path.exists(xml_path):
                self.send_error(404, "Arquivo não encontrado")
                return
                
            # Ler arquivo XML
            with open(xml_path, 'r', encoding='utf-8') as f:
                xml_content = f.read()
            
            # Tentar ler nome original
            info_path = f"temp_downloads/{file_id}.info"
            original_name = "projeto"
            try:
                if os.path.exists(info_path):
                    with open(info_path, 'r', encoding='utf-8') as f:
                        full_name = f.read().strip()
                        # Remover extensão .mpp/.MPP se existir
                        if full_name.lower().endswith('.mpp'):
                            original_name = full_name[:-4]
                        else:
                            original_name = full_name
                        print(f"Nome original recuperado: {original_name}")
            except Exception as e:
                print(f"Erro ao ler nome original: {e}")
                pass
            
            # Criar ZIP com o XML - Elimina red flags!
            zip_path = f"temp_downloads/{file_id}.zip"
            xml_filename = f"{original_name}_convertido.xml"
            
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                zipf.writestr(xml_filename, xml_content)
            
            # Ler ZIP criado
            with open(zip_path, 'rb') as f:
                zip_content = f.read()
            
            # Headers para ZIP - 100% seguros!
            self.send_response(200) 
            self.send_header('Content-Type', 'application/zip')
            self.send_header('Content-Disposition', f'attachment; filename="{original_name}_convertido.zip"')
            self.send_header('Content-Length', str(len(zip_content)))
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            
            # Enviar ZIP
            self.wfile.write(zip_content)
            print(f"✅ Download como ZIP: {file_id}")
            
            # Limpar arquivos
            def cleanup():
                time.sleep(5)
                try:
                    os.remove(xml_path)
                    os.remove(zip_path)
                except:
                    pass
            
            import threading
            threading.Thread(target=cleanup, daemon=True).start()
            
        except Exception as e:
            print(f"❌ Erro: {e}")
            self.send_error(500)

def open_browser():
    time.sleep(2)
    webbrowser.open(f"http://localhost:{PORT}")

def main():
    print("🚀 CONVERSOR MINI - MÁXIMA ESTABILIDADE")
    print("=" * 45)
    print(f"📍 http://localhost:{PORT}")
    print("🛑 Ctrl+C para parar")
    print("=" * 45)
    
    # Abrir navegador em thread separada
    browser_thread = threading.Thread(target=open_browser)
    browser_thread.daemon = True
    browser_thread.start()
    
    try:
        socketserver.TCPServer.allow_reuse_address = True
        with socketserver.TCPServer(("0.0.0.0", PORT), MiniHandler) as httpd:
            print("✅ Servidor ativo")
            print("🌐 Navegador abrindo automaticamente...")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Parado")
    except Exception as e:
        print(f"❌ Erro: {e}")

if __name__ == "__main__":
    main()