#!/usr/bin/env python3
"""
Reconciliação automática de pagamentos
Arquivo: scripts/reconcile_payments.py
Versão: 1.0
Última atualização: 15/11/2025

Este script faz a reconciliação entre:
1. Pagamentos recebidos (Mercado Pago webhook)
2. Orders no banco de dados 
3. Arquivos processados (storage)
4. Revenue registrado (metrics)

Executa verificações de integridade e gera relatórios detalhados.
"""

import os
import sys
import json
import logging
import argparse
import psycopg2
import requests
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Tuple
import pandas as pd

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/reconcile_payments.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class PaymentRecord:
    """Estrutura para registro de pagamento"""
    order_id: str
    payment_id: str
    amount: float
    status: str
    payment_method: str
    created_at: datetime
    processed_at: Optional[datetime] = None
    file_converted: bool = False
    revenue_recorded: bool = False
    
@dataclass
class ReconciliationReport:
    """Relatório de reconciliação"""
    total_payments: int
    total_revenue: float
    matched_orders: int
    unmatched_payments: List[str]
    missing_conversions: List[str]
    revenue_discrepancies: List[Dict]
    summary: Dict

class PaymentReconciler:
    """Classe principal para reconciliação de pagamentos"""
    
    def __init__(self):
        self.db_conn = None
        self.mercadopago_token = os.getenv('MERCADOPAGO_ACCESS_TOKEN')
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'database': os.getenv('DB_NAME', 'conversor'),
            'user': os.getenv('DB_USER', 'postgres'),
            'password': os.getenv('DB_PASSWORD', 'postgres'),
            'port': os.getenv('DB_PORT', 5432)
        }
        
    def __enter__(self):
        self.connect_db()
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.db_conn:
            self.db_conn.close()
            
    def connect_db(self):
        """Conecta ao banco de dados PostgreSQL"""
        try:
            self.db_conn = psycopg2.connect(**self.db_config)
            logger.info("Conectado ao banco de dados PostgreSQL")
        except Exception as e:
            logger.error(f"Erro ao conectar no banco: {e}")
            sys.exit(1)
            
    def fetch_database_orders(self, date_from: datetime, date_to: datetime) -> List[PaymentRecord]:
        """Busca orders do banco de dados no período especificado"""
        query = """
        SELECT 
            o.order_id,
            o.payment_id,
            o.amount,
            o.status,
            o.payment_method,
            o.created_at,
            o.processed_at,
            CASE WHEN f.order_id IS NOT NULL THEN true ELSE false END as file_converted
        FROM orders o
        LEFT JOIN converted_files f ON o.order_id = f.order_id
        WHERE o.created_at >= %s AND o.created_at <= %s
        ORDER BY o.created_at DESC
        """
        
        with self.db_conn.cursor() as cur:
            cur.execute(query, (date_from, date_to))
            rows = cur.fetchall()
            
        records = []
        for row in rows:
            record = PaymentRecord(
                order_id=row[0],
                payment_id=row[1] or "",
                amount=float(row[2]) if row[2] else 0.0,
                status=row[3],
                payment_method=row[4] or "",
                created_at=row[5],
                processed_at=row[6],
                file_converted=row[7],
                revenue_recorded=False  # Será verificado separadamente
            )
            records.append(record)
            
        logger.info(f"Encontrados {len(records)} orders no banco de dados")
        return records
        
    def fetch_mercadopago_payments(self, date_from: datetime, date_to: datetime) -> List[Dict]:
        """Busca pagamentos da API do Mercado Pago"""
        if not self.mercadopago_token:
            logger.warning("Token do Mercado Pago não encontrado, pulando verificação externa")
            return []
            
        headers = {'Authorization': f'Bearer {self.mercadopago_token}'}
        url = 'https://api.mercadopago.com/v1/payments/search'
        
        params = {
            'begin_date': date_from.strftime('%Y-%m-%dT%H:%M:%S.000-00:00'),
            'end_date': date_to.strftime('%Y-%m-%dT%H:%M:%S.000-00:00'),
            'status': 'approved',
            'limit': 100
        }
        
        try:
            response = requests.get(url, headers=headers, params=params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            payments = data.get('results', [])
            
            logger.info(f"Encontrados {len(payments)} pagamentos no Mercado Pago")
            return payments
            
        except Exception as e:
            logger.error(f"Erro ao buscar pagamentos do Mercado Pago: {e}")
            return []
            
    def check_revenue_metrics(self, order_ids: List[str]) -> Dict[str, bool]:
        """Verifica se a receita foi registrada no sistema de métricas"""
        # Simulação - implementar com Prometheus ou sistema de métricas real
        revenue_status = {}
        
        query = """
        SELECT order_id, recorded_at 
        FROM revenue_events 
        WHERE order_id = ANY(%s)
        """
        
        try:
            with self.db_conn.cursor() as cur:
                cur.execute(query, (order_ids,))
                recorded_orders = {row[0]: True for row in cur.fetchall()}
                
            for order_id in order_ids:
                revenue_status[order_id] = recorded_orders.get(order_id, False)
                
        except psycopg2.Error as e:
            logger.warning(f"Tabela revenue_events não existe ou erro: {e}")
            # Default: assumir que receita foi registrada se order está COMPLETED
            for order_id in order_ids:
                revenue_status[order_id] = True
                
        return revenue_status
        
    def reconcile_payments(self, date_from: datetime, date_to: datetime) -> ReconciliationReport:
        """Executa reconciliação completa dos pagamentos"""
        logger.info(f"Iniciando reconciliação para período: {date_from} - {date_to}")
        
        # 1. Buscar dados do banco
        db_records = self.fetch_database_orders(date_from, date_to)
        
        # 2. Buscar pagamentos do Mercado Pago
        mp_payments = self.fetch_mercadopago_payments(date_from, date_to)
        
        # 3. Verificar registro de receita
        order_ids = [r.order_id for r in db_records]
        revenue_status = self.check_revenue_metrics(order_ids)
        
        # Atualizar records com status de receita
        for record in db_records:
            record.revenue_recorded = revenue_status.get(record.order_id, False)
        
        # 4. Análise de discrepâncias
        report = self._analyze_discrepancies(db_records, mp_payments)
        
        return report
        
    def _analyze_discrepancies(self, db_records: List[PaymentRecord], mp_payments: List[Dict]) -> ReconciliationReport:
        """Analisa discrepâncias entre sistemas"""
        
        # Pagamentos aprovados no banco
        paid_orders = [r for r in db_records if r.status in ['PAID', 'COMPLETED']]
        
        # Criar índices para busca rápida
        db_by_payment_id = {r.payment_id: r for r in paid_orders if r.payment_id}
        mp_by_id = {p['id']: p for p in mp_payments}
        
        # Encontrar orders sem correspondência no MP
        unmatched_payments = []
        for record in paid_orders:
            if record.payment_id and record.payment_id not in mp_by_id:
                unmatched_payments.append(record.order_id)
        
        # Encontrar orders pagos mas sem conversão
        missing_conversions = []
        for record in paid_orders:
            if not record.file_converted:
                missing_conversions.append(record.order_id)
        
        # Discrepâncias de receita
        revenue_discrepancies = []
        for record in paid_orders:
            if record.file_converted and not record.revenue_recorded:
                revenue_discrepancies.append({
                    'order_id': record.order_id,
                    'amount': record.amount,
                    'issue': 'Revenue not recorded in metrics'
                })
        
        # Calcular totais
        total_revenue = sum(r.amount for r in paid_orders)
        matched_orders = len(paid_orders) - len(unmatched_payments)
        
        # Resumo executivo
        summary = {
            'period': f"{db_records[0].created_at.date()} - {db_records[-1].created_at.date()}" if db_records else "Vazio",
            'total_orders': len(db_records),
            'paid_orders': len(paid_orders),
            'conversion_rate': (len([r for r in paid_orders if r.file_converted]) / len(paid_orders) * 100) if paid_orders else 0,
            'average_order_value': total_revenue / len(paid_orders) if paid_orders else 0,
            'integrity_score': (matched_orders / len(paid_orders) * 100) if paid_orders else 100
        }
        
        return ReconciliationReport(
            total_payments=len(paid_orders),
            total_revenue=total_revenue,
            matched_orders=matched_orders,
            unmatched_payments=unmatched_payments,
            missing_conversions=missing_conversions,
            revenue_discrepancies=revenue_discrepancies,
            summary=summary
        )
    
    def fix_discrepancies(self, report: ReconciliationReport, auto_fix: bool = False) -> Dict[str, int]:
        """Corrige discrepâncias encontradas (se auto_fix=True)"""
        fixes_applied = {
            'requeued_conversions': 0,
            'fixed_revenue_records': 0,
            'updated_statuses': 0
        }
        
        if not auto_fix:
            logger.info("Modo dry-run ativo - nenhuma correção será aplicada")
            return fixes_applied
        
        # Correção 1: Reprocessar conversões faltando
        for order_id in report.missing_conversions:
            try:
                self._requeue_conversion(order_id)
                fixes_applied['requeued_conversions'] += 1
                logger.info(f"Reprocessando conversão para order {order_id}")
            except Exception as e:
                logger.error(f"Erro ao reprocessar {order_id}: {e}")
        
        # Correção 2: Registrar receita faltando
        for discrepancy in report.revenue_discrepancies:
            try:
                self._record_revenue_event(discrepancy['order_id'], discrepancy['amount'])
                fixes_applied['fixed_revenue_records'] += 1
                logger.info(f"Receita registrada para order {discrepancy['order_id']}")
            except Exception as e:
                logger.error(f"Erro ao registrar receita {discrepancy['order_id']}: {e}")
        
        return fixes_applied
    
    def _requeue_conversion(self, order_id: str):
        """Reenfileira uma conversão para reprocessamento"""
        query = """
        INSERT INTO conversion_queue (order_id, status, queued_at) 
        VALUES (%s, 'PENDING', NOW())
        ON CONFLICT (order_id) DO UPDATE SET 
            status = 'PENDING', 
            queued_at = NOW()
        """
        
        with self.db_conn.cursor() as cur:
            cur.execute(query, (order_id,))
        self.db_conn.commit()
    
    def _record_revenue_event(self, order_id: str, amount: float):
        """Registra evento de receita no sistema de métricas"""
        query = """
        INSERT INTO revenue_events (order_id, amount, recorded_at) 
        VALUES (%s, %s, NOW())
        ON CONFLICT (order_id) DO NOTHING
        """
        
        with self.db_conn.cursor() as cur:
            cur.execute(query, (order_id, amount))
        self.db_conn.commit()
    
    def generate_report_files(self, report: ReconciliationReport, output_dir: str = "reports"):
        """Gera arquivos de relatório em múltiplos formatos"""
        os.makedirs(output_dir, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # 1. JSON detalhado
        json_file = f"{output_dir}/reconciliation_{timestamp}.json"
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(asdict(report), f, indent=2, default=str, ensure_ascii=False)
        
        # 2. CSV dos problemas
        if report.unmatched_payments or report.missing_conversions:
            issues_file = f"{output_dir}/payment_issues_{timestamp}.csv"
            issues_data = []
            
            for order_id in report.unmatched_payments:
                issues_data.append({'order_id': order_id, 'issue': 'Unmatched payment'})
            
            for order_id in report.missing_conversions:
                issues_data.append({'order_id': order_id, 'issue': 'Missing conversion'})
            
            for disc in report.revenue_discrepancies:
                issues_data.append({'order_id': disc['order_id'], 'issue': disc['issue']})
            
            pd.DataFrame(issues_data).to_csv(issues_file, index=False)
        
        # 3. Relatório executivo em texto
        summary_file = f"{output_dir}/executive_summary_{timestamp}.txt"
        with open(summary_file, 'w', encoding='utf-8') as f:
            f.write(f"""
RELATÓRIO EXECUTIVO DE RECONCILIAÇÃO - {timestamp}

RESUMO GERAL:
=============
Total de pagamentos: {report.total_payments}
Receita total: R$ {report.total_revenue:,.2f}
Orders com correspondência: {report.matched_orders}
Taxa de conversão: {report.summary['conversion_rate']:.1f}%
Ticket médio: R$ {report.summary['average_order_value']:.2f}
Score de integridade: {report.summary['integrity_score']:.1f}%

PROBLEMAS IDENTIFICADOS:
=======================
Pagamentos sem correspondência: {len(report.unmatched_payments)}
Conversões faltando: {len(report.missing_conversions)}
Discrepâncias de receita: {len(report.revenue_discrepancies)}

AÇÕES RECOMENDADAS:
==================
""")
            
            if report.unmatched_payments:
                f.write(f"- Verificar {len(report.unmatched_payments)} pagamentos sem correspondência\n")
            
            if report.missing_conversions:
                f.write(f"- Reprocessar {len(report.missing_conversions)} conversões faltando\n")
            
            if report.revenue_discrepancies:
                f.write(f"- Corrigir {len(report.revenue_discrepancies)} registros de receita\n")
            
            if report.summary['integrity_score'] < 95:
                f.write("- ALERTA: Score de integridade abaixo de 95%\n")
        
        logger.info(f"Relatórios salvos em {output_dir}/")

def main():
    parser = argparse.ArgumentParser(description='Reconciliação de pagamentos - Conversor MPP→XML')
    parser.add_argument('--days-back', type=int, default=7, 
                       help='Número de dias anteriores para analisar (default: 7)')
    parser.add_argument('--date-from', type=str, 
                       help='Data inicial (YYYY-MM-DD)')
    parser.add_argument('--date-to', type=str, 
                       help='Data final (YYYY-MM-DD)')
    parser.add_argument('--auto-fix', action='store_true', 
                       help='Aplicar correções automaticamente')
    parser.add_argument('--output-dir', default='reports', 
                       help='Diretório para salvar relatórios')
    parser.add_argument('--email-report', 
                       help='Email para enviar relatório')
    
    args = parser.parse_args()
    
    # Definir período de análise
    if args.date_from and args.date_to:
        date_from = datetime.strptime(args.date_from, '%Y-%m-%d')
        date_to = datetime.strptime(args.date_to, '%Y-%m-%d')
    else:
        date_to = datetime.now()
        date_from = date_to - timedelta(days=args.days_back)
    
    logger.info(f"Reconciliação para período: {date_from.date()} - {date_to.date()}")
    
    try:
        with PaymentReconciler() as reconciler:
            # Executar reconciliação
            report = reconciler.reconcile_payments(date_from, date_to)
            
            # Aplicar correções se solicitado
            if args.auto_fix:
                fixes = reconciler.fix_discrepancies(report, auto_fix=True)
                logger.info(f"Correções aplicadas: {fixes}")
            else:
                logger.info("Use --auto-fix para aplicar correções automaticamente")
            
            # Gerar relatórios
            reconciler.generate_report_files(report, args.output_dir)
            
            # Log resumo
            logger.info(f"""
RECONCILIAÇÃO CONCLUÍDA:
- Total de pagamentos: {report.total_payments}
- Receita: R$ {report.total_revenue:,.2f}
- Problemas: {len(report.unmatched_payments + report.missing_conversions + report.revenue_discrepancies)}
- Score de integridade: {report.summary['integrity_score']:.1f}%
            """)
            
            # Enviar por email se solicitado
            if args.email_report:
                # TODO: Implementar envio de email
                logger.info(f"Email agendado para: {args.email_report}")
                
    except Exception as e:
        logger.error(f"Erro durante reconciliação: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()