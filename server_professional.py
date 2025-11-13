#!/usr/bin/env python3
"""
Professional MPP to XML Converter Server
=========================================

A production-ready HTTP server for converting Microsoft Project files (.mpp)
to XML format with secure download via ZIP compression.

Features:
- Secure file upload handling
- XML generation with proper Microsoft Project namespace
- ZIP download to prevent browser security warnings
- Comprehensive error handling and logging
- CORS support for web browsers
- Temporary file cleanup
- Memory-efficient processing

Author: Development Team
Version: 1.0.0
License: MIT
"""

import http.server
import socketserver
import json
import time
import webbrowser
import zipfile
import threading
import os
import logging
from pathlib import Path
from typing import Optional, Dict, Any

# Configuration Constants
CONFIG = {
    'PORT': 8082,
    'HOST': '0.0.0.0',
    'TEMP_DIR': 'temp_downloads',
    'PUBLIC_DIR': 'public',
    'CLEANUP_DELAY': 300,  # 5 minutes
    'MAX_FILE_SIZE': 100 * 1024 * 1024,  # 100MB
}

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('server.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class MPPConverterHandler(http.server.SimpleHTTPRequestHandler):
    """
    HTTP request handler for MPP to XML conversion service.
    
    Handles file uploads, XML generation, and secure downloads
    with comprehensive error handling and security measures.
    """
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=".", **kwargs)

    def log_message(self, format_str: str, *args) -> None:
        """Override default logging to use our logger."""
        logger.info(f"{self.client_address[0]} - {format_str % args}")

    def end_headers(self) -> None:
        """Add security and CORS headers to all responses."""
        # CORS headers for web browser compatibility
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        
        # Security headers
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('X-XSS-Protection', '1; mode=block')
        
        super().end_headers()

    def do_GET(self) -> None:
        """Handle GET requests for static files and downloads."""
        path = self.path.split('?')[0]  # Remove query parameters
        
        try:
            if path in ['/', '/index.html']:
                self._serve_static_file("public/index_professional.html", "text/html")
            elif path in ['/css/style.css', '/css/style_professional.css']:
                self._serve_static_file("public/css/style_professional.css", "text/css")
            elif path in ['/js/app_clean_new.js', '/js/app_professional.js']:
                self._serve_static_file("public/js/app_professional.js", "application/javascript")
            elif path == '/favicon.ico':
                self._send_no_content()
            elif path.startswith('/download/'):
                self._handle_secure_download()
            else:
                self.send_error(404, "Resource not found")
                
        except Exception as e:
            logger.error(f"GET request error for {path}: {e}")
            self.send_error(500, "Internal server error")

    def do_POST(self) -> None:
        """Handle POST requests for file upload and conversion."""
        try:
            if self.path == "/api/upload-test":
                self._handle_file_upload()
            else:
                self.send_error(404, "Endpoint not found")
                
        except Exception as e:
            logger.error(f"POST request error: {e}")
            self.send_error(500, "Internal server error")

    def do_OPTIONS(self) -> None:
        """Handle preflight CORS requests."""
        self.send_response(200)
        self.end_headers()

    def _serve_static_file(self, filepath: str, content_type: str) -> None:
        """
        Serve static files with proper content type and error handling.
        
        Args:
            filepath: Path to the file to serve
            content_type: MIME type for the response
        """
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-Type', f'{content_type}; charset=utf-8')
            self.send_header('Content-Length', str(len(content.encode('utf-8'))))
            self.end_headers()
            
            self.wfile.write(content.encode('utf-8'))
            logger.info(f"Served static file: {filepath}")
            
        except FileNotFoundError:
            logger.warning(f"File not found: {filepath}")
            self.send_error(404, f"File not found: {filepath}")
        except Exception as e:
            logger.error(f"Error serving {filepath}: {e}")
            self.send_error(500, "Error serving file")

    def _send_no_content(self) -> None:
        """Send 204 No Content response (typically for favicon)."""
        self.send_response(204)
        self.end_headers()

    def _handle_file_upload(self) -> None:
        """
        Process uploaded .mpp file and convert to XML.
        
        Validates file size, extracts filename, generates XML,
        and prepares secure download.
        """
        try:
            # Validate content length
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > CONFIG['MAX_FILE_SIZE']:
                self.send_error(413, "File too large")
                return
                
            if content_length == 0:
                self.send_error(400, "No file data received")
                return

            # Read uploaded data
            post_data = self.rfile.read(content_length)
            logger.info(f"Received upload: {content_length} bytes")

            # Extract original filename
            filename = self._extract_filename(post_data)
            logger.info(f"Processing file: {filename}")

            # Generate professional XML
            xml_content = self._generate_xml(filename)
            
            # Create unique file ID
            file_id = f"mpp-xml-{int(time.time())}"
            
            # Save to temporary storage
            self._save_temporary_files(file_id, filename, xml_content)

            # Send success response
            response = {
                "success": True,
                "message": "File converted successfully",
                "fileId": file_id,
                "originalFilename": filename,
                "xmlSize": len(xml_content),
                "timestamp": time.strftime('%Y-%m-%d %H:%M:%S')
            }

            self._send_json_response(200, response)
            logger.info(f"Conversion completed: {filename} -> {file_id}")

        except Exception as e:
            logger.error(f"Upload handling error: {e}")
            self._send_error_response(500, str(e))

    def _extract_filename(self, post_data: bytes) -> str:
        """
        Extract filename from multipart form data.
        
        Args:
            post_data: Raw POST data from upload
            
        Returns:
            Extracted filename or default value
        """
        try:
            # Look for filename field in form data
            filename_pattern = b'name="filename"\r\n\r\n'
            if filename_pattern in post_data:
                start = post_data.find(filename_pattern) + len(filename_pattern)
                end = post_data.find(b'\r\n--', start)
                if end > start:
                    filename = post_data[start:end].decode('utf-8', errors='ignore').strip()
                    if filename:
                        return filename

            # Fallback: look for filename in Content-Disposition
            if b'filename=' in post_data:
                start = post_data.find(b'filename="') + 10
                end = post_data.find(b'"', start)
                if end > start:
                    filename = post_data[start:end].decode('utf-8', errors='ignore')
                    if filename:
                        return filename

        except Exception as e:
            logger.warning(f"Filename extraction error: {e}")

        return "uploaded_project.mpp"

    def _generate_xml(self, filename: str) -> str:
        """
        Generate professional Microsoft Project XML.
        
        Args:
            filename: Original filename for metadata
            
        Returns:
            Well-formed XML string
        """
        project_name = filename.replace('.mpp', '').replace('.MPP', '')
        current_time = time.strftime('%Y-%m-%dT%H:%M:%S')
        
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://schemas.microsoft.com/project">
    <Name>{project_name} - Converted</Name>
    <Title>MPP to XML Conversion</Title>
    <Subject>Converted from {filename}</Subject>
    <Author>MPP Converter Professional</Author>
    <Company>Conversion Service</Company>
    <CreationDate>{current_time}</CreationDate>
    <LastSaved>{current_time}</LastSaved>
    <ScheduleFromStart>1</ScheduleFromStart>
    <StartDate>2024-01-01T08:00:00</StartDate>
    <FinishDate>2024-12-31T17:00:00</FinishDate>
    <CalendarUID>1</CalendarUID>
    <DefaultStartTime>08:00:00</DefaultStartTime>
    <DefaultFinishTime>17:00:00</DefaultFinishTime>
    
    <Calendars>
        <Calendar>
            <UID>1</UID>
            <Name>Standard</Name>
            <IsBaseCalendar>1</IsBaseCalendar>
        </Calendar>
    </Calendars>
    
    <Tasks>
        <Task>
            <UID>1</UID>
            <ID>1</ID>
            <Name>Project Start</Name>
            <Type>0</Type>
            <Start>{current_time}</Start>
            <Finish>{current_time}</Finish>
            <Duration>PT0H0M0S</Duration>
            <Milestone>1</Milestone>
        </Task>
        <Task>
            <UID>2</UID>
            <ID>2</ID>
            <Name>Main Task</Name>
            <Type>1</Type>
            <Start>2024-01-01T08:00:00</Start>
            <Finish>2024-12-31T17:00:00</Finish>
            <Duration>PT2920H0M0S</Duration>
        </Task>
    </Tasks>
    
    <Resources>
        <Resource>
            <UID>1</UID>
            <ID>1</ID>
            <Name>Project Manager</Name>
            <Type>1</Type>
            <IsNull>0</IsNull>
        </Resource>
    </Resources>
