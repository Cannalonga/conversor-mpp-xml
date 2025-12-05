import Link from 'next/link';

const plans = [
  {
    id: 'basic',
    name: 'Basic',
    price: 9.90,
    credits: 50,
    pricePerCredit: '0,198',
    popular: false,
    features: [
      '50 créditos para conversões',
      'Todos os 19 conversores',
      'Suporte por email',
      'Validade: 6 meses',
    ],
    color: 'border-gray-200',
    buttonStyle: 'bg-white border-2 border-[#0B5E73] text-[#0B5E73] hover:bg-[#0B5E73] hover:text-white',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29.90,
    credits: 200,
    pricePerCredit: '0,149',
    popular: true,
    features: [
      '200 créditos para conversões',
      'Todos os 19 conversores',
      'Suporte prioritário',
      'Validade: 12 meses',
      '25% de economia',
    ],
    color: 'border-[#FF7A59] ring-2 ring-[#FF7A59]/20',
    buttonStyle: 'bg-[#FF7A59] text-white hover:bg-[#e86a4a]',
  },
  {
    id: 'business',
    name: 'Business',
    price: 59.90,
    credits: 500,
    pricePerCredit: '0,119',
    popular: false,
    features: [
      '500 créditos para conversões',
      'Todos os 19 conversores',
      'Suporte premium 24/7',
      'Validade: 12 meses',
      '40% de economia',
    ],
    color: 'border-gray-200',
    buttonStyle: 'bg-white border-2 border-[#0B5E73] text-[#0B5E73] hover:bg-[#0B5E73] hover:text-white',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199.90,
    credits: 2000,
    pricePerCredit: '0,099',
    popular: false,
    features: [
      '2.000 créditos para conversões',
      'Todos os 19 conversores',
      'Gerente de conta dedicado',
      'Validade: 24 meses',
      '50% de economia',
      'API access',
    ],
    color: 'border-gray-200 bg-gradient-to-br from-white to-gray-50',
    buttonStyle: 'bg-[#0B5E73] text-white hover:bg-[#094a5c]',
  },
];

export default function Pricing() {
  return (
    <section id="precos" className="py-16 md:py-24 bg-[#F7F9FB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 bg-[#FF7A59]/10 text-[#FF7A59] text-sm font-semibold rounded-full mb-4">
            Planos e Preços
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-[#0F1724] mb-4">
            Compre créditos e converta sem limites
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Pague apenas pelo que usar. Sem assinaturas, sem surpresas.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div 
              key={plan.id}
              className={`relative bg-white rounded-2xl p-6 border-2 ${plan.color} transition-all hover:shadow-xl`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#FF7A59] text-white text-sm font-semibold rounded-full shadow-lg">
                  Mais popular
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-6 pt-2">
                <h3 className="text-xl font-bold text-[#0F1724] mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-2xl font-medium text-gray-500">R$</span>
                  <span className="text-5xl font-bold text-[#0F1724]">{plan.price.toFixed(2).split('.')[0]}</span>
                  <span className="text-2xl font-medium text-gray-500">,{plan.price.toFixed(2).split('.')[1]}</span>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  <span className="font-semibold text-[#0B5E73]">{plan.credits}</span> créditos
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  R$ {plan.pricePerCredit}/crédito
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                    <svg className="w-5 h-5 text-[#16A34A] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link 
                href={`/premium?plan=${plan.id}`}
                className={`block w-full py-3 px-4 rounded-xl font-semibold text-center transition-all ${plan.buttonStyle}`}
              >
                Comprar {plan.name}
              </Link>
            </div>
          ))}
        </div>

        {/* Trust Elements */}
        <div className="mt-12 text-center">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#16A34A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Pagamento seguro via PIX</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#0B5E73]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Sem assinatura</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#FF7A59]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>Garantia de satisfação</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
