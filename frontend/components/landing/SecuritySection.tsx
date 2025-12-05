import Link from 'next/link';

export default function SecuritySection() {
  return (
    <section id="seguranca" className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div>
            <span className="inline-block px-4 py-1.5 bg-[#16A34A]/10 text-[#16A34A] text-sm font-semibold rounded-full mb-4">
              Privacidade & Segurança
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-[#0F1724] mb-6">
              Seus arquivos estão protegidos
            </h2>
            
            <div className="prose prose-lg text-gray-600 mb-8">
              <p>
                Nós valorizamos sua privacidade. <strong>Nenhum arquivo enviado é utilizado para finalidades que não a conversão solicitada.</strong>
              </p>
              <p>
                Arquivos são armazenados temporariamente, encriptados em trânsito e em descanso (<span className="text-[#0B5E73] font-semibold">AES-256</span>). 
                Após conclusão do processo ou decurso do período de retenção (24 horas padrão), 
                todos os arquivos são <strong>removidos permanentemente</strong>.
              </p>
              <p>
                Logs de processamento não contêm conteúdo do arquivo — apenas metadados operacionais.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link 
                href="/privacy" 
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B5E73] text-white font-medium rounded-lg hover:bg-[#094a5c] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Política de Privacidade
              </Link>
              <Link 
                href="/terms" 
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Termos de Uso
              </Link>
            </div>
          </div>

          {/* Security Features Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#F7F9FB] rounded-2xl p-5 border border-gray-100">
              <div className="w-12 h-12 bg-[#0B5E73]/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#0B5E73]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-bold text-[#0F1724] mb-1">Criptografia AES-256</h3>
              <p className="text-sm text-gray-500">Padrão militar de segurança</p>
            </div>

            <div className="bg-[#F7F9FB] rounded-2xl p-5 border border-gray-100">
              <div className="w-12 h-12 bg-[#16A34A]/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#16A34A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-bold text-[#0F1724] mb-1">TLS 1.3</h3>
              <p className="text-sm text-gray-500">Conexão segura HTTPS</p>
            </div>

            <div className="bg-[#F7F9FB] rounded-2xl p-5 border border-gray-100">
              <div className="w-12 h-12 bg-[#FF7A59]/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#FF7A59]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-[#0F1724] mb-1">Auto-exclusão 24h</h3>
              <p className="text-sm text-gray-500">Arquivos removidos após uso</p>
            </div>

            <div className="bg-[#F7F9FB] rounded-2xl p-5 border border-gray-100">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
              <h3 className="font-bold text-[#0F1724] mb-1">LGPD Compliant</h3>
              <p className="text-sm text-gray-500">Conforme lei brasileira</p>
            </div>
          </div>
        </div>

        {/* LGPD Badge */}
        <div className="mt-12 p-6 bg-gradient-to-r from-[#0B5E73]/5 to-[#16A34A]/5 rounded-2xl border border-[#0B5E73]/10">
          <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center flex-shrink-0">
              <svg className="w-10 h-10 text-[#0B5E73]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-[#0F1724] font-medium">
                <strong>Tratamos dados conforme a Lei Geral de Proteção de Dados (LGPD).</strong>
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Em caso de dúvidas sobre privacidade, entre em contato: <a href="mailto:privacy@cannaconvert.com" className="text-[#0B5E73] hover:underline">privacy@cannaconvert.com</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
