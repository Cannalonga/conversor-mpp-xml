'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const transactionId = searchParams.get('transaction');

  useEffect(() => {
    // Redirecionar para dashboard após 5 segundos
    const timer = setTimeout(() => {
      router.push('/dashboard');
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0B5E73] via-[#0AC9D2] to-[#0B5E73] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 text-center max-w-md w-full shadow-2xl">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-14 bg-black rounded-lg flex items-center justify-center shadow-lg">
            <Image
              src="/img/logo.png"
              alt="CannaConvert Logo"
              width={72}
              height={52}
              className="object-contain"
            />
          </div>
        </div>
        
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold text-green-600 mb-4">
          Pagamento Aprovado! 🎉
        </h1>
        
        <p className="text-gray-600 mb-6">
          Seu plano premium foi ativado com sucesso. Agora você tem acesso a todos os conversores e recursos avançados!
        </p>

        {transactionId && (
          <p className="text-sm text-gray-400 mb-6">
            ID da transação: {transactionId}
          </p>
        )}

        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="block w-full bg-gradient-to-r from-[#0B5E73] to-[#0AC9D2] hover:from-[#094a5c] hover:to-[#09b5bd] text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Ir para o Dashboard
          </Link>
          
          <p className="text-sm text-gray-400">
            Redirecionando automaticamente em 5 segundos...
          </p>
        </div>
      </div>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#0B5E73] via-[#0AC9D2] to-[#0B5E73] flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
