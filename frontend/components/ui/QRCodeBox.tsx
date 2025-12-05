'use client';

import { useState } from 'react';
import Image from 'next/image';

interface QRCodeBoxProps {
  qrCodeUrl?: string;
  qrCodeBase64?: string;
  pixCode?: string;
  amount?: number;
  size?: 'sm' | 'md' | 'lg';
  showCopyButton?: boolean;
  provider?: 'mercadopago' | 'generic';
  onCopy?: () => void;
}

export default function QRCodeBox({
  qrCodeUrl,
  qrCodeBase64,
  pixCode,
  amount,
  size = 'md',
  showCopyButton = true,
  provider = 'mercadopago',
  onCopy,
}: QRCodeBoxProps) {
  const [copied, setCopied] = useState(false);
  const [imageError, setImageError] = useState(false);

  const sizeConfig = {
    sm: { container: 'w-40 h-40', qr: 160 },
    md: { container: 'w-56 h-56', qr: 224 },
    lg: { container: 'w-72 h-72', qr: 288 },
  };

  const config = sizeConfig[size];

  const handleCopyCode = async () => {
    if (!pixCode) return;
    
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  const providerStyles = {
    mercadopago: {
      borderColor: 'border-[#009EE3]',
      bgColor: 'bg-[#009EE3]/5',
      badgeColor: 'bg-[#009EE3]',
      badgeText: 'Mercado Pago',
    },
    generic: {
      borderColor: 'border-[#0B5E73]',
      bgColor: 'bg-[#0B5E73]/5',
      badgeColor: 'bg-[#0B5E73]',
      badgeText: 'PIX',
    },
  };

  const styles = providerStyles[provider];
  const qrSource = qrCodeBase64 || qrCodeUrl;

  return (
    <div className={`rounded-2xl border-2 ${styles.borderColor} ${styles.bgColor} p-6`}>
      {/* Provider Badge */}
      <div className="flex items-center justify-center mb-4">
        <span className={`px-3 py-1 ${styles.badgeColor} text-white text-xs font-semibold rounded-full`}>
          {styles.badgeText}
        </span>
      </div>

      {/* QR Code Container */}
      <div className={`${config.container} mx-auto bg-white rounded-xl p-3 shadow-md mb-4`}>
        {!imageError && qrSource ? (
          <Image
            src={qrSource}
            alt="QR Code PIX"
            width={config.qr}
            height={config.qr}
            className="w-full h-full object-contain"
            onError={() => setImageError(true)}
            priority
          />
        ) : (
          /* Fallback quando QR não carrega */
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 rounded-lg">
            <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h2m10 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <p className="text-xs text-gray-500 text-center px-2">
              QR Code indisponível
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Use o código PIX abaixo
            </p>
          </div>
        )}
      </div>

      {/* Amount Display */}
      {amount && (
        <div className="text-center mb-4">
          <p className="text-sm text-gray-500">Valor a pagar</p>
          <p className="text-2xl font-bold text-[#0F1724]">
            R$ {amount.toFixed(2).replace('.', ',')}
          </p>
        </div>
      )}

      {/* Copy PIX Code Button */}
      {showCopyButton && pixCode && (
        <button
          onClick={handleCopyCode}
          className={`
            w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200
            flex items-center justify-center gap-2
            ${copied 
              ? 'bg-[#16A34A] text-white' 
              : `${styles.badgeColor} text-white hover:opacity-90`
            }
          `}
        >
          {copied ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Código Copiado!
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copiar Código PIX
            </>
          )}
        </button>
      )}

      {/* PIX Code Display (truncated) */}
      {pixCode && (
        <div className="mt-3 p-3 bg-gray-100 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Código PIX Copia e Cola:</p>
          <p className="text-xs font-mono text-gray-700 truncate">
            {pixCode.substring(0, 50)}...
          </p>
        </div>
      )}

      {/* Security Badges */}
      <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <svg className="w-4 h-4 text-[#16A34A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Pagamento Seguro
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <svg className="w-4 h-4 text-[#0B5E73]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Criptografado
        </div>
      </div>
    </div>
  );
}
