#!/usr/bin/env python3
import http.server
import socketserver
import os
import json
import urllib.parse
import time
import random
from pathlib import Path

PORT = 3000

# Simulação de banco de dados para demo
demo_analytics = {
    'page_views': 1247 + random.randint(0, 50),
    'unique_visitors': 892 + random.randint(0, 20),
    'today_views': 34 + random.randint(0, 15),
    'today_unique_visitors': 28 + random.randint(0, 10),
    'total_conversions': 156 + random.randint(0, 5)
}

class MockAPIHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=".", **kwargs)

    def do_POST(self):
        """Handle POST requests for API endpoints"""
        if self.path.startswith('/api/'):
            self.handle_api_post()
        else:
            self.send_error(404)

    def do_GET(self):
        """Handle GET requests"""
        if self.path.startswith('/api/'):
            self.handle_api_get()
        elif self.path == '/' or self.path == '/index.html':
            self.serve_file('public/index.html')
        elif self.path.startswith('/admin'):
            self.serve_file('admin/index.html')
        elif self.path.startswith('/css/'):
            self.serve_file('public' + self.path)
        elif self.path.startswith('/js/'):
            self.serve_file('public' + self.path)
        else:
            super().do_GET()

    def serve_file(self, filepath):
        """Serve a specific file"""
        try:
            with open(filepath, 'rb') as file:
                content = file.read()
                
            if filepath.endswith('.html'):
                self.send_response(200)
                self.send_header('Content-type', 'text/html; charset=utf-8')
                self.end_headers()
            elif filepath.endswith('.css'):
                self.send_response(200)
                self.send_header('Content-type', 'text/css; charset=utf-8')
                self.end_headers()
            elif filepath.endswith('.js'):
                self.send_response(200)
                self.send_header('Content-type', 'application/javascript; charset=utf-8')
                self.end_headers()
            else:
                self.send_response(200)
                self.end_headers()
                
            self.wfile.write(content)
        except FileNotFoundError:
            self.send_error(404)

    def handle_api_post(self):
        """Handle API POST requests with mock responses"""
        if self.path == '/api/upload':
            # Mock file upload response
            response = {
                "success": True,
                "conversionId": "mock-uuid-12345",
                "message": "Arquivo enviado com sucesso (DEMO)"
            }
        elif self.path == '/api/payment/qrcode':
            # Mock QR code generation
            response = {
                "success": True,
                "paymentId": "pay-mock-123",
                "qrCodeImage": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                "pixKey": "02038351740",
                "bank": "Nubank",
                "amount": 10.00,
                "expiresAt": "2025-11-12T15:00:00Z"
            }
        else:
            self.send_error(404)
            return

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(response).encode())

    def handle_api_get(self):
        """Handle API GET requests with mock responses"""
        if self.path.startswith('/api/payment/status/'):
            # Mock payment status check
            response = {
                "status": "pending",  # Em demo, sempre pendente
                "expiresAt": "2025-11-12T15:00:00Z"
            }
        elif self.path.startswith('/api/conversion/status/'):
            # Mock conversion status
            response = {
                "status": "uploaded",
                "fileName": "demo-file.mpp",
                "createdAt": "2025-11-12T14:00:00Z",
                "updatedAt": "2025-11-12T14:00:00Z"
            }
        elif self.path == '/api/analytics/counter':
            # Analytics counter endpoint
            global demo_analytics
            # Simular incremento ocasional
            if random.random() > 0.7:
                demo_analytics['page_views'] += 1
                if random.random() > 0.5:
                    demo_analytics['today_views'] += 1
            
            response = {
                "totalViews": demo_analytics['page_views'],
                "uniqueVisitors": demo_analytics['unique_visitors'],
                "todayViews": demo_analytics['today_views'],
                "todayUniqueVisitors": demo_analytics['today_unique_visitors'],
                "totalConversions": demo_analytics['total_conversions']
            }
        elif self.path == '/api/admin/analytics':
            # Admin analytics endpoint
            response = {
                "overview": {
                    "totalViews": demo_analytics['page_views'],
                    "uniqueVisitors": demo_analytics['unique_visitors'],
                    "todayViews": demo_analytics['today_views'],
                    "todayUniqueVisitors": demo_analytics['today_unique_visitors'],
                    "conversionRate": "12.5%"
                },
                "last7Days": [
                    {"date": "2025-11-06", "views": 45, "uniqueVisitors": 38, "conversions": 5, "revenue": 50.00},
                    {"date": "2025-11-07", "views": 62, "uniqueVisitors": 51, "conversions": 8, "revenue": 80.00},
                    {"date": "2025-11-08", "views": 38, "uniqueVisitors": 32, "conversions": 4, "revenue": 40.00},
                    {"date": "2025-11-09", "views": 71, "uniqueVisitors": 58, "conversions": 9, "revenue": 90.00},
                    {"date": "2025-11-10", "views": 55, "uniqueVisitors": 47, "conversions": 6, "revenue": 60.00},
                    {"date": "2025-11-11", "views": 49, "uniqueVisitors": 41, "conversions": 7, "revenue": 70.00},
                    {"date": "2025-11-12", "views": demo_analytics['today_views'], "uniqueVisitors": demo_analytics['today_unique_visitors'], "conversions": 3, "revenue": 30.00}
                ],
                "recentVisitors": [
                    {"ip": "192.168.*.**", "lastVisit": "2025-11-12T14:30:00Z", "visits": 3, "country": "BR"},
                    {"ip": "10.0.*.**", "lastVisit": "2025-11-12T14:25:00Z", "visits": 1, "country": "BR"},
                    {"ip": "172.16.*.**", "lastVisit": "2025-11-12T14:20:00Z", "visits": 2, "country": "BR"}
                ]
            }
        else:
            self.send_error(404)
            return

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(response).encode())

    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        """Handle preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == "__main__":
    print(f"🚀 Servidor de demo iniciando...")
    print(f"📁 Diretório: {os.getcwd()}")
    
    # Verificar se os arquivos existem
    files_to_check = [
        'public/index.html',
        'public/css/style.css', 
        'public/js/app.js',
        'admin/index.html'
    ]
    
    for file_path in files_to_check:
        if os.path.exists(file_path):
            print(f"✅ {file_path}")
        else:
            print(f"❌ {file_path} - ARQUIVO NÃO ENCONTRADO")
    
    print(f"\n🌐 Servidor rodando em: http://localhost:{PORT}")
    print(f"🏠 Página principal: http://localhost:{PORT}")
    print(f"⚙️  Painel admin: http://localhost:{PORT}/admin")
    print(f"\n💡 Este é um servidor de DEMONSTRAÇÃO com dados simulados")
    print(f"⚠️  Para produção, use o Node.js como descrito no README.md")
    print(f"\n🛑 Para parar o servidor, pressione Ctrl+C\n")
    
    try:
        with socketserver.TCPServer(("", PORT), MockAPIHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n🛑 Servidor parado pelo usuário")
    except OSError as e:
        print(f"\n❌ Erro ao iniciar servidor na porta {PORT}: {e}")
        print(f"💡 Tente usar uma porta diferente ou verifique se a porta está em uso")