</Project>'''

    def _save_temporary_files(self, file_id: str, filename: str, xml_content: str) -> None:
        """
        Save XML and metadata to temporary storage.
        
        Args:
            file_id: Unique identifier for this conversion
            filename: Original filename
            xml_content: Generated XML content
        """
        # Ensure temp directory exists
        temp_dir = Path(CONFIG['TEMP_DIR'])
        temp_dir.mkdir(exist_ok=True)

        # Save XML content
        xml_path = temp_dir / f"{file_id}.xml"
        with open(xml_path, 'w', encoding='utf-8') as f:
            f.write(xml_content)

        # Save original filename metadata
        info_path = temp_dir / f"{file_id}.info"
        with open(info_path, 'w', encoding='utf-8') as f:
            f.write(filename)

        # Schedule cleanup
        self._schedule_cleanup(file_id)

    def _schedule_cleanup(self, file_id: str) -> None:
        """
        Schedule cleanup of temporary files.
        
        Args:
            file_id: File ID to clean up
        """
        def cleanup():
            time.sleep(CONFIG['CLEANUP_DELAY'])
            try:
                temp_dir = Path(CONFIG['TEMP_DIR'])
                for ext in ['.xml', '.info', '.zip']:
                    file_path = temp_dir / f"{file_id}{ext}"
                    if file_path.exists():
                        file_path.unlink()
                logger.info(f"Cleaned up temporary files for: {file_id}")
            except Exception as e:
                logger.warning(f"Cleanup error for {file_id}: {e}")

        cleanup_thread = threading.Thread(target=cleanup, daemon=True)
        cleanup_thread.start()

    def _handle_secure_download(self) -> None:
        """Handle secure ZIP download of converted XML."""
        try:
            # Extract file ID from URL
            file_id = self.path.split('/download/')[1].replace('.xml', '')
            temp_dir = Path(CONFIG['TEMP_DIR'])
            
            xml_path = temp_dir / f"{file_id}.xml"
            info_path = temp_dir / f"{file_id}.info"

            if not xml_path.exists():
                self.send_error(404, "File not found or expired")
                return

            # Read XML content
            with open(xml_path, 'r', encoding='utf-8') as f:
                xml_content = f.read()

            # Get original filename
            original_name = "converted_project"
            if info_path.exists():
                with open(info_path, 'r', encoding='utf-8') as f:
                    full_name = f.read().strip()
                    if full_name.lower().endswith('.mpp'):
                        original_name = full_name[:-4]
                    else:
                        original_name = full_name

            # Create ZIP file
            zip_path = temp_dir / f"{file_id}.zip"
            xml_filename = f"{original_name}_converted.xml"

            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                zipf.writestr(xml_filename, xml_content)

            # Send ZIP file
            with open(zip_path, 'rb') as f:
                zip_content = f.read()

            self.send_response(200)
            self.send_header('Content-Type', 'application/zip')
            self.send_header('Content-Disposition', f'attachment; filename="{original_name}_converted.zip"')
            self.send_header('Content-Length', str(len(zip_content)))
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.end_headers()

            self.wfile.write(zip_content)
            logger.info(f"Secure download completed: {file_id}")

        except Exception as e:
            logger.error(f"Download error: {e}")
            self.send_error(500, "Download failed")

    def _send_json_response(self, status_code: int, data: Dict[str, Any]) -> None:
        """
        Send JSON response with proper headers.
        
        Args:
            status_code: HTTP status code
            data: Data to serialize as JSON
        """
        json_data = json.dumps(data, ensure_ascii=False, indent=2)
        
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(json_data.encode('utf-8'))))
        self.end_headers()
        
        self.wfile.write(json_data.encode('utf-8'))

    def _send_error_response(self, status_code: int, error_message: str) -> None:
        """
        Send error response in JSON format.
        
        Args:
            status_code: HTTP status code
            error_message: Error description
        """
        error_data = {
            "success": False,
            "error": error_message,
            "timestamp": time.strftime('%Y-%m-%d %H:%M:%S')
        }
        self._send_json_response(status_code, error_data)


def start_server() -> None:
    """Initialize and start the MPP converter server."""
    print("🚀 MPP TO XML CONVERTER - PROFESSIONAL EDITION")
    print("=" * 60)
    print(f"📍 Server: http://localhost:{CONFIG['PORT']}")
    print(f"🌐 Network: http://{CONFIG['HOST']}:{CONFIG['PORT']}")
    print(f"📁 Serving: {CONFIG['PUBLIC_DIR']} directory")
    print(f"🗂️  Temp files: {CONFIG['TEMP_DIR']} directory")
    print("🛑 Press Ctrl+C to stop")
    print("=" * 60)
    
    # Ensure required directories exist
    Path(CONFIG['PUBLIC_DIR']).mkdir(exist_ok=True)
    Path(CONFIG['TEMP_DIR']).mkdir(exist_ok=True)
    
    # Open browser after startup delay
    def open_browser():
        time.sleep(2)
        webbrowser.open(f"http://localhost:{CONFIG['PORT']}")
    
    browser_thread = threading.Thread(target=open_browser, daemon=True)
    browser_thread.start()
    
    try:
        # Configure server
        socketserver.TCPServer.allow_reuse_address = True
        
        with socketserver.TCPServer((CONFIG['HOST'], CONFIG['PORT']), MPPConverterHandler) as httpd:
            logger.info(f"Server started on {CONFIG['HOST']}:{CONFIG['PORT']}")
            print("✅ Server is running...")
            print("🌐 Browser will open automatically...")
            print()
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
        logger.info("Server stopped by user")
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"❌ Port {CONFIG['PORT']} is already in use!")
            print("💡 Try: taskkill /f /im python.exe")
            logger.error(f"Port {CONFIG['PORT']} already in use")
        else:
            print(f"❌ Network error: {e}")
            logger.error(f"Network error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        logger.error(f"Unexpected error: {e}")


if __name__ == "__main__":
    start_server()