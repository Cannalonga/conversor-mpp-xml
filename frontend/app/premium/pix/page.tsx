'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

function PixContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'pending' | 'approved' | 'expired' | 'rejected'>('pending');
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutos em segundos
  const [checkCount, setCheckCount] = useState(0);

  const transactionId = searchParams.get('transactionId') || searchParams.get('payment_id');
  const amount = searchParams.get('amount');
  const qrCode = searchParams.get('qrCode') || searchParams.get('pix_code');
  const qrCodeBase64 = searchParams.get('qrCodeBase64') || searchParams.get('qr_code_base64');
  const externalReference = searchParams.get('external_reference');

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          setStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Poll para verificar status do pagamento no Mercado Pago
  useEffect(() => {
    if (!transactionId) return;

    const checkStatus = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_PROXY || 'http://localhost:3001';
        const response = await fetch(`${backendUrl}/api/premium/verify/${transactionId}`);
        const data = await response.json();

        setCheckCount(prev => prev + 1);

        // Status do Mercado Pago
        if (data.status === 'approved' || data.transaction?.status === 'approved') {
          setStatus('approved');
          // Redirecionar após 2 segundos
          setTimeout(() => {
            router.push(`/payment/success?transaction=${transactionId}`);
          }, 2000);
        } else if (data.status === 'rejected' || data.status === 'cancelled') {
          setStatus('rejected');
        } else if (data.status === 'expired') {
          setStatus('expired');
        }
      } catch (err) {
        console.error('Erro ao verificar status:', err);
      }
    };

    // Verificar a cada 3 segundos (Mercado Pago recomenda polling frequente)
    const interval = setInterval(checkStatus, 3000);
    checkStatus(); // Verificar imediatamente

    return () => clearInterval(interval);
  }, [transactionId, router]);

  const copyToClipboard = async () => {
    if (qrCode) {
      await navigator.clipboard.writeText(qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!transactionId || !qrCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B5E73] via-[#0AC9D2] to-[#0B5E73] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 text-center shadow-2xl max-w-md">
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
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">Dados não encontrados</h1>
          <p className="text-gray-600 mb-6">
            Não foi possível carregar os dados do PIX. Por favor, tente novamente.
          </p>
          <Link 
            href="/premium" 
            className="inline-block bg-gradient-to-r from-[#0B5E73] to-[#0AC9D2] hover:from-[#094a5c] hover:to-[#09b5bd] text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Voltar ao checkout
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'approved') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B5E73] via-[#0AC9D2] to-[#0B5E73] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md shadow-2xl">
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
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-green-600 mb-4">Pagamento Confirmado! 🎉</h1>
          <p className="text-gray-600 mb-2">
            Recebemos seu pagamento via Mercado Pago.
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Seus créditos foram adicionados à sua conta!
          </p>
          
          {/* Mercado Pago Badge */}
          <div className="flex items-center justify-center gap-2 mb-6 text-sm text-gray-500">
            <span>Pagamento processado por</span>
            <div className="bg-[#009EE3] text-white px-2 py-1 rounded font-semibold text-xs">
              Mercado Pago
            </div>
          </div>

          <Link
            href="/dashboard"
            className="inline-block bg-gradient-to-r from-[#0B5E73] to-[#0AC9D2] hover:from-[#094a5c] hover:to-[#09b5bd] text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Ir para o Dashboard
          </Link>
          <p className="text-xs text-gray-400 mt-4">Redirecionando...</p>
        </div>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B5E73] via-[#0AC9D2] to-[#0B5E73] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md shadow-2xl">
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
            <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-amber-600 mb-4">PIX Expirado</h1>
          <p className="text-gray-600 mb-6">
            O tempo para pagamento expirou. Por favor, gere um novo QR Code para continuar.
          </p>
          <Link
            href="/premium"
            className="inline-block bg-gradient-to-r from-[#0B5E73] to-[#0AC9D2] hover:from-[#094a5c] hover:to-[#09b5bd] text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Gerar Novo PIX
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B5E73] via-[#0AC9D2] to-[#0B5E73] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md shadow-2xl">
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
          <h1 className="text-2xl font-bold text-red-600 mb-4">Pagamento Recusado</h1>
          <p className="text-gray-600 mb-6">
            O pagamento foi recusado ou cancelado. Por favor, tente novamente.
          </p>
          <Link
            href="/premium"
            className="inline-block bg-gradient-to-r from-[#0B5E73] to-[#0AC9D2] hover:from-[#094a5c] hover:to-[#09b5bd] text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Tentar Novamente
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0B5E73] via-[#0AC9D2] to-[#0B5E73]">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#0B5E73] via-[#0AC9D2] to-[#0B5E73] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-16 h-12 bg-black rounded-lg flex items-center justify-center shadow-lg">
              <Image 
                src="/images/logo.png" 
                alt="CannaConvert Logo" 
                width={56} 
                height={40}
                className="object-contain"
                style={{ width: 'auto', height: 'auto', maxWidth: '56px', maxHeight: '40px' }}
              />
            </div>
            <span className="text-2xl font-bold">
              <span className="bg-gradient-to-r from-[#DC2626] via-white to-[#2563EB] bg-clip-text text-transparent">
                CannaConvert
              </span>
            </span>
          </Link>
          
          {/* Mercado Pago Badge */}
          <div className="flex items-center gap-2">
            <span className="text-white/70 text-sm hidden sm:block">Pagamento seguro via</span>
            <div className="bg-[#009EE3] text-white px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-1">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              Mercado Pago
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl p-6 md:p-8 text-center shadow-2xl">
          {/* Status Badge */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-full text-sm font-medium">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              Aguardando pagamento
            </div>
          </div>

          {/* Timer */}
          <div className={`mb-4 text-sm ${timeLeft < 300 ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Expira em: <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Pague com PIX</h1>
          <p className="text-gray-600 mb-6">
            Escaneie o QR Code com o app do seu banco
          </p>

          {/* QR Code */}
          <div className="bg-white border-4 border-[#009EE3] rounded-2xl p-4 inline-block mb-6 shadow-lg">
            {qrCodeBase64 ? (
              <img
                src={qrCodeBase64.startsWith('data:') ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`}
                alt="QR Code PIX - Mercado Pago"
                className="w-52 h-52"
              />
            ) : (
              <div className="w-52 h-52 bg-gray-100 flex flex-col items-center justify-center rounded-lg">
                <svg className="w-12 h-12 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <span className="text-gray-400 text-sm">QR Code PIX</span>
              </div>
            )}
          </div>

          {/* Amount */}
          <div className="bg-gradient-to-r from-[#009EE3]/10 to-[#00B1EA]/10 rounded-xl p-4 mb-6 border border-[#009EE3]/20">
            <span className="text-gray-600 text-sm">Valor total:</span>
            <div className="text-3xl font-bold text-[#009EE3]">
              R$ {parseFloat(amount || '0').toFixed(2).replace('.', ',')}
            </div>
          </div>

          {/* Copy Code */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
              Código PIX Copia e Cola
            </label>
            <div className="relative">
              <input
                type="text"
                value={qrCode || ''}
                readOnly
                className="w-full px-4 py-3 pr-28 border-2 border-gray-200 rounded-xl bg-gray-50 text-xs font-mono focus:ring-2 focus:ring-[#009EE3] focus:border-transparent truncate"
              />
              <button
                onClick={copyToClipboard}
                className={`absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  copied 
                    ? 'bg-green-500 text-white' 
                    : 'bg-[#009EE3] hover:bg-[#0087c7] text-white'
                }`}
              >
                {copied ? '✓ Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Verification Status */}
          <div className="bg-gray-50 rounded-lg p-3 mb-6 flex items-center justify-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4 animate-spin text-[#009EE3]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            Verificando pagamento... ({checkCount})
          </div>

          {/* Instructions */}
          <div className="bg-[#009EE3]/5 border border-[#009EE3]/20 rounded-xl p-4 text-left mb-6">
            <h3 className="font-semibold text-[#009EE3] mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Como pagar:
            </h3>
            <ol className="text-sm text-gray-700 space-y-2">
              <li className="flex items-start gap-2">
                <span className="bg-[#009EE3] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">1</span>
                Abra o app do seu banco ou carteira digital
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-[#009EE3] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">2</span>
                Escolha pagar via PIX com QR Code
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-[#009EE3] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">3</span>
                Escaneie o código ou cole o PIX Copia e Cola
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-[#009EE3] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">4</span>
                Confirme e aguarde a aprovação automática
              </li>
            </ol>
          </div>

          {/* Security Badge */}
          <div className="flex items-center justify-center gap-4 text-xs text-gray-500 mb-4">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Pagamento Seguro
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Criptografado
            </div>
          </div>

          {/* Mercado Pago Footer */}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <span>Processado por</span>
              <div className="bg-[#009EE3] text-white px-2 py-0.5 rounded font-bold text-xs">
                Mercado Pago
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Link href="/premium" className="text-[#0B5E73] hover:text-[#0AC9D2] text-sm transition-colors">
              ← Escolher outro método de pagamento
            </Link>
          </div>

          {/* Transaction ID for reference */}
          {(transactionId || externalReference) && (
            <div className="mt-4 text-xs text-gray-400">
              ID: {transactionId || externalReference}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function PixPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#0B5E73] via-[#0AC9D2] to-[#0B5E73] flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    }>
      <PixContent />
    </Suspense>
  );
}
