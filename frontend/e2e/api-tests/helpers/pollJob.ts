/**
 * Helper to poll job status until completion
 */

interface JobStatus {
  id: string;
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: {
    downloadUrl?: string;
    outputPath?: string;
    fileName?: string;
    fileSize?: number;
  };
  error?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PollResult {
  success: boolean;
  job?: JobStatus;
  error?: string;
  attempts?: number;
  totalTimeMs?: number;
}

interface PollOptions {
  /** Polling interval in ms (default: 2000) */
  intervalMs?: number;
  /** Maximum wait time in ms (default: 60000) */
  timeoutMs?: number;
  /** Callback on each poll */
  onPoll?: (job: JobStatus, attempt: number) => void;
}

/**
 * Poll job status until it reaches a terminal state (completed/failed)
 */
export async function pollJob(
  backendUrl: string,
  jobId: string,
  options: PollOptions = {}
): Promise<PollResult> {
  const {
    intervalMs = 2000,
    timeoutMs = 60000,
    onPoll,
  } = options;

  const startTime = Date.now();
  let attempts = 0;
  const maxAttempts = Math.ceil(timeoutMs / intervalMs);

  while (attempts < maxAttempts) {
    attempts++;
    const elapsed = Date.now() - startTime;
    
    if (elapsed > timeoutMs) {
      return {
        success: false,
        error: `Polling timeout after ${timeoutMs}ms`,
        attempts,
        totalTimeMs: elapsed,
      };
    }

    try {
      const response = await fetch(`${backendUrl}/api/jobs/${jobId}/status`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}`,
          attempts,
          totalTimeMs: Date.now() - startTime,
        };
      }

      const data = await response.json();
      const job: JobStatus = data.job || data;

      if (onPoll) {
        onPoll(job, attempts);
      }

      // Check for terminal states
      if (job.status === 'completed') {
        return {
          success: true,
          job,
          attempts,
          totalTimeMs: Date.now() - startTime,
        };
      }

      if (job.status === 'failed') {
        return {
          success: false,
          job,
          error: job.error || 'Job failed',
          attempts,
          totalTimeMs: Date.now() - startTime,
        };
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    } catch (error) {
      // Network error - retry
      console.warn(`Poll attempt ${attempts} failed:`, error);
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  return {
    success: false,
    error: `Max attempts (${maxAttempts}) reached`,
    attempts,
    totalTimeMs: Date.now() - startTime,
  };
}

/**
 * Get job status once (no polling)
 */
export async function getJobStatus(
  backendUrl: string,
  jobId: string
): Promise<JobStatus | null> {
  try {
    const response = await fetch(`${backendUrl}/api/jobs/${jobId}/status`);
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.job || data;
  } catch {
    return null;
  }
}
