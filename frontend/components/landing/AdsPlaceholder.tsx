'use client';

interface AdsPlaceholderProps {
  position: 'header' | 'sidebar' | 'mid-content' | 'footer';
  size?: 'banner' | 'square' | 'leaderboard' | 'rectangle';
  className?: string;
}

export default function AdsPlaceholder({ 
  position, 
  size = 'banner',
  className = '' 
}: AdsPlaceholderProps) {
  const sizeClasses = {
    banner: 'h-[90px] max-w-[728px]', // 728x90 - Leaderboard
    square: 'h-[250px] w-[300px]', // 300x250 - Medium Rectangle
    leaderboard: 'h-[90px] w-full', // Full width leaderboard
    rectangle: 'h-[600px] w-[300px]', // 300x600 - Large Skyscraper
  };

  const positionLabels = {
    header: 'Banner Superior',
    sidebar: 'Anúncio Lateral',
    'mid-content': 'Anúncio Central',
    footer: 'Banner Inferior',
  };

  return (
    <div 
      className={`
        ${sizeClasses[size]} 
        ${className}
        bg-gradient-to-br from-gray-100 to-gray-50
        border-2 border-dashed border-gray-200
        rounded-lg
        flex flex-col items-center justify-center
        text-gray-400
        mx-auto
        overflow-hidden
        relative
      `}
      data-ad-position={position}
      data-ad-size={size}
    >
      {/* Ad indicator icon */}
      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-3">
        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      </div>
      
      <span className="text-sm font-medium">{positionLabels[position]}</span>
      <span className="text-xs text-gray-300 mt-1">
        Google AdSense / Publicidade
      </span>
      
      {/* Corner badge */}
      <div className="absolute top-2 left-2 px-2 py-0.5 bg-gray-200 rounded text-[10px] font-medium text-gray-500 uppercase tracking-wide">
        Ads
      </div>
    </div>
  );
}

// Pre-configured ad components for common placements
export function HeaderAd({ className = '' }: { className?: string }) {
  return (
    <div className={`py-2 bg-[#F7F9FB] ${className}`}>
      <AdsPlaceholder position="header" size="leaderboard" />
    </div>
  );
}

export function SidebarAd({ className = '' }: { className?: string }) {
  return <AdsPlaceholder position="sidebar" size="rectangle" className={className} />;
}

export function MidContentAd({ className = '' }: { className?: string }) {
  return (
    <div className={`py-8 ${className}`}>
      <AdsPlaceholder position="mid-content" size="banner" />
    </div>
  );
}

export function FooterAd({ className = '' }: { className?: string }) {
  return (
    <div className={`py-4 bg-gray-50 ${className}`}>
      <AdsPlaceholder position="footer" size="leaderboard" />
    </div>
  );
}
