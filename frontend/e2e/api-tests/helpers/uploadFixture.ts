/**
 * Helper to upload a file fixture via API
 */

import * as fs from 'fs';
import * as path from 'path';

interface UploadResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
}

/**
 * Upload a file to the backend API
 * @param backendUrl - Base URL of the backend
 * @param filePath - Path to the file to upload
 * @param authToken - Optional auth token
 */
export async function uploadFixture(
  backendUrl: string,
  filePath: string,
  authToken?: string
): Promise<UploadResult> {
  try {
    // Read file
    const absolutePath = path.isAbsolute(filePath) 
      ? filePath 
      : path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(absolutePath)) {
      return {
        success: false,
        error: `File not found: ${absolutePath}`,
      };
    }

    const fileBuffer = fs.readFileSync(absolutePath);
    const fileName = path.basename(absolutePath);
    
    // Create FormData with file
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: 'application/octet-stream' });
    formData.append('file', blob, fileName);

    // Upload
    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${backendUrl}/api/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || `Upload failed: ${response.status}`,
      };
    }

    return {
      success: true,
      fileId: data.file?.id || data.fileId,
      fileName: data.file?.originalName || fileName,
      fileSize: data.file?.size || fileBuffer.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error',
    };
  }
}

/**
 * Get path to a fixture file
 */
export function getFixturePath(fixtureName: string): string {
  // Try multiple locations
  const locations = [
    path.join(process.cwd(), 'e2e', 'fixtures', fixtureName),
    path.join(process.cwd(), 'e2e', 'api-tests', 'fixtures', fixtureName),
    path.join(__dirname, '..', 'fixtures', fixtureName),
  ];

  for (const loc of locations) {
    if (fs.existsSync(loc)) {
      return loc;
    }
  }

  throw new Error(`Fixture not found: ${fixtureName}. Searched in: ${locations.join(', ')}`);
}
