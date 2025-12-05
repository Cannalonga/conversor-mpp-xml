const features = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Velocidade',
    description: 'Conversões em segundos, não minutos. Processamento paralelo e otimizado para máxima performance.',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Segurança Total',
    description: 'Criptografia AES-256 em trânsito e repouso. Arquivos excluídos automaticamente em 24h.',
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
    title: '19 Conversores',
    description: 'Documentos, imagens, vídeos e formatos especiais. De MPP→XML a compressão para WhatsApp.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    title: 'Suporte 24/7',
    description: 'Equipe dedicada para ajudar com suas conversões. Chat, email e documentação completa.',
    color: 'bg-purple-50 text-purple-600',
  },
];

export default function WhyChooseUs() {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <span className="inline-block px-4 py-1.5 bg-[#0B5E73]/10 text-[#0B5E73] text-sm font-semibold rounded-full mb-4">
            Por que escolher
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-[#0F1724] mb-4">
            A melhor ferramenta de conversão
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Tecnologia de ponta, segurança enterprise e facilidade de uso em uma única plataforma.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group relative bg-white rounded-2xl p-6 border border-gray-100 hover:border-[#0B5E73]/30 hover:shadow-xl transition-all duration-300"
            >
              {/* Icon */}
              <div className={`w-14 h-14 ${feature.color} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                {feature.icon}
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-[#0F1724] mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>

              {/* Hover indicator */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0B5E73] to-[#0AC9D2] rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
