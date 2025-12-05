'use client';

import { ReactNode } from 'react';

type NotificationVariant = 'info' | 'success' | 'warning' | 'error' | 'lgpd' | 'security';

interface NotificationBoxProps {
  variant?: NotificationVariant;
  title?: string;
  children: ReactNode;
  icon?: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const variantConfig = {
  info: {
    borderColor: 'border-l-[#0B5E73]',
    bgColor: 'bg-[#0B5E73]/5',
    iconColor: 'text-[#0B5E73]',
    titleColor: 'text-[#0B5E73]',
    defaultIcon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  success: {
    borderColor: 'border-l-[#16A34A]',
    bgColor: 'bg-[#16A34A]/5',
    iconColor: 'text-[#16A34A]',
    titleColor: 'text-[#16A34A]',
    defaultIcon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  warning: {
    borderColor: 'border-l-[#F59E0B]',
    bgColor: 'bg-[#F59E0B]/5',
    iconColor: 'text-[#F59E0B]',
    titleColor: 'text-[#F59E0B]',
    defaultIcon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  error: {
    borderColor: 'border-l-[#DC2626]',
    bgColor: 'bg-[#DC2626]/5',
    iconColor: 'text-[#DC2626]',
    titleColor: 'text-[#DC2626]',
    defaultIcon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  lgpd: {
    borderColor: 'border-l-purple-500',
    bgColor: 'bg-purple-50',
    iconColor: 'text-purple-600',
    titleColor: 'text-purple-700',
    defaultIcon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  security: {
    borderColor: 'border-l-[#0AC9D2]',
    bgColor: 'bg-[#0AC9D2]/5',
    iconColor: 'text-[#0AC9D2]',
    titleColor: 'text-[#0B5E73]',
    defaultIcon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
};

export default function NotificationBox({
  variant = 'info',
  title,
  children,
  icon,
  dismissible = false,
  onDismiss,
  className = '',
}: NotificationBoxProps) {
  const config = variantConfig[variant];

  return (
    <div
      className={`
        relative rounded-lg border-l-4 p-4
        ${config.borderColor} ${config.bgColor}
        ${className}
      `}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 ${config.iconColor}`}>
          {icon || config.defaultIcon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className={`font-semibold mb-1 ${config.titleColor}`}>
              {title}
            </h4>
          )}
          <div className="text-sm text-gray-700 leading-relaxed">
            {children}
          </div>
        </div>

        {/* Dismiss Button */}
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 rounded-md hover:bg-black/5 transition-colors"
            aria-label="Fechar"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
