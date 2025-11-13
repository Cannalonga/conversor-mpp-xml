#!/usr/bin/env python3
import subprocess
import time
import webbrowser
import os
import signal
import sys

def main():
    print("🚀 INICIANDO CONVERSOR MPP PARA XML")
    print("=" * 50)
    
    # Definir diretório atual
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    try:
        # Iniciar servidor em subprocesso
        print("🌐 Iniciando servidor...")
        server_process = subprocess.Popen([
            sys.executable, "simple_working_server.py"
        ], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        
        # Aguardar servidor inicializar
        time.sleep(3)
        
        # Abrir navegador
        print("🌍 Abrindo navegador...")
        webbrowser.open("http://localhost:8080")
        
        print("✅ Sistema iniciado!")
        print("💡 Pressione Ctrl+C para parar")
        print("📍 URL: http://localhost:8080")
        
        # Manter script rodando
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\n🛑 Parando servidor...")
        if 'server_process' in locals():
            server_process.terminate()
        print("✅ Servidor parado!")

if __name__ == "__main__":
    main()