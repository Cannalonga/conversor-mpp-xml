'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

function SuccessContent() {
  const searchParams = useSearchParams();
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [amount, setAmount] = useState<string | null>(null);
  const [credits, setCredits] = useState<string | null>(null);

  useEffect(() => {
    setPaymentId(searchParams.get('payment_id') || searchParams.get('transactionId'));
    setAmount(searchParams.get('amount'));
    setCredits(searchParams.get('credits'));
  }, [searchParams]);

  return (
    <AppLayout>
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          {/* Success Card */}
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-[#16A34A] to-[#22C55E] px-6 py-8 text-center">
              <div className="w-20 h-20 bg-white rounded-full mx-auto flex items-center justify-center mb-4 shadow-lg">
                <svg className="w-10 h-10 text-[#16A34A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Pagamento Confirmado!
              </h1>
              <p className="text-white/90">
                Seu pagamento foi processado com sucesso
              </p>
            </div>

            {/* Content */}
            <div className="px-6 py-8">
              {/* Amount */}
              {amount && (
                <div className="text-center mb-6">
                  <p className="text-sm text-gray-500 mb-1">Valor pago</p>
                  <p className="text-3xl font-bold text-[#0F1724]">
                    R$ {parseFloat(amount).toFixed(2).replace('.', ',')}
                  </p>
                </div>
              )}

              {/* Credits Added */}
              {credits && (
                <div className="bg-[#16A34A]/10 rounded-xl p-4 mb-6 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <svg className="w-6 h-6 text-[#16A34A]" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 9V5a1 1 0 112 0v4h4a1 1 0 110 2h-4v4a1 1 0 11-2 0v-4H5a1 1 0 110-2h4z" />
                    </svg>
                    <span className="text-2xl font-bold text-[#16A34A]">{credits}</span>
                    <span className="text-[#16A34A] font-medium">créditos adicionados</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Já disponíveis na sua conta
                  </p>
                </div>
              )}

              {/* Transaction Details */}
              {paymentId && (
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">ID da transação</span>
                    <span className="font-mono text-gray-700">{paymentId}</span>
                  </div>
                </div>
              )}

              {/* Provider Badge */}
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-6">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Processado com segurança por
                <span className="font-semibold text-[#009EE3]">Mercado Pago</span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Link
                  href="/dashboard"
                  className="block w-full py-3 px-4 bg-[#0B5E73] hover:bg-[#094a5c] text-white font-semibold rounded-xl text-center transition-colors"
                >
                  Ir para o Dashboard
                </Link>
                <Link
                  href="/credits"
                  className="block w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl text-center transition-colors"
                >
                  Ver histórico de créditos
                </Link>
              </div>
            </div>
          </div>

          {/* Help Text */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Você receberá um e-mail de confirmação em breve.
            <br />
            Dúvidas? <a href="mailto:suporte@cannaconvert.com" className="text-[#0B5E73] hover:underline">Entre em contato</a>
          </p>
        </div>
      </div>
    </AppLayout>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="text-gray-500">Carregando...</div>
        </div>
      </AppLayout>
    }>
      <SuccessContent />
    </Suspense>
  );
}
