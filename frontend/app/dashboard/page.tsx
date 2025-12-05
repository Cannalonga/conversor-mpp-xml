'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { api, Converter, Job } from '@/lib/api';
import { Card, CardHeader } from '@/components/Card';
import { Button } from '@/components/Button';
import { AppLayout } from '@/components/layout';

// Lazy load components para melhor performance
const UploadClient = lazy(() => import('./upload-client'));
const ConvertersClient = lazy(() => import('./converters-client'));
const JobStatusClient = lazy(() => import('./job-status-client'));
const ToolsGrid = lazy(() => import('@/components/dashboard/ToolsGrid'));
const AdSlot = lazy(() => import('@/components/ads/AdSlot'));

// Loading skeleton para componentes lazy
function LoadingSkeleton({ height = 'h-32' }: { height?: string }) {
  return (
    <div className={`${height} bg-gray-100 animate-pulse rounded-xl`} />
  );
}

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

  // Set access token when session changes
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
        const res = await fetch('/api/converters/list');
        const data = await res.json();
        if (data.success) {
          setConverters(data.converters);
        } else {
          throw new Error(data.error || 'Failed to load converters');
        }
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
  }, [step]);

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

      setCredits(chargeData.newBalance);

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
      <div className="max-w-7xl mx-auto px-4 py-6">
        
        {/* AD: Header Banner */}
        <Suspense fallback={<LoadingSkeleton height="h-20" />}>
          <div className="mb-6">
            <AdSlot slot="header" />
          </div>
        </Suspense>

        {/* Layout principal: Conteúdo + Sidebar */}
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Coluna principal */}
          <div className="flex-1 min-w-0">
            
            {/* Progress Steps - Mais compacto */}
            <div className="mb-6 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
                {[
                  { key: 'upload', label: 'Upload', icon: '1' },
                  { key: 'select', label: 'Selecionar', icon: '2' },
                  { key: 'converting', label: 'Convertendo', icon: '3' },
                  { key: 'complete', label: 'Pronto', icon: '4' },
                ].map((s, index) => (
                  <div key={s.key} className="flex items-center">
                    <div
                      className={`
                        w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold shadow-sm
                        ${step === s.key ? 'bg-[#0B5E73] text-white' : 
                          ['upload', 'select', 'converting', 'complete'].indexOf(step) > index 
                            ? 'bg-green-500 text-white' 
                            : 'bg-white text-gray-400 border-2 border-gray-200'}
                      `}
                    >
                      {['upload', 'select', 'converting', 'complete'].indexOf(step) > index ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : s.icon}
                    </div>
                    <span className={`ml-1.5 text-xs sm:text-sm hidden sm:inline ${step === s.key ? 'text-[#0B5E73] font-semibold' : 'text-gray-500'}`}>
                      {s.label}
                    </span>
                    {index < 3 && (
                      <div className={`w-6 sm:w-10 h-0.5 mx-1 sm:mx-3 rounded ${
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
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <svg className="w-5 h-5 text-[#0B5E73]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  }
                />
                <Suspense fallback={<LoadingSkeleton />}>
                  <UploadClient onFileUploaded={handleFileUploaded} />
                </Suspense>
              </Card>
            )}

            {/* Step: Select Converter */}
            {step === 'select' && file && (
              <Card>
                <CardHeader 
                  title="Selecione o Conversor"
                  description={`Arquivo: ${file.name}`}
                  icon={
                    <svg className="w-5 h-5 text-[#0B5E73]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  }
                />
                <Suspense fallback={<LoadingSkeleton />}>
                  <ConvertersClient
                    converters={converters}
                    loading={loadingConverters}
                    selectedConverter={selectedConverter}
                    onSelect={handleConverterSelect}
                    fileName={file.name}
                  />
                </Suspense>
                <div className="mt-4 flex gap-3 items-center flex-wrap">
                  <Button variant="secondary" onClick={handleReset} className="text-sm">
                    Voltar
                  </Button>
                  <Button 
                    onClick={handleStartConversion}
                    disabled={!selectedConverter || chargingCredits}
                    loading={chargingCredits}
                    className="text-sm"
                  >
                    {chargingCredits ? 'Processando...' : 'Iniciar Conversão'}
                  </Button>
                </div>
                {error && error.includes('insuficiente') && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 font-medium text-sm">Créditos insuficientes</p>
                    <Link 
                      href="/credits"
                      className="inline-block mt-1 text-sm font-medium text-[#0B5E73] hover:text-[#0AC9D2]"
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
                    <svg className="w-5 h-5 text-[#0B5E73] animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  }
                />
                <Suspense fallback={<LoadingSkeleton />}>
                  <JobStatusClient 
                    job={currentJob} 
                    onJobComplete={handleJobComplete}
                    onError={(err) => setError(err)}
                  />
                </Suspense>
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
                <div className="text-center py-4">
                  <div className="w-14 h-14 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  
                  {currentJob.result && (
                    <div className="mb-4">
                      <p className="font-medium text-gray-900">{currentJob.result.fileName}</p>
                      <p className="text-sm text-gray-500">
                        {(currentJob.result.fileSize / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3 justify-center">
                    <a
                      href={api.getDownloadUrl(currentJob.id)}
                      download
                      className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </a>
                    <Button variant="secondary" onClick={handleReset} className="text-sm">
                      Nova Conversão
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* AD: Inline Banner (após conversão) */}
            <Suspense fallback={<LoadingSkeleton height="h-24" />}>
              <div className="mt-6">
                <AdSlot slot="inline" />
              </div>
            </Suspense>

            {/* Grid de Ferramentas */}
            <Suspense fallback={<LoadingSkeleton height="h-48" />}>
              <div className="mt-6 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <ToolsGrid limit={20} showAll={true} />
              </div>
            </Suspense>

          </div>

          {/* Sidebar - ADS e Info */}
          <aside className="w-full lg:w-72 flex-shrink-0 space-y-4">
            
            {/* Créditos Card */}
            <div className="bg-gradient-to-br from-[#0B5E73] to-[#0AC9D2] rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/80 text-sm font-medium">Seus Créditos</span>
                <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-3xl font-bold mb-3">
                {credits !== null ? credits : '---'}
              </div>
              <Link 
                href="/credits"
                className="block w-full text-center bg-white/20 hover:bg-white/30 rounded-lg py-2 text-sm font-medium transition-colors"
              >
                + Comprar Créditos
              </Link>
            </div>

            {/* AD: Sidebar Rectangle */}
            <Suspense fallback={<LoadingSkeleton height="h-64" />}>
              <AdSlot slot="sidebar" />
            </Suspense>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Estatísticas</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Conversões hoje</span>
                  <span className="font-medium text-gray-900">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Este mês</span>
                  <span className="font-medium text-gray-900">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total</span>
                  <span className="font-medium text-gray-900">0</span>
                </div>
              </div>
            </div>

            {/* AD: Sidebar Rectangle 2 */}
            <Suspense fallback={<LoadingSkeleton height="h-64" />}>
              <AdSlot slot="sidebar" />
            </Suspense>

          </aside>
        </div>

        {/* AD: Footer Banner */}
        <Suspense fallback={<LoadingSkeleton height="h-20" />}>
          <div className="mt-6">
            <AdSlot slot="footer" />
          </div>
        </Suspense>

      </div>
    </AppLayout>
  );
}
