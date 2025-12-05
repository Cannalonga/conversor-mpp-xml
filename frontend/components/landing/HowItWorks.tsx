const steps = [
  {
    number: '01',
    title: 'Envie seu arquivo',
    description: 'Arraste ou clique para fazer upload. Suportamos mais de 30 formatos diferentes.',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Escolha a conversão',
    description: 'Selecione o formato de saída desejado e ajuste as configurações se necessário.',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Baixe o resultado',
    description: 'Seu arquivo convertido estará pronto em segundos. Download direto e seguro.',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <span className="inline-block px-4 py-1.5 bg-[#16A34A]/10 text-[#16A34A] text-sm font-semibold rounded-full mb-4">
            Simples e rápido
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-[#0F1724] mb-4">
            Como funciona
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Em apenas 3 passos simples, você converte qualquer arquivo.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 md:gap-12 relative">
          {/* Connection Line (desktop) */}
          <div className="hidden md:block absolute top-16 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-[#0B5E73]/20 via-[#0B5E73] to-[#0B5E73]/20" />

          {steps.map((step, index) => (
            <div key={index} className="relative text-center">
              {/* Step Number Circle */}
              <div className="relative inline-flex items-center justify-center w-32 h-32 mb-6">
                {/* Background circle */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#0B5E73]/10 to-[#0AC9D2]/10 rounded-full" />
                
                {/* Icon circle */}
                <div className="relative w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center text-[#0B5E73]">
                  {step.icon}
                </div>

                {/* Number badge */}
                <div className="absolute -top-2 -right-2 w-10 h-10 bg-[#FF7A59] text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
                  {step.number}
                </div>
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-[#0F1724] mb-3">
                {step.title}
              </h3>
              <p className="text-gray-600 max-w-xs mx-auto">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
