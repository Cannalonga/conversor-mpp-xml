'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout';

interface Plan {
  id: string;
  name: string;
  credits: number;
  price: number;
  pricePerCredit: number;
  description: string;
  features: string[];
  popular?: boolean;
  badge?: string | null;
}

// Planos de créditos
const defaultPlans: Plan[] = [
  {
    id: 'basic',
    name: 'Básico',
    credits: 50,
    price: 9.90,
    pricePerCredit: 0.198,
    description: 'Ideal para uso casual',
    features: [
      '50 créditos',
      'Todos os conversores',
      'Arquivos até 100MB',
      'Suporte por email',
    ],
    popular: false,
    badge: null,
  },
  {
    id: 'pro',
    name: 'Profissional',
    credits: 200,
    price: 29.90,
    pricePerCredit: 0.1495,
    description: 'Melhor custo-benefício',
    features: [
      '200 créditos',
      'Economia de 25%',
      'Arquivos até 500MB',
      'Suporte prioritário',
      'Fila prioritária',
    ],
    popular: true,
    badge: 'Mais Popular',
  },
  {
    id: 'business',
    name: 'Business',
    credits: 500,
    price: 59.90,
    pricePerCredit: 0.1198,
    description: 'Para uso intensivo',
    features: [
      '500 créditos',
      'Economia de 40%',
      'Arquivos até 1GB',
      'Suporte 24/7',
      'Fila prioritária',
      'API Access',
    ],
    popular: false,
    badge: 'Melhor Valor',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    credits: 2000,
    price: 199.90,
    pricePerCredit: 0.09995,
    description: 'Máximo volume',
    features: [
      '2000 créditos',
      'Economia de 50%',
      'Arquivos ilimitados',
      'Suporte dedicado',
      'Prioridade máxima',
      'API Access ilimitado',
    ],
    popular: false,
    badge: 'Enterprise',
  },
];

