import { NextRequest } from 'next/server';
import { getAuthUserId, apiSuccess, apiError } from '@/lib/credits';
import stripe from '@/lib/stripe';
import { creditPackages } from '@/lib/converter-costs';

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId(request);
    
    if (!userId) {
      return apiError('Não autorizado', 'UNAUTHORIZED', 401);
    }

    if (!stripe) {
      return apiError('Sistema de pagamento não configurado', 'STRIPE_NOT_CONFIGURED', 503);
    }

    const body = await request.json();
    const { packageId } = body;

    if (!packageId) {
      return apiError('Pacote não especificado', 'MISSING_PACKAGE', 400);
    }

    // Find the package
    const creditPackage = creditPackages.find(p => p.id === packageId);
    
    if (!creditPackage) {
      return apiError('Pacote inválido', 'INVALID_PACKAGE', 400);
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: undefined, // Will be set from session if needed
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: `${creditPackage.credits} Créditos CannaConvert`,
              description: creditPackage.description,
            },
            unit_amount: Math.round(creditPackage.price * 100), // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        packageId: creditPackage.id,
        credits: creditPackage.credits.toString(),
      },
      success_url: `${process.env.NEXTAUTH_URL}/credits?success=true&credits=${creditPackage.credits}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/credits?canceled=true`,
    });

    return apiSuccess({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return apiError('Erro ao criar sessão de pagamento', 'CHECKOUT_ERROR', 500);
  }
}

// GET: List available packages
export async function GET() {
  return apiSuccess({
    packages: creditPackages.map(p => ({
      id: p.id,
      credits: p.credits,
      price: p.price,
      popular: p.popular,
      description: p.description,
      priceFormatted: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(p.price),
    })),
  });
}
