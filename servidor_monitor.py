#!/usr/bin/env python3
"""
Monitor de Servidor - Mantém o conversor sempre ativo
"""

import subprocess
import sys
import time
import psutil
import os
import signal
from pathlib import Path

class ServerMonitor:
    def __init__(self):
        self.server_process = None
        self.restart_count = 0
        self.max_restarts = 10
        
    def is_port_in_use(self, port):
        """Verifica se a porta está sendo usada"""
        for conn in psutil.net_connections():
            if conn.laddr.port == port:
                return True
        return False
    
    def start_server(self):
        """Inicia o servidor"""
        try:
            self.server_process = subprocess.Popen([
                sys.executable, "mini_server.py"
            ], cwd=Path(__file__).parent)
            
            # Aguardar servidor inicializar
            time.sleep(3)
            
            if self.is_port_in_use(8082):
                print("✅ Servidor iniciado com sucesso na porta 8082")
                return True
            else:
                print("❌ Servidor não conseguiu usar a porta 8082")
                return False
                
        except Exception as e:
            print(f"❌ Erro ao iniciar servidor: {e}")
            return False
    
    def monitor_server(self):
        """Monitora o servidor e reinicia se necessário"""
        print("🔍 MONITOR DO SERVIDOR - ATIVO")
        print("=" * 40)
        print("📍 Porta: 8082")
        print("🔄 Auto-restart: Habilitado")
        print("🛑 Ctrl+C para parar")
        print("=" * 40)
        print()
        
        while self.restart_count < self.max_restarts:
            try:
                if not self.server_process or self.server_process.poll() is not None:
                    if self.restart_count > 0:
                        print(f"🔄 Reiniciando servidor (tentativa {self.restart_count + 1})...")
                    
                    if self.start_server():
                        self.restart_count = 0  # Reset counter on success
                    else:
                        self.restart_count += 1
                        time.sleep(5)
                        continue
                
                # Verificar se porta ainda está ativa
                if not self.is_port_in_use(8082):
                    print("⚠️ Porta 8082 não está mais ativa. Reiniciando...")
                    if self.server_process:
                        self.server_process.terminate()
                    continue
                
                # Aguardar antes da próxima verificação
                time.sleep(10)
                
            except KeyboardInterrupt:
                print("\n🛑 Monitor parado pelo usuário")
                break
            except Exception as e:
                print(f"❌ Erro no monitor: {e}")
                time.sleep(5)
        
        # Limpar processo ao sair
        if self.server_process:
            self.server_process.terminate()
    
    def stop_server(self):
        """Para o servidor"""
        if self.server_process:
            self.server_process.terminate()
            self.server_process.wait()

def main():
    monitor = ServerMonitor()
    
    try:
        monitor.monitor_server()
    except KeyboardInterrupt:
        print("\n👋 Parando monitor...")
    finally:
        monitor.stop_server()

if __name__ == "__main__":
    main()