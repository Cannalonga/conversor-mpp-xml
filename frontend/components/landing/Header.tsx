'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#0B5E73] via-[#0AC9D2] to-[#0B5E73] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-4 group">
            <div className="w-16 h-12 md:w-20 md:h-14 bg-black rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <Image 
                src="/images/logo.png" 
                alt="CannaConvert" 
                width={72} 
                height={52}
                className="drop-shadow-lg object-contain"
              />
            </div>
            <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-[#DC2626] via-white to-[#2563EB] bg-clip-text text-transparent drop-shadow-sm">
              CannaConvert
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#conversores" className="text-white/90 hover:text-white font-medium transition-colors">
              Conversores
            </Link>
            <Link href="#precos" className="text-white/90 hover:text-white font-medium transition-colors">
              Preços
            </Link>
            <Link href="#seguranca" className="text-white/90 hover:text-white font-medium transition-colors">
              Segurança
            </Link>
          </nav>

          {/* CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link 
              href="/login"
              className="px-4 py-2 text-white font-medium hover:bg-white/10 rounded-lg transition-colors"
            >
              Entrar
            </Link>
            <Link 
              href="/premium"
              className="px-5 py-2.5 bg-[#FF7A59] hover:bg-[#e86a4a] text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              Comprar Créditos
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Menu"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/20">
            <nav className="flex flex-col gap-2">
              <Link href="#conversores" className="px-4 py-2 text-white hover:bg-white/10 rounded-lg">
                Conversores
              </Link>
              <Link href="#precos" className="px-4 py-2 text-white hover:bg-white/10 rounded-lg">
                Preços
              </Link>
              <Link href="#seguranca" className="px-4 py-2 text-white hover:bg-white/10 rounded-lg">
                Segurança
              </Link>
              <div className="flex flex-col gap-2 pt-2 mt-2 border-t border-white/20">
                <Link href="/login" className="px-4 py-2 text-white font-medium hover:bg-white/10 rounded-lg text-center">
                  Entrar
                </Link>
                <Link href="/premium" className="px-4 py-2 bg-[#FF7A59] text-white font-semibold rounded-lg text-center">
                  Comprar Créditos
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
