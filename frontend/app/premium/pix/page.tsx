'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

function PixContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'pending' | 'approved' | 'expired'>('pending');
  const [copied, setCopied] = useState(false);

  const transactionId = searchParams.get('transactionId');
  const amount = searchParams.get('amount');
  const qrCode = searchParams.get('qrCode');
  const qrCodeBase64 = searchParams.get('qrCodeBase64');

  // Poll para verificar status do pagamento
  useEffect(() => {
    if (!transactionId) return;

    const checkStatus = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_PROXY || 'http://localhost:3001';
        const response = await fetch(`${backendUrl}/api/premium/verify/${transactionId}`);
        const data = await response.json();

        if (data.transaction?.status === 'approved' || data.transaction?.status === 'completed') {
          setStatus('approved');
        } else if (data.status === 'expired') {
          setStatus('expired');
        }
      } catch (err) {
        console.error('Erro ao verificar status:', err);
      }
    };

    // Verificar a cada 5 segundos
    const interval = setInterval(checkStatus, 5000);
    checkStatus(); // Verificar imediatamente

    return () => clearInterval(interval);
  }, [transactionId]);

  const copyToClipboard = async () => {
    if (qrCode) {
      await navigator.clipboard.writeText(qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (!transactionId || !qrCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B5E73] via-[#0AC9D2] to-[#0B5E73] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 text-center shadow-2xl">
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
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erro</h1>
          <p className="text-gray-600 mb-6">Dados do PIX não encontrados</p>
          <Link href="/premium" className="text-[#0B5E73] hover:text-[#0AC9D2] transition-colors">
            ← Voltar ao checkout
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
          <h1 className="text-2xl font-bold text-green-600 mb-4">Pagamento Confirmado!</h1>
          <p className="text-gray-600 mb-6">
            Seu plano premium foi ativado com sucesso. Aproveite todos os recursos!
          </p>
          <Link
            href="/dashboard"
            className="inline-block bg-gradient-to-r from-[#0B5E73] to-[#0AC9D2] hover:from-[#094a5c] hover:to-[#09b5bd] text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Ir para o Dashboard
          </Link>
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
                src="/img/logo.png"
                alt="CannaConvert Logo"
                width={72}
                height={52}
                className="object-contain"
              />
            </div>
          </div>
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">PIX Expirado</h1>
          <p className="text-gray-600 mb-6">
            O tempo para pagamento expirou. Por favor, gere um novo QR Code.
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

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0B5E73] via-[#0AC9D2] to-[#0B5E73]">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#0B5E73] via-[#0AC9D2] to-[#0B5E73] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-16 h-12 bg-black rounded-lg flex items-center justify-center shadow-lg">
              <Image 
                src="/img/logo.png" 
                alt="CannaConvert Logo" 
                width={56} 
                height={40}
                className="object-contain"
              />
            </div>
            <span className="text-2xl font-bold">
              <span className="bg-gradient-to-r from-[#DC2626] via-white to-[#2563EB] bg-clip-text text-transparent">
                CannaConvert
              </span>
            </span>
          </Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl p-8 text-center shadow-2xl">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
              <span className="animate-pulse">●</span>
              Aguardando pagamento
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Pague via PIX</h1>
          <p className="text-gray-600 mb-6">
            Escaneie o QR Code ou copie o código para pagar
          </p>

          {/* QR Code */}
          <div className="bg-white border-4 border-[#0AC9D2] rounded-2xl p-4 inline-block mb-6">
            {qrCodeBase64 ? (
              <img
                src={qrCodeBase64.startsWith('data:') ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`}
                alt="QR Code PIX"
                className="w-48 h-48"
              />
            ) : (
              <div className="w-48 h-48 bg-gray-100 flex items-center justify-center">
                <span className="text-gray-400">QR Code</span>
              </div>
            )}
          </div>

          {/* Amount */}
          <div className="bg-gradient-to-r from-[#0B5E73]/10 to-[#0AC9D2]/10 rounded-lg p-4 mb-6">
            <span className="text-gray-600">Valor a pagar:</span>
            <div className="text-3xl font-bold text-[#0B5E73]">
              R$ {parseFloat(amount || '0').toFixed(2).replace('.', ',')}
            </div>
          </div>

          {/* Copy Code */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Código PIX (Copia e Cola)
            </label>
            <div className="relative">
              <input
                type="text"
                value={qrCode}
                readOnly
                className="w-full px-4 py-3 pr-24 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono focus:ring-2 focus:ring-[#0AC9D2] focus:border-transparent"
              />
              <button
                onClick={copyToClipboard}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-[#0B5E73] to-[#0AC9D2] hover:from-[#094a5c] hover:to-[#09b5bd] text-white px-4 py-1.5 rounded text-sm font-medium transition-colors"
              >
                {copied ? '✓ Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Timer */}
          <div className="text-sm text-gray-500 mb-6">
            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Este QR Code expira em 30 minutos
          </div>

          {/* Instructions */}
          <div className="bg-[#0AC9D2]/10 border border-[#0AC9D2]/20 rounded-lg p-4 text-left">
            <h3 className="font-semibold text-[#0B5E73] mb-2">Como pagar:</h3>
            <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
              <li>Abra o app do seu banco</li>
              <li>Escolha pagar via PIX</li>
              <li>Escaneie o QR Code ou cole o código</li>
              <li>Confirme o pagamento</li>
              <li>Aguarde a confirmação automática</li>
            </ol>
          </div>

          <div className="mt-6">
            <Link href="/premium" className="text-[#0B5E73] hover:text-[#0AC9D2] text-sm transition-colors">
              ← Escolher outro método de pagamento
            </Link>
          </div>
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
