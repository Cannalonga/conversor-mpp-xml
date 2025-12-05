'use client';

import { ReactNode } from 'react';
import AppHeader from './AppHeader';
import { Footer } from '@/components/landing';

interface AppLayoutProps {
  children: ReactNode;
  credits?: number | null;
  showFooter?: boolean;
}

export default function AppLayout({ children, credits, showFooter = true }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9FB]">
      <AppHeader credits={credits} />
      
      {/* Main Content with padding for fixed header */}
      <main className="flex-1 pt-20 md:pt-24">
        {children}
      </main>
      
      {showFooter && <Footer />}
    </div>
  );
}
