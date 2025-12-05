'use client';

import { memo } from 'react';

interface AdSlotProps {
  slot: 'header' | 'sidebar' | 'footer' | 'inline';
  className?: string;
}

/**
 * Componente de espaço para anúncios (ADS)
 * 
 * Em produção, substitua o conteúdo pelo código do Google AdSense:
 * 
 * <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>
 * <ins class="adsbygoogle"
 *      style="display:block"
 *      data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
 *      data-ad-slot="XXXXXXXXXX"
 *      data-ad-format="auto"
 *      data-full-width-responsive="true"></ins>
 * <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
 */
function AdSlot({ slot, className = '' }: AdSlotProps) {
  const sizes: Record<string, string> = {
    header: 'h-20 md:h-24',      // 728x90 Leaderboard
    sidebar: 'h-64 w-full',       // 300x250 Medium Rectangle
    footer: 'h-20 md:h-24',       // 728x90 Leaderboard
    inline: 'h-24 md:h-28',       // 468x60 Banner
  };

  const labels: Record<string, string> = {
    header: 'Anúncio - Leaderboard',
    sidebar: 'Anúncio - Retângulo',
    footer: 'Anúncio - Leaderboard',
    inline: 'Anúncio - Banner',
  };

  return (
    <div 
      className={`
        ${sizes[slot]}
        bg-gradient-to-r from-gray-100 to-gray-50
        border-2 border-dashed border-gray-300
        rounded-xl
        flex items-center justify-center
        text-gray-400 text-sm
        transition-all duration-300
        hover:border-gray-400 hover:bg-gray-100
        ${className}
      `}
      aria-label={labels[slot]}
      role="complementary"
    >
      <div className="text-center">
        <svg className="w-6 h-6 mx-auto mb-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
        <span className="text-xs">{labels[slot]}</span>
      </div>
    </div>
  );
}

// Memo para evitar re-renders desnecessários
export default memo(AdSlot);
