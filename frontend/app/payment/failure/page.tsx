'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

function FailureContent() {
  const searchParams = useSearchParams();
  const transactionId = searchParams.get('transaction');

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
        
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold text-red-600 mb-4">
          Pagamento não aprovado
        </h1>
        
        <p className="text-gray-600 mb-6">
          Infelizmente seu pagamento não foi processado. Isso pode acontecer por diversos motivos, como:
        </p>

        <ul className="text-left text-gray-500 text-sm mb-6 space-y-2">
          <li>• Cartão recusado pelo banco</li>
          <li>• Limite insuficiente</li>
          <li>• Dados incorretos</li>
          <li>• Pagamento cancelado</li>
        </ul>

        {transactionId && (
          <p className="text-sm text-gray-400 mb-6">
            ID da transação: {transactionId}
          </p>
        )}

        <div className="space-y-3">
          <Link
            href="/premium"
            className="block w-full bg-gradient-to-r from-[#0B5E73] to-[#0AC9D2] hover:from-[#094a5c] hover:to-[#09b5bd] text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Tentar Novamente
          </Link>
          
          <Link
            href="/dashboard"
            className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Voltar ao Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function PaymentFailurePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#0B5E73] via-[#0AC9D2] to-[#0B5E73] flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    }>
      <FailureContent />
    </Suspense>
  );
}
