'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type PixStatus = 'pending' | 'approved' | 'expired' | 'rejected' | 'error';

interface UsePixStatusOptions {
  paymentId: string | null;
  expirationMinutes?: number;
  pollingIntervalMs?: number;
  maxRetries?: number;
  onStatusChange?: (status: PixStatus) => void;
  onApproved?: () => void;
  onExpired?: () => void;
  autoStart?: boolean;
}

interface UsePixStatusReturn {
  status: PixStatus;
  timeLeft: number;
  checkCount: number;
  isPolling: boolean;
  error: string | null;
  formattedTime: string;
  isExpiringSoon: boolean;
  startPolling: () => void;
  stopPolling: () => void;
  resetTimer: () => void;
}

export function usePixStatus({
  paymentId,
  expirationMinutes = 30,
  pollingIntervalMs = 3000,
  maxRetries = 600, // 30 min / 3 sec = 600 checks max
  onStatusChange,
  onApproved,
  onExpired,
  autoStart = true,
}: UsePixStatusOptions): UsePixStatusReturn {
  const [status, setStatus] = useState<PixStatus>('pending');
  const [timeLeft, setTimeLeft] = useState(expirationMinutes * 60);
  const [checkCount, setCheckCount] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(true);
  const startTimeRef = useRef<number>(Date.now());
  const pausedTimeRef = useRef<number | null>(null);

  // Format time as MM:SS
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const formattedTime = formatTime(timeLeft);
  const isExpiringSoon = timeLeft <= 300; // 5 minutes

  // Update status and trigger callbacks
  const updateStatus = useCallback((newStatus: PixStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);

    if (newStatus === 'approved') {
      onApproved?.();
    } else if (newStatus === 'expired') {
      onExpired?.();
    }
  }, [onStatusChange, onApproved, onExpired]);

  // Check payment status via API
  const checkPaymentStatus = useCallback(async () => {
    if (!paymentId || status !== 'pending') return;

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_PROXY || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/premium/verify/${paymentId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setCheckCount(prev => prev + 1);

      // Map Mercado Pago status to our status
      const mpStatus = data.status?.toLowerCase();
      
      if (mpStatus === 'approved' || data.paid === true) {
        updateStatus('approved');
      } else if (mpStatus === 'rejected' || mpStatus === 'cancelled') {
        updateStatus('rejected');
      } else if (mpStatus === 'expired') {
        updateStatus('expired');
      }
      // 'pending' or 'in_process' keeps polling

    } catch (err) {
      console.error('Erro ao verificar pagamento:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      // Don't stop polling on error, just log it
    }
  }, [paymentId, status, updateStatus]);

  // Start polling
  const startPolling = useCallback(() => {
    if (!paymentId || isPolling) return;

    setIsPolling(true);
    isActiveRef.current = true;
    startTimeRef.current = Date.now();

    // Immediate first check
    checkPaymentStatus();

    // Setup interval
    pollingRef.current = setInterval(() => {
      if (isActiveRef.current && checkCount < maxRetries) {
        checkPaymentStatus();
      }
    }, pollingIntervalMs);

  }, [paymentId, isPolling, checkPaymentStatus, pollingIntervalMs, checkCount, maxRetries]);

  // Stop polling
  const stopPolling = useCallback(() => {
    setIsPolling(false);
    isActiveRef.current = false;
    
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Reset timer
  const resetTimer = useCallback(() => {
    setTimeLeft(expirationMinutes * 60);
    startTimeRef.current = Date.now();
  }, [expirationMinutes]);

  // Timer countdown effect
  useEffect(() => {
    if (status !== 'pending') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          updateStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [status, updateStatus]);

  // Handle page visibility (pause/resume on tab switch)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden - pause and store time
        pausedTimeRef.current = Date.now();
      } else {
        // Page is visible again - adjust timer
        if (pausedTimeRef.current) {
          const pausedDuration = Math.floor((Date.now() - pausedTimeRef.current) / 1000);
          setTimeLeft(prev => Math.max(0, prev - pausedDuration));
          pausedTimeRef.current = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Auto-start polling
  useEffect(() => {
    if (autoStart && paymentId && status === 'pending') {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [autoStart, paymentId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stop polling when status changes from pending
  useEffect(() => {
    if (status !== 'pending') {
      stopPolling();
    }
  }, [status, stopPolling]);

  return {
    status,
    timeLeft,
    checkCount,
    isPolling,
    error,
    formattedTime,
    isExpiringSoon,
    startPolling,
    stopPolling,
    resetTimer,
  };
}

export default usePixStatus;
