#!/usr/bin/env python3
"""
Celery Tasks for Office Document Conversion
MPP-XML Converter Pro - Enterprise Edition
"""

import os
import tempfile
import logging
import shutil
from pathlib import Path
from typing import Dict, Any
from uuid import uuid4
import time

# Celery imports (adjust based on your celery setup)
from celery import Celery
from celery.exceptions import Retry

# Local imports (adjust paths based on your structure)
from app.converters.office import OfficeConverter, OfficeConverterError
# from app.storage import download_from_minio, upload_to_minio, generate_presigned_url
# from app.db import update_order_status, get_order_by_id

log = logging.getLogger("tasks.office")

# Initialize Celery app (adjust broker URL)
celery_app = Celery('office_converter')
celery_app.conf.update(
    broker_url=os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0'),
    result_backend=os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0'),
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='America/Sao_Paulo',
    enable_utc=True,
)

# Task configuration
TASK_CONFIG = {
    'bind': True,
    'autoretry_for': (Exception,),
    'retry_kwargs': {'max_retries': 3, 'countdown': 60},
    'task_time_limit': 600,  # 10 minutes
    'task_soft_time_limit': 480,  # 8 minutes
}

@celery_app.task(name="convert_office_document", **TASK_CONFIG)
def convert_office_task(self, order_id: str, object_name: str, target_format: str, 
                       user_id: str = None, **options) -> Dict[str, Any]:
    """
    Convert office document using LibreOffice headless
    
    Args:
        order_id: Unique order identifier
        object_name: MinIO object name for input file
        target_format: Target format (pdf, docx, xlsx, etc)
        user_id: Optional user identifier
        **options: Additional conversion options
        
    Returns:
        Dict with conversion results and download URL
    """
    task_id = self.request.id
    start_time = time.time()
    tmpdir = None
    
    log.info(f"🚀 Starting office conversion: {order_id} -> {target_format}")
    
    try:
        # Create secure temporary directory
        tmpdir = tempfile.mkdtemp(prefix=f"office_conv_{order_id}_{task_id}_")
        
        # Initialize converter
        converter = OfficeConverter(temp_dir=tmpdir)
        
        # Step 1: Download from MinIO storage
        log.info(f"📥 Downloading input file: {object_name}")
        local_input = os.path.join(tmpdir, f"input_{os.path.basename(object_name)}\")\n        \n        # TODO: Implement your storage download\n        # download_from_minio(object_name, local_input)\n        \n        # For now, create a placeholder (remove this in production)\n        # This is just for testing without MinIO\n        with open(local_input, 'w') as f:\n            f.write(\"# Placeholder for testing - implement MinIO download\")\n        \n        if not os.path.exists(local_input):\n            raise OfficeConverterError(\"Falha ao baixar arquivo de entrada\")\n        \n        # Update order status to PROCESSING\n        # update_order_status(order_id, \"PROCESSING\", task_id=task_id)\n        \n        # Step 2: Validate conversion\n        input_ext = Path(object_name).suffix.lstrip('.')\n        conversion_info = converter.validate_conversion(input_ext, target_format)\n        \n        log.info(f\"💰 Conversion price: R$ {conversion_info['price']} ({conversion_info['complexity']})\")\n        \n        # Step 3: Perform conversion\n        log.info(f\"🔄 Converting {input_ext.upper()} → {target_format.upper()}\")\n        \n        conversion_result = converter.convert_document(\n            local_input,\n            tmpdir,\n            target_format,\n            timeout=options.get('timeout', 300)\n        )\n        \n        if not conversion_result['success']:\n            error_msg = conversion_result['error']\n            log.error(f\"❌ Conversion failed: {error_msg}\")\n            \n            # Update order status to FAILED\n            # update_order_status(order_id, \"FAILED\", error=error_msg)\n            \n            return {\n                'success': False,\n                'error': error_msg,\n                'order_id': order_id,\n                'task_id': task_id,\n                'processing_time': time.time() - start_time\n            }\n        \n        # Step 4: Upload result to storage\n        output_path = conversion_result['output_file']\n        output_object = f\"results/{order_id}/{Path(output_path).name}\"\n        \n        log.info(f\"📤 Uploading result: {output_object}\")\n        \n        # TODO: Implement your storage upload\n        # upload_to_minio(output_path, output_object)\n        \n        # Generate presigned download URL\n        # presigned_url = generate_presigned_url(output_object, expires=3600)\n        presigned_url = f\"https://example.com/download/{output_object}\"  # Placeholder\n        \n        # Step 5: Update order status to COMPLETED\n        processing_time = time.time() - start_time\n        \n        result = {\n            'success': True,\n            'order_id': order_id,\n            'task_id': task_id,\n            'download_url': presigned_url,\n            'output_format': target_format,\n            'input_format': input_ext,\n            'file_size': conversion_result['file_size'],\n            'processing_time': processing_time,\n            'price_paid': conversion_info['price'],\n            'conversion_stats': converter.get_stats()\n        }\n        \n        # update_order_status(order_id, \"COMPLETED\", result=result, download_url=presigned_url)\n        \n        log.info(f\"✅ Conversion completed: {order_id} in {processing_time:.2f}s\")\n        return result\n        \n    except OfficeConverterError as e:\n        error_msg = f\"Office conversion error: {str(e)}\"\n        log.error(error_msg)\n        # update_order_status(order_id, \"FAILED\", error=error_msg)\n        return {\n            'success': False,\n            'error': error_msg,\n            'order_id': order_id,\n            'task_id': task_id,\n            'error_type': 'conversion_error'\n        }\n        \n    except Exception as e:\n        error_msg = f\"Unexpected error: {str(e)}\"\n        log.exception(\"Unexpected error in office conversion task\")\n        \n        # Retry logic\n        if self.request.retries < self.max_retries:\n            log.warning(f\"Retrying conversion {order_id} (attempt {self.request.retries + 1})\")\n            raise self.retry(countdown=60 * (self.request.retries + 1))\n        \n        # update_order_status(order_id, \"FAILED\", error=error_msg)\n        return {\n            'success': False,\n            'error': error_msg,\n            'order_id': order_id,\n            'task_id': task_id,\n            'error_type': 'system_error'\n        }\n        \n    finally:\n        # Cleanup temporary directory\n        if tmpdir and os.path.exists(tmpdir):\n            try:\n                shutil.rmtree(tmpdir)\n                log.debug(f\"🧹 Cleaned up temp directory: {tmpdir}\")\n            except Exception as cleanup_error:\n                log.warning(f\"Failed to cleanup {tmpdir}: {cleanup_error}\")\n\n@celery_app.task(name=\"batch_convert_office\")\ndef batch_convert_office_task(order_ids: list, target_format: str, **options) -> Dict[str, Any]:\n    \"\"\"\n    Convert multiple office documents in batch\n    \n    Args:\n        order_ids: List of order IDs to convert\n        target_format: Target format for all conversions\n        **options: Additional options\n        \n    Returns:\n        Dict with batch conversion results\n    \"\"\"\n    log.info(f\"🚀 Starting batch conversion: {len(order_ids)} files to {target_format}\")\n    \n    results = []\n    start_time = time.time()\n    \n    for order_id in order_ids:\n        try:\n            # Get order details\n            # order = get_order_by_id(order_id)\n            # object_name = order.input_file\n            object_name = f\"uploads/{order_id}.docx\"  # Placeholder\n            \n            # Queue individual conversion\n            task = convert_office_task.delay(\n                order_id, object_name, target_format, **options\n            )\n            \n            results.append({\n                'order_id': order_id,\n                'task_id': task.id,\n                'status': 'queued'\n            })\n            \n        except Exception as e:\n            log.error(f\"Failed to queue conversion for {order_id}: {e}\")\n            results.append({\n                'order_id': order_id,\n                'status': 'failed',\n                'error': str(e)\n            })\n    \n    batch_time = time.time() - start_time\n    \n    return {\n        'batch_id': uuid4().hex,\n        'total_files': len(order_ids),\n        'queued_successfully': len([r for r in results if r['status'] == 'queued']),\n        'failed_to_queue': len([r for r in results if r['status'] == 'failed']),\n        'target_format': target_format,\n        'batch_time': batch_time,\n        'results': results\n    }\n\n@celery_app.task(name=\"health_check_office_converter\")\ndef health_check_office_converter() -> Dict[str, Any]:\n    \"\"\"\n    Health check task for office converter\n    \"\"\"\n    try:\n        converter = OfficeConverter()\n        \n        return {\n            'status': 'healthy',\n            'libreoffice_available': converter.check_libreoffice_available(),\n            'supported_conversions': len(converter.get_supported_conversions()),\n            'converter_stats': converter.get_stats(),\n            'timestamp': time.time()\n        }\n    except Exception as e:\n        return {\n            'status': 'unhealthy',\n            'error': str(e),\n            'timestamp': time.time()\n        }\n\nif __name__ == \"__main__\":\n    # Test the tasks\n    print(\"🧪 Testing Office Converter Tasks...\")\n    \n    # Test health check\n    health = health_check_office_converter()\n    print(f\"Health Check: {health}\")\n    \n    print(\"✅ Office converter tasks ready!\")\n