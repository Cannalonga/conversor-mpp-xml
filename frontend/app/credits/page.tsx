'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { LogoutButton } from '@/components/LogoutButton';

interface CreditPackage {
  id: string;
  credits: number;
  price: number;
  priceFormatted: string;
  popular: boolean;
  description: string;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  createdAt: string;
}

function CreditsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [balance, setBalance] = useState<number>(0);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [stripeConfigured, setStripeConfigured] = useState(true);
  const [demoCredits, setDemoCredits] = useState(50);
  const [addingDemo, setAddingDemo] = useState(false);

  // Check URL params for success/cancel messages
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    const credits = searchParams.get('credits');

    if (success === 'true' && credits) {
      setToast({ message: `🎉 ${credits} créditos adicionados com sucesso!`, type: 'success' });
      // Refresh balance
      fetchBalance();
      fetchTransactions();
      // Clean URL
      router.replace('/credits');
    } else if (canceled === 'true') {
      setToast({ message: 'Compra cancelada', type: 'error' });
      router.replace('/credits');
    }
  }, [searchParams, router]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/credits');
    }
  }, [status, router]);

  const fetchBalance = async () => {
    try {
      const res = await fetch('/api/credits/balance');
      const data = await res.json();
      if (data.success) {
        setBalance(data.balance);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const fetchPackages = async () => {
    try {
      const res = await fetch('/api/credits/buy');
      const data = await res.json();
      if (data.success) {
        setPackages(data.packages);
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/credits/transactions?limit=20');
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      Promise.all([fetchBalance(), fetchPackages(), fetchTransactions()])
        .finally(() => setLoading(false));
    }
  }, [status]);

  const handleBuyCredits = async (packageId: string) => {
    setBuying(packageId);
    try {
      const res = await fetch('/api/credits/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      });
      
      const data = await res.json();
      
      if (data.success && data.url) {
        window.location.href = data.url;
      } else if (data.error === 'STRIPE_NOT_CONFIGURED') {
        setStripeConfigured(false);
        setToast({ message: 'Stripe não configurado - use o modo demo', type: 'error' });
      } else {
        setToast({ message: data.message || 'Erro ao processar compra', type: 'error' });
      }
    } catch (_error) {
      setToast({ message: 'Erro ao conectar com o servidor', type: 'error' });
    } finally {
      setBuying(null);
    }
  };

  const handleAddDemoCredits = async () => {
    setAddingDemo(true);
    try {
      const res = await fetch('/api/credits/add-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: demoCredits }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setBalance(data.newBalance);
        setToast({ message: data.message, type: 'success' });
        fetchTransactions();
      } else {
        setToast({ message: data.message || 'Erro ao adicionar créditos', type: 'error' });
      }
    } catch (_error) {
      setToast({ message: 'Erro ao conectar com o servidor', type: 'error' });
    } finally {
      setAddingDemo(false);
    }
  };

  const getTransactionIcon = (type: string, amount: number) => {
    if (type === 'PURCHASE' || type === 'BONUS' || amount > 0) {
      return (
        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
      );
    }
    return (
      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      </div>
    );
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">CannaConvert</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
              ← Dashboard
            </Link>
            <span className="text-sm text-gray-600">
              {session?.user?.name || session?.user?.email}
            </span>
            <LogoutButton variant="icon" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Balance Card */}
        <Card className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Seu Saldo</p>
              <p className="text-4xl font-bold text-gray-900">
                {balance} <span className="text-lg font-normal text-gray-500">créditos</span>
              </p>
            </div>
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>

        {/* Credit Packages */}
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Comprar Créditos</h2>
        
        {/* Demo Mode Banner */}
        {!stripeConfigured && (
          <Card className="mb-6 bg-yellow-50 border-yellow-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-800">Modo Demonstração</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  O sistema de pagamento Stripe não está configurado. Use o modo demo para testar o sistema de créditos.
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={demoCredits}
                    onChange={(e) => setDemoCredits(Math.min(1000, Math.max(1, Number(e.target.value))))}
                    className="w-24 px-3 py-2 border border-yellow-300 rounded-lg text-center"
                  />
                  <span className="text-sm text-yellow-700">créditos</span>
                  <Button
                    onClick={handleAddDemoCredits}
                    loading={addingDemo}
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    Adicionar Grátis
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {packages.map((pkg) => (
            <Card 
              key={pkg.id} 
              className={`relative ${pkg.popular ? 'border-2 border-primary-500' : ''}`}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs px-3 py-1 rounded-full">
                  Mais Popular
                </div>
              )}
              <div className="text-center pt-4">
                <p className="text-3xl font-bold text-gray-900">{pkg.credits}</p>
                <p className="text-gray-500 mb-2">créditos</p>
                <p className="text-2xl font-semibold text-primary-600 mb-2">{pkg.priceFormatted}</p>
                <p className="text-sm text-gray-400 mb-4">{pkg.description}</p>
                <Button
                  onClick={() => handleBuyCredits(pkg.id)}
                  loading={buying === pkg.id}
                  className="w-full"
                  variant={pkg.popular ? 'primary' : 'secondary'}
                >
                  Comprar
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Transaction History */}
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Histórico de Transações</h2>
        <Card padding="none">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhuma transação ainda
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-4 p-4">
                  {getTransactionIcon(tx.type, tx.amount)}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{tx.description}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(tx.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <p className={`font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Cost Table */}
        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Tabela de Custos</h2>
        <Card padding="none">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
            {[
              { name: 'PNG → JPG', cost: 1 },
              { name: 'JPG → WebP', cost: 1 },
              { name: 'Imagem → PDF', cost: 2 },
              { name: 'PDF → Imagem', cost: 2 },
              { name: 'DOCX → PDF', cost: 3 },
              { name: 'Comprimir PDF', cost: 3 },
              { name: 'MPP → XML', cost: 4 },
              { name: 'Vídeo → MP4', cost: 5 },
            ].map((item) => (
              <div key={item.name} className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">{item.name}</p>
                <p className="font-semibold text-gray-900">{item.cost} créditos</p>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}

export default function CreditsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full"></div>
      </div>
    }>
      <CreditsContent />
    </Suspense>
  );
}
