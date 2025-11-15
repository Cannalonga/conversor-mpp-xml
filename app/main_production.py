#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Sistema de Pedidos e Pagamento PIX
Implementa o fluxo completo: Upload → Pagamento → Conversão → Download
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import uuid
import json
import time
import hashlib
import base64
from datetime import datetime, timedelta
import os

app = FastAPI(
    title="Conversor MPP/XML - API Completa",
    description="Sistema completo de conversão com pagamento PIX",
    version="2.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== MODELOS =====

class OrderStatus:
    PENDING_PAYMENT = "pending_payment"
    PAID = "paid"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    EXPIRED = "expired"

class Order(BaseModel):
    order_id: str
    filename: str
    file_size: int
    file_type: str
    price: float
    status: str
    created_at: datetime
    paid_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    expires_at: datetime
    pix_code: Optional[str] = None
    pix_qr_code: Optional[str] = None
    converted_file_path: Optional[str] = None
    extracted_text: Optional[str] = None

class PIXPayment(BaseModel):
    pix_key: str = "20.383.517/0001-40"  # CNPJ fictício
    beneficiary: str = "Conversor Digital LTDA"
    amount: float
    order_id: str
    expiration: int = 15  # minutos

# ===== STORAGE EM MEMÓRIA (PRODUÇÃO: DATABASE) =====
orders_db: Dict[str, Order] = {}
files_storage = {}

# ===== FUNÇÕES AUXILIARES =====

def generate_order_id() -> str:
    """Gera ID único para pedido"""
    return str(uuid.uuid4())[:8].upper()

def generate_pix_code(amount: float, order_id: str) -> str:
    """Gera código PIX simplificado (produção: integrar com PSP)"""
    pix_data = {
        "amount": amount,
        "order_id": order_id,
        "beneficiary": "Conversor Digital",
        "key": "20383517000140"
    }
    # Simular código PIX
    pix_string = json.dumps(pix_data, sort_keys=True)
    pix_hash = hashlib.sha256(pix_string.encode()).hexdigest()[:32]
    return f"BR{pix_hash.upper()}"

def generate_qr_code_base64(pix_code: str) -> str:
    """Gera QR code em base64 (produção: usar biblioteca qrcode)"""
    # Simulação - na produção usar qrcode library
    qr_data = f"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
    return qr_data

def calculate_price(file_size: int, file_type: str) -> float:
    """Calcula preço baseado no tipo e tamanho do arquivo"""
    base_prices = {
        "pdf": 3.00,
        "mpp": 10.00,
        "doc": 5.00,
        "docx": 5.00,
        "xls": 7.00,
        "xlsx": 7.00
    }
    
    # Preço extra para arquivos grandes (>10MB)
    extra_size = max(0, (file_size - 10*1024*1024) / (1024*1024))
    size_surcharge = extra_size * 0.50  # R$ 0,50 por MB extra
    
    base_price = base_prices.get(file_type.lower(), 10.00)
    return round(base_price + size_surcharge, 2)

# ===== ENDPOINTS =====

@app.get("/")
async def root():
    return {"message": "Conversor MPP/XML API v2.0", "status": "online"}

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "api": "✅ Running",
            "payment": "✅ Available",
            "converter": "✅ Available",
            "storage": "✅ Available"
        },
        "stats": {
            "total_orders": len(orders_db),
            "pending_orders": len([o for o in orders_db.values() if o.status == OrderStatus.PENDING_PAYMENT]),
            "completed_orders": len([o for o in orders_db.values() if o.status == OrderStatus.COMPLETED])
        }
    }

