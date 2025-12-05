'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

function PendingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const transactionId = searchParams.get('transaction');
  const [checkCount, setCheckCount] = useState(0);

  useEffect(() => {
    if (!transactionId) return;

    const checkStatus = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_PROXY || 'http://localhost:3001';
        const response = await fetch(`${backendUrl}/api/premium/verify/${transactionId}`);
        const data = await response.json();

        if (data.transaction?.status === 'approved' || data.transaction?.status === 'completed') {
          router.push(`/payment/success?transaction=${transactionId}`);
        } else if (data.status === 'rejected' || data.status === 'cancelled') {
          router.push(`/payment/failure?transaction=${transactionId}`);
        }

        setCheckCount(prev => prev + 1);
      } catch (err) {
        console.error('Erro ao verificar status:', err);
      }
    };

    // Verificar a cada 5 segundos por até 10 minutos
    const interval = setInterval(checkStatus, 5000);
    checkStatus();

    // Parar após 10 minutos
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 10 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [transactionId, router]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0B5E73] via-[#0AC9D2] to-[#0B5E73] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 text-center max-w-md w-full shadow-2xl">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-14 bg-black rounded-lg flex items-center justify-center shadow-lg">
            <Image
              src="/images/logo.png"
              alt="CannaConvert Logo"
              width={72}
              height={52}
              className="object-contain"
              style={{ width: 'auto', height: 'auto', maxWidth: '72px', maxHeight: '52px' }}
            />
          </div>
        </div>
        
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-amber-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold text-amber-600 mb-4">
          Pagamento em Análise
        </h1>
        
        <p className="text-gray-600 mb-6">
          Seu pagamento está sendo processado. Isso pode levar alguns minutos. 
          Você será redirecionado automaticamente quando for aprovado.
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center gap-2 text-amber-700">
            <span className="animate-pulse">●</span>
            Verificando status... ({checkCount} verificações)
          </div>
        </div>

        {transactionId && (
          <p className="text-sm text-gray-400 mb-6">
            ID da transação: {transactionId}
          </p>
        )}

        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Ir para o Dashboard
          </Link>
          
          <p className="text-sm text-gray-400">
            Você receberá um email quando o pagamento for confirmado
          </p>
        </div>
      </div>
    </main>
  );
}

export default function PaymentPendingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#0B5E73] via-[#0AC9D2] to-[#0B5E73] flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    }>
      <PendingContent />
    </Suspense>
  );
}