export default function PremiumPage() {
  const [plans, setPlans] = useState<Plan[]>(defaultPlans);
  const [selectedPlan, setSelectedPlan] = useState<string>('pro');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    cpf: '',
  });

  // Carregar planos da API
  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_PROXY || 'http://localhost:3001';
    fetch(`${backendUrl}/api/credits/plans`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.plans) {
          setPlans(data.plans);
        }
      })
      .catch(_err => console.log('Using default plans'));
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Máscara de CPF
    if (name === 'cpf') {
      const cpf = value.replace(/\D/g, '').slice(0, 11);
      const masked = cpf
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2');
      setFormData(prev => ({ ...prev, cpf: masked }));
      return;
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckout = async (paymentMethod: 'checkout' | 'pix') => {
    setLoading(true);
    setError(null);

    try {
      // Validações
      if (!formData.email || !formData.cpf || !formData.firstName) {
        throw new Error('Preencha todos os campos obrigatórios');
      }

      const cpfDigits = formData.cpf.replace(/\D/g, '');
      if (cpfDigits.length !== 11) {
        throw new Error('CPF inválido');
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_PROXY || 'http://localhost:3001';
      const endpoint = paymentMethod === 'pix' 
        ? `${backendUrl}/api/premium/pix`
        : `${backendUrl}/api/premium/checkout`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: selectedPlan,
          payment: { method: paymentMethod },
          customer: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            cpf: cpfDigits,
          },
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro ao processar pagamento');
      }

      // Se for PIX, redirecionar para página do PIX
      if (paymentMethod === 'pix' && data.pix) {
        const params = new URLSearchParams({
          transactionId: data.transaction.id,
          amount: data.transaction.amount.toString(),
          qrCode: data.pix.qrCode || '',
          qrCodeBase64: data.pix.qrCodeBase64 || '',
        });
        window.location.href = `/premium/pix?${params.toString()}`;
        return;
      }

      // Se for checkout, redirecionar para o Mercado Pago
      if (data.mercadoPago?.checkoutUrl) {
        window.location.href = data.mercadoPago.checkoutUrl;
        return;
      }

      // Fallback para sandbox URL
      if (data.mercadoPago?.sandboxUrl) {
        window.location.href = data.mercadoPago.sandboxUrl;
        return;
      }

      throw new Error('URL de pagamento não disponível');
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedPlanData = plans.find(p => p.id === selectedPlan);

  return (
    <AppLayout showFooter={true}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-[#0F1724] mb-4">
            Comprar <span className="text-[#0B5E73]">Créditos</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Escolha o pacote ideal para suas necessidades. Créditos não expiram!
          </p>
        </div>

        {/* Tabela de custos */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-12 max-w-2xl mx-auto border border-gray-100">
          <h3 className="text-lg font-semibold text-[#0F1724] mb-4 text-center">
            💡 Custo por Conversão
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">MPP ↔ XML</span>
              <span className="text-[#0B5E73] font-medium">2 créditos</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">DOCX → PDF</span>
              <span className="text-[#0B5E73] font-medium">1 crédito</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Imagens</span>
              <span className="text-[#0B5E73] font-medium">1 crédito</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Vídeo</span>
              <span className="text-[#FF7A59] font-medium">3 créditos</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">PDF Compress</span>
              <span className="text-[#0B5E73] font-medium">1 crédito</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Outros</span>
              <span className="text-[#0B5E73] font-medium">1 crédito</span>
            </div>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {plans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative rounded-2xl p-6 cursor-pointer transition-all bg-white shadow-lg hover:shadow-xl ${
                selectedPlan === plan.id
                  ? 'ring-2 ring-[#0B5E73] scale-105'
                  : 'border border-gray-100 hover:border-[#0B5E73]/30'
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                    plan.popular 
                      ? 'bg-[#0B5E73] text-white' 
                      : 'bg-[#FF7A59] text-white'
                  }`}>
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-[#0F1724] mb-1">{plan.name}</h3>
                <p className="text-gray-500 text-sm">{plan.description}</p>
              </div>

              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-bold text-[#0F1724]">R$ {plan.price.toFixed(2).replace('.', ',')}</span>
                </div>
                <p className="text-[#0B5E73] font-semibold text-lg mt-2">
                  {plan.credits} créditos
                </p>
                <p className="text-gray-400 text-xs">
                  R$ {plan.pricePerCredit.toFixed(3).replace('.', ',')} por crédito
                </p>
              </div>

              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* Selection indicator */}
              {selectedPlan === plan.id && (
                <div className="absolute top-4 right-4">
                  <div className="w-6 h-6 bg-[#0B5E73] rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Checkout Form */}
        <div className="max-w-xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-[#0F1724] mb-6 text-center">
              Finalizar Compra
            </h2>

            {/* Selected Plan Summary */}
            {selectedPlanData && (
              <div className="bg-[#F7F9FB] rounded-xl p-4 mb-6 border border-gray-100">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[#0F1724] font-medium">{selectedPlanData.name}</p>
                    <p className="text-[#0B5E73] text-sm">{selectedPlanData.credits} créditos</p>
                  </div>
                  <p className="text-2xl font-bold text-[#0F1724]">
                    R$ {selectedPlanData.price.toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0B5E73] focus:border-transparent"
                    placeholder="João"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sobrenome
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0B5E73] focus:border-transparent"
                    placeholder="Silva"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0B5E73] focus:border-transparent"
                  placeholder="joao@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CPF *
                </label>
                <input
                  type="text"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0B5E73] focus:border-transparent"
                  placeholder="000.000.000-00"
                  required
                />
              </div>

              {/* Payment Buttons */}
              <div className="space-y-3 pt-4">
                <button
                  type="button"
                  onClick={() => handleCheckout('pix')}
                  disabled={loading}
                  className="w-full bg-[#0B5E73] hover:bg-[#094a5c] text-white font-bold py-4 px-6 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M13.43 14.59L10.5 17.52c-.39.39-1.02.39-1.41 0L6.17 14.6a.996.996 0 010-1.41L9.1 10.27c.39-.39 1.02-.39 1.41 0l2.92 2.91c.39.39.39 1.02 0 1.41z"/>
                        <path d="M17.83 10.27L14.9 7.34c-.39-.39-1.02-.39-1.41 0l-2.93 2.93c-.39.39-.39 1.02 0 1.41l2.93 2.92c.39.39 1.02.39 1.41 0l2.93-2.92c.38-.39.38-1.02 0-1.41z"/>
                      </svg>
                      Pagar com PIX
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleCheckout('checkout')}
                  disabled={loading}
                  className="w-full bg-white border-2 border-gray-200 hover:border-[#0B5E73] text-gray-700 font-bold py-4 px-6 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Pagar com Cartão
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Security Badge */}
            <div className="mt-6 flex items-center justify-center gap-2 text-gray-500 text-sm">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Pagamento seguro via Mercado Pago
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-[#0F1724] text-center mb-8">
            Perguntas Frequentes
          </h2>
          
          <div className="space-y-4">
            <details className="bg-white rounded-xl p-4 shadow-md border border-gray-100 group">
              <summary className="text-[#0F1724] font-medium cursor-pointer flex items-center justify-between">
                Os créditos expiram?
                <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="text-gray-600 mt-3 pt-3 border-t border-gray-100">
                Não! Seus créditos nunca expiram. Use quando precisar.
              </p>
            </details>
            
            <details className="bg-white rounded-xl p-4 shadow-md border border-gray-100 group">
              <summary className="text-[#0F1724] font-medium cursor-pointer flex items-center justify-between">
                Posso comprar mais créditos depois?
                <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="text-gray-600 mt-3 pt-3 border-t border-gray-100">
                Sim! Você pode comprar pacotes de créditos a qualquer momento. Os créditos são acumulativos.
              </p>
            </details>
            
            <details className="bg-white rounded-xl p-4 shadow-md border border-gray-100 group">
              <summary className="text-[#0F1724] font-medium cursor-pointer flex items-center justify-between">
                Quanto custa cada conversão?
                <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="text-gray-600 mt-3 pt-3 border-t border-gray-100">
                A maioria das conversões custa 1 crédito. Conversões de arquivos MPP custam 2 créditos, e conversões de vídeo custam 3 créditos.
              </p>
            </details>
            
            <details className="bg-white rounded-xl p-4 shadow-md border border-gray-100 group">
              <summary className="text-[#0F1724] font-medium cursor-pointer flex items-center justify-between">
                Como funciona o reembolso?
                <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="text-gray-600 mt-3 pt-3 border-t border-gray-100">
                Se uma conversão falhar por erro nosso, seus créditos são automaticamente reembolsados.
              </p>
            </details>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
