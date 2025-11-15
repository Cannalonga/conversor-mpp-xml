from fastapi import APIRouter, UploadFile, File, HTTPException
from uuid import uuid4
import os
from app.storage import upload_to_minio
from app.db import create_order
from app.tasks.pdf_tasks import convert_pdf_text

router = APIRouter()

@router.post("/convert/pdf/text")
async def convert_pdf_to_text(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Arquivo precisa ser PDF")

    uid = uuid4().hex
    tmp_path = f"/tmp/{uid}.pdf"

    size = 0
    with open(tmp_path, "wb") as f:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > 40 * 1024 * 1024:  # limite 40MB
                f.close()
                os.remove(tmp_path)
                raise HTTPException(status_code=413, detail="Arquivo PDF muito grande")
            f.write(chunk)

    object_name = f"uploads/{uid}.pdf"
    upload_to_minio(tmp_path, object_name)
    os.remove(tmp_path)

    order = create_order(uid, object_name, price_cents=300)  # R$ 3,00 por PDF-text

    convert_pdf_text.delay(order.id, object_name)

    return {
        "order_id": order.id,
        "status": "QUEUED",
        "message": "PDF recebido e enfileirado para extração de texto"
    }