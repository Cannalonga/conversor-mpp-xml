'use client';

import { useEffect, useState } from 'react';
import { api, Job } from '@/lib/api';

interface JobStatusClientProps {
  job: Job;
  onJobComplete: (job: Job) => void;
  onError: (error: string) => void;
}

export default function JobStatusClient({ job, onJobComplete, onError }: JobStatusClientProps) {
  const [currentJob, setCurrentJob] = useState<Job>(job);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        await api.pollJobStatus(
          job.id,
          (updatedJob) => {
            if (!cancelled) {
              setCurrentJob(updatedJob);
              
              if (updatedJob.status === 'completed' || updatedJob.status === 'failed') {
                onJobComplete(updatedJob);
              }
            }
          },
          2000,
          120 // 4 minutes timeout
        );
      } catch (err) {
        if (!cancelled) {
          onError(err instanceof Error ? err.message : 'Erro ao verificar status');
        }
      }
    };

    poll();

    return () => {
      cancelled = true;
    };
  }, [job.id, onJobComplete, onError]);

  const getStatusText = (status: Job['status']) => {
    switch (status) {
      case 'pending':
        return 'Aguardando na fila...';
      case 'processing':
        return 'Processando conversão...';
      case 'completed':
        return 'Concluído!';
      case 'failed':
        return 'Falhou';
      default:
        return 'Desconhecido';
    }
  };

  const getStatusColor = (status: Job['status']) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600';
      case 'processing':
        return 'text-blue-600';
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="py-6">
      <div className="text-center">
        {/* Animated Status Icon */}
        <div className="w-20 h-20 mx-auto mb-6 relative">
          {(currentJob.status === 'pending' || currentJob.status === 'processing') && (
            <>
              <div className="absolute inset-0 bg-primary-100 rounded-full animate-ping opacity-25" />
              <div className="relative w-full h-full bg-primary-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-primary-600 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            </>
          )}
          
          {currentJob.status === 'completed' && (
            <div className="w-full h-full bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          
          {currentJob.status === 'failed' && (
            <div className="w-full h-full bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>

        {/* Status Text */}
        <p className={`text-xl font-medium ${getStatusColor(currentJob.status)}`}>
          {getStatusText(currentJob.status)}
        </p>

        {/* Progress Bar */}
        {(currentJob.status === 'processing' || currentJob.status === 'pending') && (
          <div className="mt-4 max-w-xs mx-auto">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${currentJob.progress || (currentJob.status === 'pending' ? 10 : 50)}%` }}
              />
            </div>
            {currentJob.progress && (
              <p className="text-sm text-gray-500 mt-2">{currentJob.progress}%</p>
            )}
          </div>
        )}

        {/* Error Message */}
        {currentJob.status === 'failed' && currentJob.error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg max-w-md mx-auto">
            <p className="text-sm text-red-700">{currentJob.error}</p>
          </div>
        )}

        {/* Time Info */}
        <p className="text-xs text-gray-400 mt-4">
          Job ID: {currentJob.id}
        </p>
      </div>
    </div>
  );
}
