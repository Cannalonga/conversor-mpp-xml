#!/usr/bin/env python3
"""
Conversor MPP-XML - Health Check Script
Verifica status completo: health, workers, queue, reconciliação, alertas
Usage: python scripts/health_check.py [--env staging|prod] [--format json|table]
"""

import requests
import json
import sys
import argparse
from datetime import datetime, timedelta
import subprocess
import os
from typing import Dict, List, Tuple

class HealthChecker:
    def __init__(self, env: str = "prod", format: str = "table"):
        self.env = env
        self.format = format
        self.results = {}
        self.errors = []
        
        # Configurações por ambiente
        self.configs = {
            "staging": {
                "app_url": "https://staging.conversormpp.com",
                "prometheus_url": "http://staging.conversormpp.com:9090",
                "grafana_url": "http://staging.conversormpp.com:3000",
                "redis_host": "staging.conversormpp.com",
            },
            "prod": {
                "app_url": "https://conversormpp.com",
                "prometheus_url": "http://conversormpp.com:9090",
                "grafana_url": "http://conversormpp.com:3000", 
                "redis_host": "conversormpp.com",
            }
        }
        
        self.config = self.configs[env]

    def check_app_health(self) -> Dict:
        """Verifica health endpoint da aplicação"""
        try:
            response = requests.get(f"{self.config['app_url']}/health", timeout=10)
            
            if response.status_code == 200:
                health_data = response.json()
                return {
                    "status": "OK",
                    "response_time": response.elapsed.total_seconds(),
                    "details": health_data
                }
            else:
                return {
                    "status": "ERROR",
                    "error": f"HTTP {response.status_code}",
                    "response_time": response.elapsed.total_seconds()
                }
        except Exception as e:
            return {
                "status": "ERROR",
                "error": str(e)
            }

    def check_workers(self) -> Dict:
        """Verifica status dos workers via Prometheus"""
        try:
            # Worker ativo
            workers_query = "up{job='worker'}"
            response = requests.get(
                f"{self.config['prometheus_url']}/api/v1/query",
                params={"query": workers_query},
                timeout=10
            )
            
            if response.status_code != 200:
                return {"status": "ERROR", "error": "Prometheus unreachable"}
            
            data = response.json()
            active_workers = len([r for r in data['data']['result'] if r['value'][1] == '1'])
            
            # Taxa de erro dos workers (últimos 5 min)
            error_query = "rate(worker_errors_total[5m])"
            error_response = requests.get(
                f"{self.config['prometheus_url']}/api/v1/query",
                params={"query": error_query},
                timeout=10
            )
            
            error_rate = 0
            if error_response.status_code == 200:
                error_data = error_response.json()
                if error_data['data']['result']:
                    error_rate = float(error_data['data']['result'][0]['value'][1])
            
            return {
                "status": "OK" if active_workers > 0 and error_rate < 0.1 else "WARNING",
                "active_workers": active_workers,
                "error_rate_5m": round(error_rate, 4),
                "threshold_warning": error_rate >= 0.1
            }
            
        except Exception as e:
            return {
                "status": "ERROR",
                "error": str(e)
            }

    def check_queue_status(self) -> Dict:
        """Verifica status da fila Redis"""
        try:
            # Via Prometheus (redis_exporter)
            queue_query = "redis_list_length{list='conversions'}"
            response = requests.get(
                f"{self.config['prometheus_url']}/api/v1/query",
                params={"query": queue_query},
                timeout=10
            )
            
            if response.status_code != 200:
                return {"status": "ERROR", "error": "Queue metrics unavailable"}
            
            data = response.json()
            queue_length = 0
            
            if data['data']['result']:
                queue_length = int(float(data['data']['result'][0]['value'][1]))
            
            # Thresholds
            status = "OK"
            if queue_length > 100:
                status = "CRITICAL"
            elif queue_length > 50:
                status = "WARNING"
            
            return {
                "status": status,
                "queue_length": queue_length,
                "threshold_warning": queue_length > 50,
                "threshold_critical": queue_length > 100
            }
            
        except Exception as e:
            return {
                "status": "ERROR", 
                "error": str(e)
            }

    def check_payment_reconciliation(self) -> Dict:
        """Verifica discrepâncias na reconciliação (últimas 24h)"""
        try:
            # Simula chamada para endpoint de reconciliação ou script
            response = requests.get(
                f"{self.config['app_url']}/admin/reconciliation/status",
                timeout=10
            )
            
            if response.status_code == 200:
                recon_data = response.json()
                return {
                    "status": "OK" if recon_data.get("discrepancies", 0) == 0 else "WARNING",
                    "discrepancies_24h": recon_data.get("discrepancies", 0),
                    "last_check": recon_data.get("last_check"),
                    "pending_orders": recon_data.get("pending_orders", 0)
                }
            else:
                return {
                    "status": "WARNING",
                    "error": f"Reconciliation endpoint HTTP {response.status_code}"
                }
                
        except Exception as e:
            return {
                "status": "ERROR",
                "error": str(e)
            }

    def check_database_connection(self) -> Dict:
        """Verifica conexão com banco via health endpoint"""
        try:
            response = requests.get(f"{self.config['app_url']}/health/db", timeout=10)
            
            if response.status_code == 200:
                db_data = response.json()
                return {
                    "status": "OK",
                    "connection_time": db_data.get("connection_time_ms", 0),
                    "active_connections": db_data.get("active_connections", 0)
                }
            else:
                return {
                    "status": "ERROR",
                    "error": f"DB health check failed: HTTP {response.status_code}"
                }
                
        except Exception as e:
            return {
                "status": "ERROR",
                "error": str(e)
            }

    def check_storage_minio(self) -> Dict:
        """Verifica status do MinIO"""
        try:
            response = requests.get(f"{self.config['app_url']}/health/storage", timeout=10)
            
            if response.status_code == 200:
                storage_data = response.json()
                return {
                    "status": "OK",
                    "bucket_accessible": storage_data.get("bucket_accessible", False),
                    "free_space_gb": storage_data.get("free_space_gb", 0)
                }
            else:
                return {
                    "status": "ERROR",
                    "error": f"Storage health check failed: HTTP {response.status_code}"
                }
                
        except Exception as e:
            return {
                "status": "ERROR",
                "error": str(e)
            }

    def check_alerts_status(self) -> Dict:
        """Verifica alertas ativos no Alertmanager"""
        try:
            alertmanager_url = f"{self.config['prometheus_url'].replace('9090', '9093')}/api/v1/alerts"
            response = requests.get(alertmanager_url, timeout=10)
            
            if response.status_code == 200:
                alerts_data = response.json()
                active_alerts = [a for a in alerts_data.get('data', []) if a['status']['state'] == 'active']
                
                critical_alerts = [a for a in active_alerts if a['labels'].get('severity') == 'critical']
                warning_alerts = [a for a in active_alerts if a['labels'].get('severity') == 'warning']
                
                status = "OK"
                if critical_alerts:
                    status = "CRITICAL"
                elif warning_alerts:
                    status = "WARNING"
                
                return {
                    "status": status,
                    "total_active": len(active_alerts),
                    "critical_count": len(critical_alerts),
                    "warning_count": len(warning_alerts),
                    "critical_alerts": [a['labels'].get('alertname') for a in critical_alerts]
                }
            else:
                return {
                    "status": "WARNING",
                    "error": "Alertmanager unreachable"
                }
                
        except Exception as e:
            return {
                "status": "ERROR",
                "error": str(e)
            }

    def run_all_checks(self) -> Dict:
        """Executa todos os health checks"""
        print(f"🔍 Running health checks for {self.env.upper()} environment...")
        
        checks = {
            "app_health": self.check_app_health,
            "workers": self.check_workers, 
            "queue": self.check_queue_status,
            "reconciliation": self.check_payment_reconciliation,
            "database": self.check_database_connection,
            "storage": self.check_storage_minio,
            "alerts": self.check_alerts_status
        }
        
        results = {}
        overall_status = "OK"
        
        for check_name, check_func in checks.items():
            print(f"  Checking {check_name}...")
            result = check_func()
            results[check_name] = result
            
            # Determina status geral
            if result["status"] == "CRITICAL":
                overall_status = "CRITICAL"
            elif result["status"] == "ERROR" and overall_status != "CRITICAL":
                overall_status = "ERROR"
            elif result["status"] == "WARNING" and overall_status == "OK":
                overall_status = "WARNING"
        
        results["overall"] = {
            "status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            "environment": self.env
        }
        
        return results

    def format_output(self, results: Dict) -> str:
        """Formata saída baseado no formato escolhido"""
        if self.format == "json":
            return json.dumps(results, indent=2)
        
        # Formato tabela
        output = []
        output.append(f"\n🏥 HEALTH CHECK REPORT - {self.env.upper()}")
        output.append(f"📅 {results['overall']['timestamp']}")
        output.append("=" * 60)
        
        # Status geral
        status_emoji = {
            "OK": "✅",
            "WARNING": "⚠️", 
            "ERROR": "❌",
            "CRITICAL": "🚨"
        }
        
        overall_status = results['overall']['status']
        output.append(f"\n🎯 OVERALL STATUS: {status_emoji[overall_status]} {overall_status}")
        output.append("-" * 60)
        
        # Detalhes por componente
        for component, data in results.items():
            if component == "overall":
                continue
                
            status = data['status']
            emoji = status_emoji.get(status, "❓")
            output.append(f"\n{emoji} {component.upper()}: {status}")
            
            # Detalhes específicos
            if component == "app_health":
                output.append(f"   Response time: {data.get('response_time', 'N/A')}s")
                
            elif component == "workers":
                output.append(f"   Active workers: {data.get('active_workers', 'N/A')}")
                output.append(f"   Error rate (5m): {data.get('error_rate_5m', 'N/A')}")
                
            elif component == "queue":
                output.append(f"   Queue length: {data.get('queue_length', 'N/A')}")
                
            elif component == "reconciliation":
                output.append(f"   Discrepancies (24h): {data.get('discrepancies_24h', 'N/A')}")
                output.append(f"   Pending orders: {data.get('pending_orders', 'N/A')}")
                
            elif component == "database":
                output.append(f"   Connection time: {data.get('connection_time', 'N/A')}ms")
                output.append(f"   Active connections: {data.get('active_connections', 'N/A')}")
                
            elif component == "storage":
                output.append(f"   Bucket accessible: {data.get('bucket_accessible', 'N/A')}")
                output.append(f"   Free space: {data.get('free_space_gb', 'N/A')}GB")
                
            elif component == "alerts":
                output.append(f"   Active alerts: {data.get('total_active', 'N/A')}")
                if data.get('critical_alerts'):
                    output.append(f"   🚨 Critical: {', '.join(data['critical_alerts'])}")
            
            # Mostra erros
            if 'error' in data:
                output.append(f"   ❌ Error: {data['error']}")
        
        output.append("\n" + "=" * 60)
        
        # Resumo de ações
        if overall_status != "OK":
            output.append("\n🚨 ACTION REQUIRED:")
            if overall_status == "CRITICAL":
                output.append("   - Immediate investigation needed")
                output.append("   - Consider rollback if in deployment")
                output.append("   - Check runbooks for emergency procedures")
            elif overall_status == "WARNING":
                output.append("   - Monitor closely")
                output.append("   - Review warning conditions")
                output.append("   - Prepare for potential intervention")
        else:
            output.append("\n✅ All systems operational!")
        
        return "\n".join(output)

def main():
    parser = argparse.ArgumentParser(description="Conversor MPP-XML Health Checker")
    parser.add_argument("--env", choices=["staging", "prod"], default="prod",
                       help="Environment to check (default: prod)")
    parser.add_argument("--format", choices=["json", "table"], default="table",
                       help="Output format (default: table)")
    parser.add_argument("--save", help="Save results to file")
    
    args = parser.parse_args()
    
    checker = HealthChecker(env=args.env, format=args.format)
    results = checker.run_all_checks()
    output = checker.format_output(results)
    
    print(output)
    
    if args.save:
        with open(args.save, 'w') as f:
            if args.format == "json":
                f.write(json.dumps(results, indent=2))
            else:
                f.write(output)
        print(f"\n💾 Results saved to: {args.save}")
    
    # Exit code baseado no status
    exit_codes = {
        "OK": 0,
        "WARNING": 1, 
        "ERROR": 2,
        "CRITICAL": 3
    }
    
    sys.exit(exit_codes.get(results['overall']['status'], 2))

if __name__ == "__main__":
    main()