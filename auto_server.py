#!/usr/bin/env python3
"""
Servidor Ultra-Limpo com Auto-Restart
"""

import subprocess
import sys
import time
import webbrowser
from pathlib import Path

def start_server():
    """Inicia o servidor com auto-restart"""
    print("🚀 CONVERSOR MPP → XML - AUTO-RESTART")
    print("=" * 50)
    print("📍 URL: http://localhost:8081")
    print("🔄 Auto-restart habilitado")
    print("🛑 Ctrl+C para parar")
    print("=" * 50)
    print()
    
    # Abrir navegador após 3 segundos
    def open_browser():
        time.sleep(3)
        webbrowser.open("http://localhost:8081")
    
    import threading
    browser_thread = threading.Thread(target=open_browser)
    browser_thread.daemon = True
    browser_thread.start()
    
    restart_count = 0
    
    while True:
        try:
            if restart_count > 0:
                print(f"🔄 Reiniciando servidor (tentativa {restart_count})...")
            
            # Executar servidor
            process = subprocess.run([
                sys.executable, "ultra_server.py"
            ], cwd=Path(__file__).parent)
            
            restart_count += 1
            
            if restart_count > 5:
                print("❌ Muitas tentativas de restart. Parando...")
                break
                
            print("⚠️ Servidor parou. Reiniciando em 2 segundos...")
            time.sleep(2)
            
        except KeyboardInterrupt:
            print("\n👋 Servidor parado pelo usuário")
            break
        except Exception as e:
            print(f"❌ Erro: {e}")
            restart_count += 1
            time.sleep(5)

if __name__ == "__main__":
    start_server()