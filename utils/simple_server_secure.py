"""
Example secure server for uploads (Flask).
This file is intentionally added as a safe, testable example.
It does NOT replace your existing simple_server.py automatically.
Test it locally: python simple_server_secure.py
"""
import os
from flask import Flask, request, jsonify, send_from_directory
from upload_utils import allowed_file, generate_safe_filename, ensure_upload_dir
from dotenv import load_dotenv

load_dotenv()

UPLOAD_DIR = os.getenv('UPLOAD_DIR', 'uploads')
MAX_FILE_SIZE = int(os.getenv('MAX_FILE_SIZE', 50 * 1024 * 1024))  # default 50MB

ensure_upload_dir(UPLOAD_DIR)

app = Flask(__name__)

# basic health endpoint
@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"}), 200


@app.route('/upload', methods=['POST'])
def upload():
    # check file presence
    if 'file' not in request.files:
        return jsonify({"error": "no file part"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "no selected file"}), 400

    # optional content-length check
    content_length = request.content_length
    if content_length and content_length > MAX_FILE_SIZE:
        return jsonify({"error": "file too large"}), 413

    # secure filename and extension check
    filename = file.filename
    if not allowed_file(filename):
        return jsonify({"error": "invalid file type"}), 400

    safe_name = generate_safe_filename(filename)
    out_path = os.path.join(UPLOAD_DIR, safe_name)

    # save streaming to disk (werkzeug handles streaming)
    file.save(out_path)

    # Return a safe identifier (the saved filename) — later enqueue for processing
    return jsonify({"status": "uploaded", "file": safe_name}), 201


if __name__ == '__main__':
    # run for local testing (do not use Flask dev server in production)
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)