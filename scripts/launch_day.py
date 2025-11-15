#!/usr/bin/env python3
"""
Conversor MPP-XML - Launch Day Automation Script  
Executa sequência completa de verificações para lançamento
Usage: python scripts/launch_day.py [--env staging|prod] [--skip-tests]
"""

import subprocess
import requests
import time
import sys
import argparse
from datetime import datetime
from typing import List, Dict, Tuple

class LaunchDayAutomation:
    def __init__(self, env: str = "prod", skip_tests: bool = False):
        self.env = env
        self.skip_tests = skip_tests
        self.start_time = datetime.utcnow()
        self.results = []
        
        # URLs por ambiente
        self.urls = {
            "staging": "https://staging.conversormpp.com",
            "prod": "https://conversormpp.com"
        }
        
        self.base_url = self.urls[env]

    def log_step(self, step: str, status: str = "INFO", details: str = ""):
        """Log de cada step com timestamp"""
        timestamp = datetime.utcnow().strftime("%H:%M:%S")
        status_emoji = {
            "INFO": "ℹ️",
            "SUCCESS": "✅", 
            "WARNING": "⚠️",
            "ERROR": "❌",
            "RUNNING": "🔄"
        }
        
        emoji = status_emoji.get(status, "📝")
        print(f"[{timestamp}] {emoji} {step}")
        if details:
            print(f"         {details}")
        
        self.results.append({
            "timestamp": timestamp,
            "step": step,
            "status": status,
            "details": details
        })

    def run_command(self, command: str, description: str, timeout: int = 30) -> Tuple[bool, str]:
        """Executa comando e retorna sucesso/output"""
        self.log_step(f"Running: {description}", "RUNNING")
        
        try:
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            
            if result.returncode == 0:
                self.log_step(f"✅ {description}", "SUCCESS", result.stdout.strip()[:100])
                return True, result.stdout
            else:
                self.log_step(f"❌ {description}", "ERROR", result.stderr.strip()[:100])
                return False, result.stderr
                
        except subprocess.TimeoutExpired:
            self.log_step(f"⏱️ {description} - TIMEOUT", "ERROR", f"Command timeout after {timeout}s")
            return False, f"Timeout after {timeout}s"
        except Exception as e:
            self.log_step(f"💥 {description} - EXCEPTION", "ERROR", str(e))
            return False, str(e)

    def check_endpoint(self, endpoint: str, expected_status: int = 200, timeout: int = 10) -> bool:
        """Verifica endpoint HTTP"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            response = requests.get(url, timeout=timeout)
            
            if response.status_code == expected_status:
                self.log_step(f"Endpoint {endpoint}", "SUCCESS", f"HTTP {response.status_code} - {response.elapsed.total_seconds():.2f}s")
                return True
            else:
                self.log_step(f"Endpoint {endpoint}", "ERROR", f"HTTP {response.status_code} (expected {expected_status})")
                return False
                
        except Exception as e:
            self.log_step(f"Endpoint {endpoint}", "ERROR", str(e))
            return False

    def run_health_checks(self) -> bool:
        """Executa health checks completos"""
        self.log_step("=== HEALTH CHECKS ===", "INFO")
        
        # Health check script
        success, output = self.run_command(
            f"python scripts/health_check.py --env {self.env} --format table",
            f"Full health check ({self.env})",
            timeout=60
        )
        
        return success

    def verify_ci_cd_status(self) -> bool:
        """Verifica status do CI/CD"""
        self.log_step("=== CI/CD VERIFICATION ===", "INFO")
        
        # Listar últimos runs
        success, output = self.run_command(
            "gh run list --repo Cannalonga/conversor-mpp-xml --limit 3",
            "Check recent GitHub Actions runs"
        )
        
        if not success:
            return False
            
        # Parse output para verificar se CI passou
        lines = output.strip().split('\n')[1:]  # Skip header
        if not lines:
            self.log_step("No recent runs found", "WARNING")
            return False
            
        # Verifica se último run foi sucesso
        last_run = lines[0].split('\t')
        if len(last_run) >= 3:
            status = last_run[1].strip()
            if status == "completed":
                self.log_step("Latest CI/CD run", "SUCCESS", f"Status: {status}")
                return True
            else:
                self.log_step("Latest CI/CD run", "WARNING", f"Status: {status}")
                return False
        
        return True

    def test_core_functionality(self) -> bool:
        """Testa funcionalidade core (upload/payment/conversion)"""
        if self.skip_tests:
            self.log_step("Core functionality tests", "INFO", "SKIPPED (--skip-tests)")
            return True
            
        self.log_step("=== CORE FUNCTIONALITY TESTS ===", "INFO")
        
        # Test health endpoints
        endpoints = [
            "/health",
            "/health/db", 
            "/health/redis",
            "/health/storage"
        ]
        
        all_passed = True
        for endpoint in endpoints:
            if not self.check_endpoint(endpoint):
                all_passed = False
        
        # Test upload endpoint (sem arquivo real)
        if not self.check_endpoint("/upload", expected_status=405):  # Method not allowed é ok
            all_passed = False
        
        # Test admin (deve retornar login page)
        if not self.check_endpoint("/admin"):
            all_passed = False
            
        return all_passed

    def check_monitoring_setup(self) -> bool:
        """Verifica se monitoramento está ativo"""
        self.log_step("=== MONITORING VERIFICATION ===", "INFO")
        
        # Prometheus
        prometheus_url = self.base_url.replace('https://', 'http://') + ":9090"
        try:
            response = requests.get(f"{prometheus_url}/api/v1/targets", timeout=10)
            if response.status_code == 200:
                targets = response.json()
                active_targets = len([t for t in targets['data']['activeTargets'] if t['health'] == 'up'])
                self.log_step("Prometheus targets", "SUCCESS", f"{active_targets} targets up")
            else:
                self.log_step("Prometheus", "WARNING", "Unreachable")
                return False
        except:
            self.log_step("Prometheus", "WARNING", "Connection failed")
            return False
        
        # Grafana  
        grafana_url = self.base_url.replace('https://', 'http://') + ":3000"
        try:
            response = requests.get(f"{grafana_url}/api/health", timeout=10)
            if response.status_code == 200:
                self.log_step("Grafana", "SUCCESS", "API accessible")
            else:
                self.log_step("Grafana", "WARNING", "API issues")
                return False
        except:
            self.log_step("Grafana", "WARNING", "Connection failed")
            return False
            
        return True

    def verify_secrets_and_config(self) -> bool:
        """Verifica se secrets/config estão corretos"""
        self.log_step("=== CONFIGURATION VERIFICATION ===", "INFO")
        
        # Verifica se GitHub secrets estão configurados
        success, output = self.run_command(
            "gh secret list --repo Cannalonga/conversor-mpp-xml",
            "List GitHub secrets"
        )
        
        if not success:
            return False
        
        # Secrets essenciais
        required_secrets = [
            "DOCKER_REGISTRY_TOKEN",
            "SSH_PROD_KEY", 
            "MP_ACCESS_TOKEN",
            "DATABASE_URL"
        ]
        
        missing_secrets = []
        for secret in required_secrets:
            if secret not in output:
                missing_secrets.append(secret)
        
        if missing_secrets:
            self.log_step("GitHub secrets", "ERROR", f"Missing: {', '.join(missing_secrets)}")
            return False
        else:
            self.log_step("GitHub secrets", "SUCCESS", f"{len(required_secrets)} essential secrets found")
        
        return True

    def run_final_checklist(self) -> List[str]:
        """Executa checklist final de lançamento"""
        self.log_step("=== FINAL LAUNCH CHECKLIST ===", "INFO")
        
        checklist_items = [
            ("Health endpoints responding", self.check_endpoint("/health")),
            ("Database connectivity", self.check_endpoint("/health/db")),
            ("Storage accessibility", self.check_endpoint("/health/storage")),
            ("Redis connectivity", self.check_endpoint("/health/redis")),
            ("Admin panel accessible", self.check_endpoint("/admin")),
            ("API endpoints responding", self.check_endpoint("/api/status", expected_status=404)),  # 404 ok se não existe
        ]
        
        failed_items = []
        for item_name, check_result in checklist_items:
            if check_result:
                self.log_step(item_name, "SUCCESS")
            else:
                self.log_step(item_name, "ERROR")
                failed_items.append(item_name)
        
        return failed_items

    def generate_launch_report(self, failed_items: List[str] = None) -> str:
        """Gera relatório final do lançamento"""
        end_time = datetime.utcnow()
        duration = end_time - self.start_time
        
        report = []
        report.append(f"\n{'='*60}")
        report.append(f"🚀 LAUNCH DAY AUTOMATION REPORT - {self.env.upper()}")
        report.append(f"📅 Start: {self.start_time.strftime('%Y-%m-%d %H:%M:%S')} UTC")
        report.append(f"⏱️ Duration: {duration.total_seconds():.1f} seconds")
        report.append(f"{'='*60}")
        
        # Resumo por status
        status_counts = {}
        for result in self.results:
            status = result['status']
            status_counts[status] = status_counts.get(status, 0) + 1
        
        report.append("\n📊 EXECUTION SUMMARY:")
        for status, count in status_counts.items():
            emoji = {"SUCCESS": "✅", "ERROR": "❌", "WARNING": "⚠️", "INFO": "ℹ️", "RUNNING": "🔄"}.get(status, "📝")
            report.append(f"   {emoji} {status}: {count}")
        
        # Status geral
        has_errors = any(r['status'] == 'ERROR' for r in self.results)
        has_warnings = any(r['status'] == 'WARNING' for r in self.results)
        
        if not has_errors and not has_warnings:
            report.append(f"\n🎉 LAUNCH STATUS: ✅ READY FOR PRODUCTION")
            report.append(f"   All systems verified and operational")
        elif has_errors:
            report.append(f"\n🚨 LAUNCH STATUS: ❌ CRITICAL ISSUES")
            report.append(f"   Resolve errors before proceeding with launch")
        else:
            report.append(f"\n⚠️ LAUNCH STATUS: 🔍 PROCEED WITH CAUTION")
            report.append(f"   Monitor warnings closely during launch")
        
        # Failed items
        if failed_items:
            report.append(f"\n❌ FAILED CHECKLIST ITEMS:")
            for item in failed_items:
                report.append(f"   - {item}")
        
        # Próximos passos
        report.append(f"\n📋 NEXT STEPS:")
        if has_errors:
            report.append(f"   1. Fix critical issues identified above")
            report.append(f"   2. Re-run launch automation: python scripts/launch_day.py --env {self.env}")
            report.append(f"   3. Do not proceed to production until all errors resolved")
        else:
            report.append(f"   1. Monitor dashboards: {self.base_url.replace('https://', 'http://')}:3000")
            report.append(f"   2. Start with low-traffic marketing campaign")
            report.append(f"   3. Watch alerts and queue lengths closely")
            report.append(f"   4. Have rollback plan ready")
        
        report.append(f"{'='*60}\n")
        
        return "\n".join(report)

    def run_full_automation(self) -> bool:
        """Executa automação completa"""
        self.log_step(f"🚀 LAUNCH DAY AUTOMATION STARTED - {self.env.upper()}", "INFO")
        
        steps = [
            ("Health Checks", self.run_health_checks),
            ("CI/CD Verification", self.verify_ci_cd_status), 
            ("Core Functionality", self.test_core_functionality),
            ("Monitoring Setup", self.check_monitoring_setup),
            ("Secrets & Config", self.verify_secrets_and_config),
        ]
        
        all_passed = True
        for step_name, step_func in steps:
            try:
                if not step_func():
                    all_passed = False
            except Exception as e:
                self.log_step(f"Exception in {step_name}", "ERROR", str(e))
                all_passed = False
        
        # Final checklist
        failed_items = self.run_final_checklist()
        if failed_items:
            all_passed = False
        
        # Gerar relatório
        report = self.generate_launch_report(failed_items)
        print(report)
        
        # Salvar relatório
        report_file = f"launch_report_{self.env}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.txt"
        with open(report_file, 'w') as f:
            f.write(report)
        
        self.log_step(f"Report saved", "SUCCESS", report_file)
        
        return all_passed

def main():
    parser = argparse.ArgumentParser(description="Launch Day Automation")
    parser.add_argument("--env", choices=["staging", "prod"], default="prod",
                       help="Environment to check (default: prod)")
    parser.add_argument("--skip-tests", action="store_true",
                       help="Skip core functionality tests")
    
    args = parser.parse_args()
    
    automation = LaunchDayAutomation(env=args.env, skip_tests=args.skip_tests)
    success = automation.run_full_automation()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()