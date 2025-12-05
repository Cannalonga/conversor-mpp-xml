'use client';

import { ReactNode } from 'react';

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  variant?: 'default' | 'highlight' | 'dark';
  href?: string;
  onClick?: () => void;
  className?: string;
}

export default function FeatureCard({
  icon,
  title,
  description,
  variant = 'default',
  href,
  onClick,
  className = '',
}: FeatureCardProps) {
  const baseStyles = `
    group relative p-6 rounded-2xl border transition-all duration-300 
    hover:scale-[1.02] hover:shadow-lg cursor-pointer
  `;

  const variantStyles = {
    default: 'bg-white border-gray-100 hover:border-[#0AC9D2]/30 hover:shadow-[#0AC9D2]/10',
    highlight: 'bg-gradient-to-br from-[#0B5E73]/5 to-[#0AC9D2]/5 border-[#0AC9D2]/20 hover:border-[#0AC9D2]/50',
    dark: 'bg-[#0F1724] border-white/10 text-white hover:border-[#0AC9D2]/50',
  };

  const iconContainerStyles = {
    default: 'bg-gradient-to-br from-[#0B5E73]/10 to-[#0AC9D2]/10 group-hover:from-[#0B5E73]/20 group-hover:to-[#0AC9D2]/20',
    highlight: 'bg-white shadow-md group-hover:shadow-lg',
    dark: 'bg-white/10 group-hover:bg-white/20',
  };

  const titleStyles = {
    default: 'text-[#0F1724]',
    highlight: 'text-[#0F1724]',
    dark: 'text-white',
  };

  const descriptionStyles = {
    default: 'text-gray-600',
    highlight: 'text-gray-600',
    dark: 'text-gray-400',
  };

  const CardWrapper = href ? 'a' : 'div';
  const cardProps = href ? { href } : { onClick };

  return (
    <CardWrapper
      {...cardProps}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
    >
      {/* Icon Container */}
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 ${iconContainerStyles[variant]}`}>
        <div className="w-7 h-7 text-[#0B5E73]">
          {icon}
        </div>
      </div>

      {/* Title */}
      <h3 className={`font-bold text-lg mb-2 ${titleStyles[variant]}`}>
        {title}
      </h3>

      {/* Description */}
      <p className={`text-sm leading-relaxed ${descriptionStyles[variant]}`}>
        {description}
      </p>

      {/* Hover Arrow Indicator */}
      {(href || onClick) && (
        <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-5 h-5 text-[#0AC9D2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </div>
      )}
    </CardWrapper>
  );
}