@app.post("/api/orders/create")
async def create_order(file: UploadFile = File(...)):
    """Cria pedido e gera PIX para pagamento"""
    
    try:
        # Validar arquivo
        if not file.filename:
            raise HTTPException(status_code=400, detail="Nome do arquivo é obrigatório")
        
        # Ler conteúdo
        content = await file.read()
        file_size = len(content)
        
        # Validar tamanho (max 50MB)
        if file_size > 50 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Arquivo muito grande. Máximo 50MB.")
        
        # Detectar tipo
        file_ext = file.filename.split('.')[-1].lower()
        supported_types = ["pdf", "mpp", "doc", "docx", "xls", "xlsx"]
        
        if file_ext not in supported_types:
            raise HTTPException(
                status_code=422, 
                detail=f"Tipo de arquivo não suportado. Aceitos: {', '.join(supported_types)}"
            )
        
        # Gerar pedido
        order_id = generate_order_id()
        price = calculate_price(file_size, file_ext)
        
        # Criar PIX
        pix_code = generate_pix_code(price, order_id)
        qr_code = generate_qr_code_base64(pix_code)
        
        # Salvar arquivo temporariamente
        files_storage[order_id] = content
        
        # Criar pedido
        order = Order(
            order_id=order_id,
            filename=file.filename,
            file_size=file_size,
            file_type=file_ext,
            price=price,
            status=OrderStatus.PENDING_PAYMENT,
            created_at=datetime.now(),
            expires_at=datetime.now() + timedelta(minutes=15),
            pix_code=pix_code,
            pix_qr_code=qr_code
        )
        
        orders_db[order_id] = order
        
        return {
            "success": True,
            "order_id": order_id,
            "filename": file.filename,
            "file_size": file_size,
            "file_type": file_ext,
            "price": f"R$ {price:.2f}",
            "status": "pending_payment",
            "payment": {
                "pix_code": pix_code,
                "qr_code": qr_code,
                "amount": price,
                "expires_in": "15 minutos"
            },
            "message": "Pedido criado. Complete o pagamento PIX para iniciar conversão."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@app.get("/api/orders/{order_id}")
async def get_order(order_id: str):
    """Consulta status do pedido"""
    
    if order_id not in orders_db:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    
    order = orders_db[order_id]
    
    # Verificar expiração
    if datetime.now() > order.expires_at and order.status == OrderStatus.PENDING_PAYMENT:
        order.status = OrderStatus.EXPIRED
    
    response = {
        "order_id": order.order_id,
        "filename": order.filename,
        "status": order.status,
        "price": f"R$ {order.price:.2f}",
        "created_at": order.created_at.isoformat(),
        "expires_at": order.expires_at.isoformat() if order.expires_at else None
    }
    
    # Adicionar dados específicos por status
    if order.status == OrderStatus.PENDING_PAYMENT:
        response["payment"] = {
            "pix_code": order.pix_code,
            "qr_code": order.pix_qr_code,
            "time_remaining": max(0, int((order.expires_at - datetime.now()).total_seconds()))
        }
    
    elif order.status == OrderStatus.COMPLETED:
        response["result"] = {
            "text_length": len(order.extracted_text) if order.extracted_text else 0,
            "download_available": order.converted_file_path is not None,
            "completed_at": order.completed_at.isoformat() if order.completed_at else None
        }
    
    return response

@app.post("/api/orders/{order_id}/confirm-payment")
async def confirm_payment(order_id: str, payment_data: dict):
    """Simula confirmação de pagamento (webhook do PSP)"""
    
    if order_id not in orders_db:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    
    order = orders_db[order_id]
    
    if order.status != OrderStatus.PENDING_PAYMENT:
        raise HTTPException(status_code=400, detail="Pedido não está aguardando pagamento")
    
    # Verificar se não expirou
    if datetime.now() > order.expires_at:
        order.status = OrderStatus.EXPIRED
        raise HTTPException(status_code=400, detail="Pedido expirado")
    
    # Simular validação de pagamento
    # Na produção: validar com PSP (Mercado Pago, PagSeguro, etc.)
    
    # Marcar como pago
    order.status = OrderStatus.PAID
    order.paid_at = datetime.now()
    
    return {
        "success": True,
        "order_id": order_id,
        "status": "paid",
        "message": "Pagamento confirmado. Iniciando conversão..."
    }

@app.post("/api/orders/{order_id}/process")
async def process_conversion(order_id: str):
    """Processa conversão após pagamento confirmado"""
    
    if order_id not in orders_db:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    
    order = orders_db[order_id]
    
    if order.status != OrderStatus.PAID:
        raise HTTPException(status_code=400, detail="Pagamento não confirmado")
    
    try:
        # Marcar como processando
        order.status = OrderStatus.PROCESSING
        
        # Recuperar arquivo
        file_content = files_storage.get(order_id)
        if not file_content:
            raise HTTPException(status_code=500, detail="Arquivo não encontrado")
        
        # Simular conversão (integrar com converters existentes)
        if order.file_type == "pdf":
            # Usar o converter PDF existente
            from app.converters.pdf_extract_text import extract_text_from_pdf
            import tempfile
            
            # Salvar temporariamente
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
                tmp_file.write(file_content)
                tmp_file_path = tmp_file.name
            
            # Converter
            success, result = extract_text_from_pdf(tmp_file_path)
            
            # Limpar arquivo temp
            os.unlink(tmp_file_path)
            
            if success:
                order.extracted_text = result
                order.status = OrderStatus.COMPLETED
                order.completed_at = datetime.now()
                
                return {
                    "success": True,
                    "order_id": order_id,
                    "status": "completed",
                    "result": {
                        "text_length": len(result),
                        "extracted_text": result[:500] + "..." if len(result) > 500 else result,
                        "full_text_available": True
                    },
                    "message": "Conversão concluída com sucesso!"
                }
            else:
                order.status = OrderStatus.FAILED
                raise HTTPException(status_code=500, detail=f"Erro na conversão: {result}")
        
        else:
            # Outros tipos de arquivo - implementar conversores específicos
            order.status = OrderStatus.FAILED
            raise HTTPException(status_code=501, detail=f"Conversor para {order.file_type} não implementado")
    
    except Exception as e:
        order.status = OrderStatus.FAILED
        raise HTTPException(status_code=500, detail=f"Erro no processamento: {str(e)}")

@app.get("/api/orders/{order_id}/download")
async def download_result(order_id: str):
    """Download do resultado da conversão"""
    
    if order_id not in orders_db:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    
    order = orders_db[order_id]
    
    if order.status != OrderStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Conversão não concluída")
    
    if not order.extracted_text:
        raise HTTPException(status_code=404, detail="Resultado não disponível")
    
    # Gerar arquivo texto para download
    import tempfile
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as tmp_file:
        tmp_file.write(f"CONVERSÃO - {order.filename}\n")
        tmp_file.write(f"Data: {order.completed_at.strftime('%d/%m/%Y %H:%M:%S')}\n")
        tmp_file.write(f"Tamanho original: {order.file_size} bytes\n")
        tmp_file.write("="*50 + "\n\n")
        tmp_file.write(order.extracted_text)
        tmp_file_path = tmp_file.name
    
    # Retornar arquivo
    return FileResponse(
        tmp_file_path,
        media_type='text/plain',
        filename=f"{order.filename}.txt"
    )

@app.get("/api/stats")
async def get_stats():
    """Estatísticas da API"""
    return {
        "api_version": "2.0.0",
        "supported_formats": ["PDF", "MPP", "DOC", "DOCX", "XLS", "XLSX"],
        "max_file_size": "50MB",
        "pricing": {
            "pdf": "R$ 3,00",
            "mpp": "R$ 10,00",
            "office": "R$ 5,00 - R$ 7,00"
        },
        "features": [
            "Payment via PIX",
            "Real-time status tracking",
            "Text extraction",
            "File conversion",
            "Download results"
        ],
        "payment_methods": ["PIX"],
        "session_timeout": "15 minutes"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)