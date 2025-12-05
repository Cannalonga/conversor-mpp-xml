import Link from 'next/link';
import Image from 'next/image';

export default function Hero() {
  return (
    <section className="relative pt-24 md:pt-32 pb-16 md:pb-24 bg-gradient-to-b from-[#F7F9FB] to-white overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#0B5E73]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#FF7A59]/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Content */}
          <div className="flex-1 text-center lg:text-left">
            {/* Logo grande */}
            <div className="flex items-center justify-center lg:justify-start gap-4 mb-8">
              <div className="w-24 h-16 md:w-28 md:h-20 bg-black rounded-xl flex items-center justify-center shadow-2xl">
                <Image 
                  src="/images/logo.png" 
                  alt="CannaConvert" 
                  width={96} 
                  height={68}
                  className="drop-shadow-lg object-contain"
                  style={{ width: 'auto', height: 'auto', maxWidth: '96px', maxHeight: '68px' }}
                />
              </div>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#0F1724] leading-tight mb-6">
              Converta arquivos em segundos —{' '}
              <span className="text-[#0B5E73]">rápido, seguro</span> e sem complicação.
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto lg:mx-0">
              <strong>19 conversores profissionais</strong> — documentos, imagens, vídeos, MPP→XML e muito mais. 
              Arquivos temporários <span className="text-[#16A34A] font-medium">encriptados</span> e excluídos automaticamente. 
              <span className="text-[#FF7A59] font-semibold"> Teste grátis.</span>
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
              <Link 
                href="/dashboard"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#0B5E73] hover:bg-[#094a5c] text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Converter agora
              </Link>
              <Link 
                href="/premium"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white border-2 border-[#E6EEF0] hover:border-[#0B5E73] text-[#0F1724] font-semibold text-lg rounded-xl transition-all"
              >
                <svg className="w-5 h-5 text-[#FF7A59]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Comprar créditos
              </Link>
            </div>

            {/* Social Proof */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#16A34A] rounded-full animate-pulse" />
                <span><strong className="text-[#0F1724]">+12.000</strong> conversões</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#16A34A]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>SLA <strong className="text-[#0F1724]">99.9%</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#0B5E73]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Suporte <strong className="text-[#0F1724]">24/7</strong></span>
              </div>
            </div>
          </div>

          {/* Hero Image/Mockup */}
          <div className="flex-1 w-full max-w-lg lg:max-w-none">
            <div className="relative">
              {/* Main Card */}
              <div className="bg-white rounded-2xl shadow-2xl p-6 border border-gray-100">
                {/* Preview da interface */}
                <div className="bg-gradient-to-br from-[#F7F9FB] to-[#EFF6F9] rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-3 h-3 bg-red-400 rounded-full" />
                    <div className="w-3 h-3 bg-yellow-400 rounded-full" />
                    <div className="w-3 h-3 bg-green-400 rounded-full" />
                  </div>
                  
                  {/* Upload Area */}
                  <div className="border-2 border-dashed border-[#0B5E73]/30 rounded-xl p-6 text-center bg-white/50">
                    <div className="w-12 h-12 bg-[#0B5E73]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-[#0B5E73]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600 font-medium">Arraste arquivos ou clique para enviar</p>
                    <p className="text-xs text-gray-400 mt-1">Suporta: PDF, DOC, MPP, JPG, MP4...</p>
                  </div>
                </div>

                {/* Mini Converters Preview */}
                <div className="grid grid-cols-4 gap-2">
                  {['PDF', 'DOC', 'IMG', 'VID'].map((type, i) => (
                    <div key={type} className="bg-gray-50 rounded-lg p-2 text-center">
                      <div className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center mb-1 ${
                        i === 0 ? 'bg-red-100 text-red-600' :
                        i === 1 ? 'bg-blue-100 text-blue-600' :
                        i === 2 ? 'bg-green-100 text-green-600' :
                        'bg-purple-100 text-purple-600'
                      }`}>
                        <span className="text-xs font-bold">{type}</span>
                      </div>
                      <span className="text-[10px] text-gray-500">{
                        i === 0 ? 'Documentos' :
                        i === 1 ? 'Office' :
                        i === 2 ? 'Imagens' :
                        'Vídeos'
                      }</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 bg-[#16A34A] text-white px-3 py-1.5 rounded-full text-sm font-semibold shadow-lg">
                ✓ Seguro
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white px-4 py-2 rounded-xl shadow-lg border border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-[#0B5E73]/10 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#0B5E73]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-gray-700">AES-256</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
