'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

function FailedContent() {
  const searchParams = useSearchParams();
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    setPaymentId(searchParams.get('payment_id') || searchParams.get('transactionId'));
    setErrorCode(searchParams.get('error') || searchParams.get('status_detail'));
  }, [searchParams]);

  const getErrorMessage = (code: string | null) => {
    const errorMessages: Record<string, string> = {
      'cc_rejected_insufficient_amount': 'Saldo insuficiente na conta',
      'cc_rejected_bad_filled_other': 'Dados incorretos',
      'cc_rejected_high_risk': 'Pagamento recusado por segurança',
      'cc_rejected_max_attempts': 'Limite de tentativas excedido',
      'pending_contingency': 'Pagamento em análise',
      'pending_review_manual': 'Pagamento em revisão manual',
    };
    return errorMessages[code || ''] || 'Ocorreu um erro no processamento do pagamento';
  };

  return (
    <AppLayout>
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          {/* Failed Card */}
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-[#DC2626] to-[#EF4444] px-6 py-8 text-center">
              <div className="w-20 h-20 bg-white rounded-full mx-auto flex items-center justify-center mb-4 shadow-lg">
                <svg className="w-10 h-10 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Pagamento não aprovado
              </h1>
              <p className="text-white/90">
                Não foi possível processar seu pagamento
              </p>
            </div>

            {/* Content */}
            <div className="px-6 py-8">
              {/* Error Message */}
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="font-medium text-red-800">
                      {getErrorMessage(errorCode)}
                    </p>
                    {errorCode && (
                      <p className="text-sm text-red-600 mt-1">
                        Código: {errorCode}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Transaction ID */}
              {paymentId && (
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Referência</span>
                    <span className="font-mono text-gray-700">{paymentId}</span>
                  </div>
                </div>
              )}

              {/* Suggestions */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-3">O que fazer?</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-[#0B5E73] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    Verifique se há saldo suficiente na conta
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-[#0B5E73] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    Tente novamente com outro método de pagamento
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-[#0B5E73] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    Entre em contato com o suporte se o problema persistir
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Link
                  href="/premium"
                  className="block w-full py-3 px-4 bg-[#0B5E73] hover:bg-[#094a5c] text-white font-semibold rounded-xl text-center transition-colors"
                >
                  Tentar novamente
                </Link>
                <Link
                  href="/dashboard"
                  className="block w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl text-center transition-colors"
                >
                  Voltar ao Dashboard
                </Link>
              </div>
            </div>
          </div>

          {/* Help Text */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Precisa de ajuda?{' '}
            <a href="mailto:suporte@cannaconvert.com" className="text-[#0B5E73] hover:underline">
              Fale com o suporte
            </a>
          </p>
        </div>
      </div>
    </AppLayout>
  );
}

// Loading fallback component
function LoadingFallback() {
  return (
    <AppLayout>
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-20 h-20 bg-gray-200 rounded-full mb-4"></div>
          <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-36"></div>
        </div>
      </div>
    </AppLayout>
  );
}

// Export with Suspense wrapper to fix useSearchParams error
export default function PaymentFailedPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <FailedContent />
    </Suspense>
  );
}
