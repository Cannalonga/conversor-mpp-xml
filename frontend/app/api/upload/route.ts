/**
 * POST /api/upload - Upload a file for conversion
 * 
 * Accepts file uploads and stores them temporarily for processing.
 * Returns a unique file ID that can be used to reference the file.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Allowed file extensions
const ALLOWED_EXTENSIONS = [
  'mpp', // Microsoft Project
  'pdf', 'doc', 'docx', 'xls', 'xlsx', // Documents
  'png', 'jpg', 'jpeg', 'gif', 'webp', // Images
  'mp4', 'mp3', 'wav', // Media
  'csv', 'txt', 'json', 'xml', // Data
];

// Max file size (100MB)
const MAX_FILE_SIZE = 100 * 1024 * 1024;

// Temporary storage directory
const UPLOAD_DIR = join(process.cwd(), 'uploads', 'temp');

export async function POST(request: NextRequest) {
  try {
    // Check authentication (optional - allows guest uploads with limitations)
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || 'guest';

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validate file extension
    const fileName = file.name.toLowerCase();
    const extension = fileName.split('.').pop() || '';
    
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        { success: false, error: `File type .${extension} is not allowed` },
        { status: 400 }
      );
    }

    // Generate unique file ID
    const fileId = randomUUID();
    const timestamp = Date.now();
    const safeFileName = `${fileId}_${timestamp}.${extension}`;

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Save file to disk
    const filePath = join(UPLOAD_DIR, safeFileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    console.log(`File uploaded: ${file.name} -> ${safeFileName} by user ${userId}`);

    // Return success response
    return NextResponse.json({
      success: true,
      fileId,
      file: {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        extension,
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
