// Use proxy route to avoid CORS and HTTPS issues
// The Next.js rewrite rule in next.config.js proxies /backend/* to http://127.0.0.1:3001
// Using 127.0.0.1 instead of localhost to bypass browser HSTS forcing HTTPS
const BACKEND_URL = typeof window !== 'undefined' 
  ? '/backend'  // Browser: use Next.js proxy (avoids SSL issues)
  : (process.env.NEXT_PUBLIC_BACKEND_PROXY || 'http://127.0.0.1:3001'); // Server: direct call

export interface Converter {
  id: string;
  name: string;
  description: string;
  inputFormats: string[];
  outputFormat: string;
  category: string;
}

export interface Job {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  converter: string;
  progress?: number;
  result?: {
    downloadUrl: string;
    fileName: string;
    fileSize: number;
  };
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadResponse {
  success: boolean;
  fileId: string;
  fileName: string;
  fileSize: number;
}

export interface CreateJobResponse {
  success: boolean;
  jobId: string;
  message: string;
}

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor() {
    this.baseUrl = BACKEND_URL;
  }

  /**
   * Set access token for authenticated requests
   */
  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  /**
   * Get Authorization headers if token is set
   */
  private getAuthHeaders(): Record<string, string> {
    if (this.accessToken) {
      return { Authorization: `Bearer ${this.accessToken}` };
    }
    return {};
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get list of available converters
   */
  async getConverters(): Promise<Converter[]> {
    const response = await this.fetch<{ success: boolean; converters: Converter[] }>('/api/converters/list');
    return response.converters || [];
  }

  /**
   * Upload a file for conversion (with auth if available)
   */
  async uploadFile(file: File, onProgress?: (progress: number) => void): Promise<UploadResponse> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.baseUrl}/api/upload`);
      
      // Add Authorization header if token is set
      if (this.accessToken) {
        xhr.setRequestHeader('Authorization', `Bearer ${this.accessToken}`);
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            // Backend returns { success, file: { id, size, uploadedAt } }
            // We need to normalize to UploadResponse format
            const normalized: UploadResponse = {
              success: response.success,
              fileId: response.file?.id || response.fileId,
              fileName: file.name,
              fileSize: response.file?.size || response.fileSize || file.size
            };
            resolve(normalized);
          } catch {
            reject(new Error('Invalid response from server'));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.message || error.error || `Upload failed: ${xhr.statusText}`));
          } catch {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during upload'));
      };

      xhr.send(formData);
    });
  }

  /**
   * Create a conversion job (sends Authorization header if token set)
   */
  async createJob(fileId: string, converterId: string, options?: Record<string, unknown>): Promise<CreateJobResponse> {
    return this.fetch<CreateJobResponse>('/api/jobs/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId,
        converter: converterId,
        options,
      }),
    });
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<Job> {
    const response = await this.fetch<{ success: boolean; job: Job }>(`/api/jobs/${jobId}/status`);
    return response.job;
  }

  /**
   * Get download URL for completed job
   */
  getDownloadUrl(jobId: string): string {
    return `${this.baseUrl}/api/jobs/${jobId}/download`;
  }

  /**
   * Poll job status until completion
   */
  async pollJobStatus(
    jobId: string,
    onStatusChange: (job: Job) => void,
    intervalMs = 2000,
    maxAttempts = 60
  ): Promise<Job> {
    let attempts = 0;

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const job = await this.getJobStatus(jobId);
          onStatusChange(job);

          if (job.status === 'completed' || job.status === 'failed') {
            resolve(job);
            return;
          }

          attempts++;
          if (attempts >= maxAttempts) {
            reject(new Error('Job polling timeout'));
            return;
          }

          setTimeout(poll, intervalMs);
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }
}

export const api = new ApiClient();
export default api;
