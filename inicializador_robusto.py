#!/usr/bin/env python3
"""
Inicializador Robusto - Sem dependências extras
"""

import subprocess
import sys
import time
import socket
from pathlib import Path

def check_port(port):
    """Verifica se a porta está disponível"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        result = sock.connect_ex(('localhost', port))
        sock.close()
        return result == 0  # True se conectou (porta em uso)
    except:
        return False

def start_and_monitor():
    """Inicia servidor com monitoramento básico"""
    print("🚀 INICIALIZADOR ROBUSTO")
    print("=" * 30)
    print("📍 Porta: 8082")
    print("🌐 URL: http://localhost:8082")
    print("🛑 Ctrl+C para parar")
    print("=" * 30)
    print()
    
    server_process = None
    restart_count = 0
    max_restarts = 5
    
    try:
        while restart_count < max_restarts:
            try:
                if restart_count > 0:
                    print(f"🔄 Reiniciando... (tentativa {restart_count + 1})")
                
                # Iniciar servidor
                print("🌐 Iniciando servidor...")
                server_process = subprocess.Popen([
                    sys.executable, "mini_server.py"
                ], cwd=Path(__file__).parent)
                
                # Aguardar inicialização
                time.sleep(4)
                
                # Verificar se está rodando
                if check_port(8082):
                    print("✅ Servidor ativo e funcionando!")
                    print("🌍 Abra: http://localhost:8082")
                    print("💡 Mantenha esta janela aberta")
                    print()
                    
                    # Manter rodando
                    server_process.wait()
                    
                else:
                    print("⚠️ Servidor não respondeu na porta 8082")
                    restart_count += 1
                    time.sleep(3)
                    
            except subprocess.TimeoutExpired:
                print("⚠️ Servidor demorou para responder")
                restart_count += 1
            except Exception as e:
                print(f"❌ Erro: {e}")
                restart_count += 1
                time.sleep(2)
        
        print("❌ Máximo de tentativas atingido")
        
    except KeyboardInterrupt:
        print("\n👋 Parando servidor...")
    finally:
        if server_process:
            server_process.terminate()
            print("✅ Servidor parado")

if __name__ == "__main__":
    start_and_monitor()