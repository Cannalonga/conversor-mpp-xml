from .celery_app import celery
from app.storage import download_from_minio, upload_to_minio, generate_presigned_url
from app.converters.pdf_extract_text import extract_text_from_pdf
from app.db import update_order_status
import os
import tempfile
import logging

log = logging.getLogger("tasks.pdf.text")

@celery.task(name="convert_pdf_text", bind=True)
def convert_pdf_text(self, order_id: str, object_name: str):
    tmpdir = tempfile.mkdtemp(prefix=f"pdftext_{order_id}_")

    try:
        local_in = os.path.join(tmpdir, "input.pdf")
        download_from_minio(object_name, local_in)

        success, result = extract_text_from_pdf(local_in)

        if not success:
            update_order_status(order_id, "FAILED", error=result)
            return {"status": "FAILED", "error": result}

        # salvar texto em arquivo .txt
        out_path = os.path.join(tmpdir, "extracted.txt")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(result)

        out_object = f"results/{order_id}/extracted.txt"
        upload_to_minio(out_path, out_object)

        presigned = generate_presigned_url(out_object, expires=3600)

        update_order_status(order_id, "COMPLETED", url=presigned)

        return {"status": "COMPLETED", "url": presigned}

    except Exception as e:
        log.exception("Erro inesperado no worker PDF→Texto")
        update_order_status(order_id, "FAILED", error=str(e))
        return {"status": "FAILED", "error": str(e)}

    finally:
        try:
            import shutil
            shutil.rmtree(tmpdir)
        except Exception:
            pass