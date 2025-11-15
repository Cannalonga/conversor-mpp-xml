#!/usr/bin/env python3
"""
GitHub Secrets Setup Helper
Configura automaticamente todos os secrets necessários para CI/CD
Usage: python scripts/setup_secrets.py [--env staging|prod|both]
"""

import subprocess
import sys
import argparse
import json
from typing import Dict, List
import getpass

class GitHubSecretsSetup:
    def __init__(self):
        self.repo = "Cannalonga/conversor-mpp-xml"
        self.secrets = {}
        
    def get_user_input(self, secret_name: str, description: str, is_multiline: bool = False) -> str:
        """Coleta input do usuário para secrets"""
        print(f"\n🔐 {secret_name}")
        print(f"📝 {description}")
        
        if is_multiline:
            print("📄 Cole o conteúdo (termine com linha vazia):")
            lines = []
            while True:
                line = input()
                if line == "":
                    break
                lines.append(line)
            return "\n".join(lines)
        else:
            if "password" in secret_name.lower() or "token" in secret_name.lower() or "key" in secret_name.lower():
                return getpass.getpass("Valor (oculto): ")
            else:
                return input("Valor: ")

    def collect_secrets(self, env: str = "both"):
        """Coleta todos os secrets necessários"""
        print(f"🚀 Setup GitHub Secrets - Conversor MPP-XML")
        print(f"🎯 Environment: {env}")
        print("=" * 50)
        
        # Registry secrets
        print("\n📦 CONTAINER REGISTRY (GHCR)")
        self.secrets["DOCKER_REGISTRY_USER"] = self.get_user_input(
            "DOCKER_REGISTRY_USER",
            "Seu username GitHub (exemplo: Cannalonga)"
        )
        
        self.secrets["DOCKER_REGISTRY_TOKEN"] = self.get_user_input(
            "DOCKER_REGISTRY_TOKEN", 
            "GitHub Personal Access Token com permissões packages:write"
        )
        
        # SSH Deploy Keys
        if env in ["staging", "both"]:
            print("\n🔑 SSH DEPLOYMENT - STAGING")
            self.secrets["SSH_STAGING_HOST"] = self.get_user_input(
                "SSH_STAGING_HOST",
                "Hostname staging (exemplo: staging.conversormpp.com)"
            )
            
            self.secrets["SSH_STAGING_USER"] = self.get_user_input(
                "SSH_STAGING_USER",
                "Username SSH staging (exemplo: deploy)"
            )
            
            self.secrets["SSH_STAGING_KEY"] = self.get_user_input(
                "SSH_STAGING_KEY",
                "Chave privada SSH para staging",
                is_multiline=True
            )
        
        if env in ["prod", "both"]:
            print("\n🔑 SSH DEPLOYMENT - PRODUCTION")
            self.secrets["SSH_PROD_HOST"] = self.get_user_input(
                "SSH_PROD_HOST",
                "Hostname produção (exemplo: conversormpp.com)"
            )
            
            self.secrets["SSH_PROD_USER"] = self.get_user_input(
                "SSH_PROD_USER", 
                "Username SSH produção (exemplo: deploy)"
            )
            
            self.secrets["SSH_PROD_KEY"] = self.get_user_input(
                "SSH_PROD_KEY",
                "Chave privada SSH para produção",
                is_multiline=True
            )
        
        # Application secrets
        print("\n💰 MERCADO PAGO")
        self.secrets["MP_ACCESS_TOKEN"] = self.get_user_input(
            "MP_ACCESS_TOKEN",
            "Mercado Pago Access Token (TEST ou PROD)"
        )
        
        self.secrets["MP_PUBLIC_KEY"] = self.get_user_input(
            "MP_PUBLIC_KEY", 
            "Mercado Pago Public Key"
        )
        
        print("\n🗄️ DATABASE")
        self.secrets["DATABASE_URL"] = self.get_user_input(
            "DATABASE_URL",
            "PostgreSQL connection string (postgresql://user:pass@host:port/db)"
        )
        
        print("\n💾 STORAGE (MinIO)")
        self.secrets["MINIO_ENDPOINT"] = self.get_user_input(
            "MINIO_ENDPOINT",
            "MinIO endpoint (exemplo: s3.conversormpp.com)"
        )
        
        self.secrets["MINIO_ACCESS_KEY"] = self.get_user_input(
            "MINIO_ACCESS_KEY",
            "MinIO access key"
        )
        
        self.secrets["MINIO_SECRET_KEY"] = self.get_user_input(
            "MINIO_SECRET_KEY",
            "MinIO secret key"
        )
        
        print("\n🔒 SECURITY")
        self.secrets["SESSION_SECRET"] = self.get_user_input(
            "SESSION_SECRET",
            "Session secret para cookies (string aleatória longa)"
        )
        
        self.secrets["WEBHOOK_SECRET"] = self.get_user_input(
            "WEBHOOK_SECRET",
            "Secret para validação webhooks Mercado Pago"
        )
        
        print("\n📧 EMAIL (opcional)")
        self.secrets["SMTP_HOST"] = self.get_user_input(
            "SMTP_HOST",
            "SMTP host para emails (exemplo: smtp.gmail.com) - ENTER para pular"
        )
        
        if self.secrets["SMTP_HOST"]:
            self.secrets["SMTP_USER"] = self.get_user_input(
                "SMTP_USER",
                "SMTP username/email"
            )
            
            self.secrets["SMTP_PASSWORD"] = self.get_user_input(
                "SMTP_PASSWORD",
                "SMTP password"
            )

    def set_github_secret(self, name: str, value: str) -> bool:
        """Define um secret no GitHub"""
        try:
            cmd = f"gh secret set {name} --repo {self.repo} --body -"
            process = subprocess.Popen(
                cmd.split(),
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            stdout, stderr = process.communicate(input=value)
            
            if process.returncode == 0:
                print(f"✅ {name}")
                return True
            else:
                print(f"❌ {name}: {stderr.strip()}")
                return False
                
        except Exception as e:
            print(f"💥 {name}: {str(e)}")
            return False

    def setup_all_secrets(self) -> bool:
        """Define todos os secrets coletados"""
        print(f"\n🔧 Configurando secrets no GitHub...")
        print(f"📦 Repository: {self.repo}")
        print("-" * 50)
        
        success_count = 0
        total_count = len(self.secrets)
        
        for name, value in self.secrets.items():
            if value and value.strip():  # Skip empty values
                if self.set_github_secret(name, value):
                    success_count += 1
            else:
                print(f"⏭️ {name} (skipped - empty)")
                total_count -= 1
        
        print(f"\n📊 RESULT: {success_count}/{total_count} secrets configured")
        
        if success_count == total_count:
            print("🎉 All secrets configured successfully!")
            return True
        else:
            print("⚠️ Some secrets failed to configure")
            return False

    def verify_secrets(self) -> bool:
        """Verifica secrets configurados"""
        print(f"\n🔍 Verificando secrets configurados...")
        
        try:
            result = subprocess.run(
                f"gh secret list --repo {self.repo}".split(),
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                print("📋 Secrets atualmente configurados:")
                print(result.stdout)
                return True
            else:
                print(f"❌ Erro ao listar secrets: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"💥 Erro: {str(e)}")
            return False

    def generate_env_template(self):
        """Gera template .env para desenvolvimento local"""
        env_template = []
        env_template.append("# Conversor MPP-XML - Environment Variables Template")
        env_template.append("# Copy to .env and fill with your values")
        env_template.append("")
        
        categories = {
            "# DATABASE": ["DATABASE_URL"],
            "# MERCADO PAGO": ["MP_ACCESS_TOKEN", "MP_PUBLIC_KEY"],
            "# STORAGE": ["MINIO_ENDPOINT", "MINIO_ACCESS_KEY", "MINIO_SECRET_KEY"],
            "# SECURITY": ["SESSION_SECRET", "WEBHOOK_SECRET"],
            "# EMAIL": ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"]
        }
        
        for category, vars in categories.items():
            env_template.append(category)
            for var in vars:
                env_template.append(f"{var}=")
            env_template.append("")
        
        template_content = "\n".join(env_template)
        
        with open(".env.template", "w") as f:
            f.write(template_content)
        
        print(f"📄 Template salvo em: .env.template")

def main():
    parser = argparse.ArgumentParser(description="GitHub Secrets Setup Helper")
    parser.add_argument("--env", choices=["staging", "prod", "both"], default="both",
                       help="Environment to setup (default: both)")
    parser.add_argument("--verify-only", action="store_true",
                       help="Only verify existing secrets")
    parser.add_argument("--template-only", action="store_true", 
                       help="Only generate .env template")
    
    args = parser.parse_args()
    
    setup = GitHubSecretsSetup()
    
    if args.template_only:
        setup.generate_env_template()
        return
    
    if args.verify_only:
        setup.verify_secrets()
        return
    
    # Check if gh CLI is available
    try:
        result = subprocess.run("gh --version".split(), capture_output=True)
        if result.returncode != 0:
            print("❌ GitHub CLI (gh) não encontrado. Instale: winget install GitHub.cli")
            sys.exit(1)
    except Exception:
        print("❌ GitHub CLI (gh) não encontrado. Instale: winget install GitHub.cli")
        sys.exit(1)
    
    # Check if user is authenticated
    try:
        result = subprocess.run("gh auth status".split(), capture_output=True)
        if result.returncode != 0:
            print("🔐 GitHub CLI não autenticado. Execute: gh auth login")
            sys.exit(1)
    except Exception:
        print("🔐 Erro ao verificar autenticação GitHub CLI")
        sys.exit(1)
    
    # Collect and setup secrets
    setup.collect_secrets(args.env)
    success = setup.setup_all_secrets()
    
    # Verify setup
    setup.verify_secrets()
    
    # Generate local template
    setup.generate_env_template()
    
    print(f"\n{'='*50}")
    if success:
        print("🎉 SETUP COMPLETO!")
        print("✅ Secrets configurados no GitHub")
        print("✅ Template .env.template gerado")
        print("\n📋 Próximos passos:")
        print("1. Verifique se todos os values estão corretos")
        print("2. Teste o CI/CD: git push origin main")
        print("3. Execute health checks: python scripts/health_check.py")
    else:
        print("⚠️ SETUP INCOMPLETO")
        print("❌ Alguns secrets falharam")
        print("\n🔧 Execute novamente ou configure manualmente:")
        print("   GitHub → Repository → Settings → Secrets and variables → Actions")
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()