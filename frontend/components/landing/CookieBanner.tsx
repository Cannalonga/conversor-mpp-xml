'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already accepted cookies
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      // Delay showing the banner for better UX
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptAll = () => {
    localStorage.setItem('cookie-consent', JSON.stringify({
      essential: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
    }));
    setIsVisible(false);
  };

  const acceptEssential = () => {
    localStorage.setItem('cookie-consent', JSON.stringify({
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
    }));
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-2xl animate-slide-up">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 w-12 h-12 bg-[#0B5E73]/10 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-[#0B5E73]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3 className="font-semibold text-[#0F1724] mb-1">
              🍪 Utilizamos cookies
            </h3>
            <p className="text-sm text-gray-600">
              Usamos cookies para melhorar sua experiência, analisar tráfego e personalizar anúncios. 
              Ao clicar em "Aceitar todos", você concorda com o uso de todos os cookies. 
              <Link href="/privacy" className="text-[#0B5E73] hover:underline ml-1">
                Política de Privacidade
              </Link>
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <button
              onClick={acceptEssential}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Apenas essenciais
            </button>
            <button
              onClick={acceptAll}
              className="px-4 py-2.5 text-sm font-semibold text-white bg-[#0B5E73] hover:bg-[#094a5c] rounded-lg transition-colors"
            >
              Aceitar todos
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
