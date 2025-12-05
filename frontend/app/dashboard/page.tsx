'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { api, Converter, Job } from '@/lib/api';
import UploadClient from './upload-client';
import ConvertersClient from './converters-client';
import JobStatusClient from './job-status-client';
import { Card, CardHeader } from '@/components/Card';
import { Button } from '@/components/Button';
import { AppLayout } from '@/components/layout';

type Step = 'upload' | 'select' | 'converting' | 'complete';

export default function DashboardPage() {
  const { data: session } = useSession();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [converters, setConverters] = useState<Converter[]>([]);
  const [selectedConverter, setSelectedConverter] = useState<Converter | null>(null);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingConverters, setLoadingConverters] = useState(true);
  const [credits, setCredits] = useState<number | null>(null);
  const [chargingCredits, setChargingCredits] = useState(false);

  // Set access token when session changes (for authenticated backend calls)
  useEffect(() => {
    if (session?.accessToken) {
      api.setAccessToken(session.accessToken);
    } else {
      api.setAccessToken(null);
    }
  }, [session]);

  // Load converters on mount
  useEffect(() => {
    const loadConverters = async () => {
      try {
        const data = await api.getConverters();
        setConverters(data);
      } catch (err) {
        console.error('Failed to load converters:', err);
        setError('Não foi possível carregar os conversores');
      } finally {
        setLoadingConverters(false);
      }
    };
    loadConverters();
  }, []);

  // Load user credits
  useEffect(() => {
    const loadCredits = async () => {
      try {
        const res = await fetch('/api/credits/balance');
        const data = await res.json();
        if (data.success) {
          setCredits(data.balance);
        }
      } catch (err) {
        console.error('Failed to load credits:', err);
      }
    };
    loadCredits();
  }, [step]); // Refresh credits after each step

  const handleFileUploaded = (uploadedFileId: string, uploadedFile: File) => {
    setFileId(uploadedFileId);
    setFile(uploadedFile);
    setStep('select');
    setError(null);
  };

  const handleConverterSelect = (converter: Converter) => {
    setSelectedConverter(converter);
  };

  const handleStartConversion = async () => {
    if (!fileId || !selectedConverter) return;

    setChargingCredits(true);
    setError(null);

    try {
      // Step 1: Charge credits
      const chargeRes = await fetch('/api/credits/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ converterId: selectedConverter.id }),
      });
      
      const chargeData = await chargeRes.json();
      
      if (!chargeData.success) {
        if (chargeData.error === 'INSUFFICIENT_CREDITS') {
          setError(`Saldo insuficiente! Você precisa de mais créditos para esta conversão.`);
        } else {
          setError(chargeData.message || 'Erro ao processar cobrança');
        }
        return;
      }

      // Update credits display
      setCredits(chargeData.newBalance);

      // Step 2: Create job (credits already charged)
      const response = await api.createJob(fileId, selectedConverter.id);
      setCurrentJob({ 
        id: response.jobId, 
        status: 'pending',
        converter: selectedConverter.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setStep('converting');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar conversão');
    } finally {
      setChargingCredits(false);
    }
  };

  const handleJobComplete = (job: Job) => {
    setCurrentJob(job);
    if (job.status === 'completed') {
      setStep('complete');
    }
  };

  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setFileId(null);
    setSelectedConverter(null);
    setCurrentJob(null);
    setError(null);
  };

  return (
    <AppLayout credits={credits}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {[
              { key: 'upload', label: 'Upload', icon: '1' },
              { key: 'select', label: 'Selecionar', icon: '2' },
              { key: 'converting', label: 'Convertendo', icon: '3' },
              { key: 'complete', label: 'Pronto', icon: '4' },
            ].map((s, index) => (
              <div key={s.key} className="flex items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shadow-md
                    ${step === s.key ? 'bg-[#0B5E73] text-white' : 
                      ['upload', 'select', 'converting', 'complete'].indexOf(step) > index 
                        ? 'bg-green-500 text-white' 
                        : 'bg-white text-gray-400 border-2 border-gray-200'}
                  `}
                >
                  {['upload', 'select', 'converting', 'complete'].indexOf(step) > index ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : s.icon}
                </div>
                <span className={`ml-2 text-sm ${step === s.key ? 'text-[#0B5E73] font-semibold' : 'text-gray-500'}`}>
                  {s.label}
                </span>
                {index < 3 && (
                  <div className={`w-8 md:w-12 h-1 mx-2 md:mx-4 rounded ${
                    ['upload', 'select', 'converting', 'complete'].indexOf(step) > index 
                      ? 'bg-green-500' 
                      : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Step: Upload */}
        {step === 'upload' && (
          <Card>
            <CardHeader 
              title="Upload do Arquivo"
              description="Selecione ou arraste o arquivo que deseja converter"
              icon={
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              }
            />
            <UploadClient onFileUploaded={handleFileUploaded} />
          </Card>
        )}

        {/* Step: Select Converter */}
        {step === 'select' && file && (
          <Card>
            <CardHeader 
              title="Selecione o Conversor"
              description={`Arquivo: ${file.name}`}
              icon={
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              }
            />
            <ConvertersClient
              converters={converters}
              loading={loadingConverters}
              selectedConverter={selectedConverter}
              onSelect={handleConverterSelect}
              fileName={file.name}
            />
            <div className="mt-6 flex gap-4 items-center">
              <Button variant="secondary" onClick={handleReset}>
                Voltar
              </Button>
              <Button 
                onClick={handleStartConversion}
                disabled={!selectedConverter || chargingCredits}
                loading={chargingCredits}
              >
                {chargingCredits ? 'Processando...' : 'Iniciar Conversão'}
              </Button>
              {selectedConverter && (
                <span className="text-sm text-gray-500">
                  Custo: será cobrado dos seus créditos
                </span>
              )}
            </div>
            {error && error.includes('insuficiente') && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 font-medium">Créditos insuficientes</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Você precisa de mais créditos para esta conversão.
                </p>
                <Link 
                  href="/credits"
                  className="inline-block mt-2 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  Comprar créditos →
                </Link>
              </div>
            )}
          </Card>
        )}

        {/* Step: Converting */}
        {step === 'converting' && currentJob && (
          <Card>
            <CardHeader 
              title="Convertendo..."
              description={`Usando: ${selectedConverter?.name || currentJob.converter}`}
              icon={
                <svg className="w-5 h-5 text-primary-600 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              }
            />
            <JobStatusClient 
              job={currentJob} 
              onJobComplete={handleJobComplete}
              onError={(err) => setError(err)}
            />
          </Card>
        )}

        {/* Step: Complete */}
        {step === 'complete' && currentJob && (
          <Card>
            <CardHeader 
              title="Conversão Concluída!"
              description="Seu arquivo está pronto para download"
              icon={
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              {currentJob.result && (
                <div className="mb-6">
                  <p className="text-lg font-medium text-gray-900">{currentJob.result.fileName}</p>
                  <p className="text-sm text-gray-500">
                    {(currentJob.result.fileSize / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}

              <div className="flex gap-4 justify-center">
                <a
                  href={api.getDownloadUrl(currentJob.id)}
                  download
                  className="btn-primary inline-flex items-center gap-2 px-6 py-3"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </a>
                <Button variant="secondary" onClick={handleReset}>
                  Nova Conversão
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
