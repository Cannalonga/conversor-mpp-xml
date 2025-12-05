'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';

interface AppHeaderProps {
  credits?: number | null;
  variant?: 'light' | 'dark';
}

export default function AppHeader({ credits, variant = 'light' }: AppHeaderProps) {
  const { data: session } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Detectar scroll para adicionar sombra
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fechar menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => {
      setIsProfileOpen(false);
      setIsMenuOpen(false);
    };
    if (isProfileOpen || isMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isProfileOpen, isMenuOpen]);

  const headerBg = variant === 'dark' 
    ? 'bg-[#0F1724]' 
    : 'bg-gradient-to-r from-[#0B5E73] via-[#0AC9D2] to-[#0B5E73]';

  return (
    <header 
      className={`
        fixed top-0 left-0 right-0 z-50 transition-all duration-300
        ${headerBg}
        ${isScrolled ? 'shadow-lg' : 'shadow-md'}
      `}
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 md:h-24">
          {/* Logo - Otimizada para contraste e legibilidade */}
          <Link 
            href="/" 
            className="flex items-center gap-4 group"
            aria-label="CannaConvert - Página Inicial"
          >
            {/* Container da Logo - equilibrado */}
            <div className="w-36 h-16 md:w-44 md:h-20 bg-black rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 overflow-hidden px-4 py-2">
              <Image 
                src="/images/logo-cortada2.png" 
                alt="CannaConvert Logo" 
                width={160} 
                height={96}
                className="object-contain"
                style={{ width: 'auto', height: 'auto', maxHeight: '72px' }}
                priority
              />
            </div>
            {/* Texto da Logo com gradiente de alto contraste */}
            <span className="text-2xl md:text-3xl font-bold">
              <span className="bg-gradient-to-r from-[#DC2626] via-white to-[#2563EB] bg-clip-text text-transparent drop-shadow-sm">
                CannaConvert
              </span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2" role="navigation" aria-label="Menu principal">
            <Link 
              href="/dashboard" 
              className="text-white/90 hover:text-white font-medium transition-colors px-4 py-2 rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              Dashboard
            </Link>
            <Link 
              href="/premium" 
              className="text-white/90 hover:text-white font-medium transition-colors px-4 py-2 rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              Premium
            </Link>
            <Link 
              href="/#converters" 
              className="text-white/90 hover:text-white font-medium transition-colors px-4 py-2 rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              Ferramentas
            </Link>
          </nav>

          {/* Right Side - Credits & Profile */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Credits Display */}
            {credits !== undefined && credits !== null && (
              <Link 
                href="/credits"
                className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white/30"
                aria-label={`${credits} créditos disponíveis`}
              >
                <svg className="w-5 h-5 text-yellow-300" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 9V5a1 1 0 112 0v4h4a1 1 0 110 2h-4v4a1 1 0 11-2 0v-4H5a1 1 0 110-2h4z" />
                </svg>
                <span className="text-white font-semibold">{credits}</span>
                <span className="text-white/70 text-sm hidden sm:inline">créditos</span>
              </Link>
            )}

            {/* Buy Credits Button */}
            <Link 
              href="/premium"
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#FF7A59] hover:bg-[#e86a4a] text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#FF7A59]/50"
              aria-label="Comprar créditos"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Comprar
            </Link>

            {/* Profile Dropdown */}
            {session?.user ? (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsProfileOpen(!isProfileOpen);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/30"
                  aria-expanded={isProfileOpen}
                  aria-haspopup="true"
                  aria-label="Menu do usuário"
                >
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {session.user.name?.charAt(0) || session.user.email?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <svg 
                    className={`w-4 h-4 text-white/70 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isProfileOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50"
                    role="menu"
                    aria-orientation="vertical"
                  >
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{session.user.name || 'Usuário'}</p>
                      <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
                    </div>
                    <Link 
                      href="/dashboard" 
                      className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                      role="menuitem"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                      Dashboard
                    </Link>
                    <Link 
                      href="/credits" 
                      className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                      role="menuitem"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Histórico de Créditos
                    </Link>
                    <Link 
                      href="/settings" 
                      className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                      role="menuitem"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Configurações
                    </Link>
                    <div className="border-t border-gray-100 mt-2 pt-2">
                      <button
                        onClick={() => signOut({ callbackUrl: '/' })}
                        className="flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 w-full text-left transition-colors"
                        role="menuitem"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sair
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link 
                href="/login"
                className="px-4 py-2 text-white font-medium hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                Entrar
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(!isMenuOpen);
              }}
              className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/30"
              aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={isMenuOpen}
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div 
            className="md:hidden py-4 border-t border-white/20"
            role="navigation"
            aria-label="Menu mobile"
          >
            <nav className="flex flex-col gap-1">
              <Link 
                href="/dashboard" 
                className="px-4 py-3 text-white hover:bg-white/10 rounded-lg transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link 
                href="/premium" 
                className="px-4 py-3 text-white hover:bg-white/10 rounded-lg transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Premium
              </Link>
              <Link 
                href="/#converters" 
                className="px-4 py-3 text-white hover:bg-white/10 rounded-lg transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Ferramentas
              </Link>
              <Link 
                href="/credits" 
                className="px-4 py-3 text-white hover:bg-white/10 rounded-lg transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Histórico de Créditos
              </Link>
              {!session?.user && (
                <Link 
                  href="/login" 
                  className="px-4 py-3 mt-2 text-center text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Entrar
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
