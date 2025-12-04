import { NextRequest } from 'next/server';
import { getAuthUserId, addCredits, apiSuccess, apiError } from '@/lib/credits';

/**
 * Demo endpoint to add credits without payment
 * Only available when STRIPE_SECRET_KEY is not configured
 */
export async function POST(request: NextRequest) {
  // Block in production if Stripe is configured
  if (process.env.STRIPE_SECRET_KEY) {
    return apiError('Este endpoint só está disponível em modo demo', 'NOT_AVAILABLE', 403);
  }

  try {
    const userId = await getAuthUserId(request);
    
    if (!userId) {
      return apiError('Não autorizado', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const { amount } = body;

    // Validate amount
    const creditsToAdd = Number(amount);
    if (isNaN(creditsToAdd) || creditsToAdd < 1 || creditsToAdd > 1000) {
      return apiError('Quantidade inválida (1-1000 créditos)', 'INVALID_AMOUNT', 400);
    }

    // Add credits (addCredits signature: userId, amount, type, description, metadata)
    const result = await addCredits(
      userId,
      creditsToAdd,
      'BONUS',
      'Créditos de demonstração',
      { demo: true }
    );

    if (!result.success) {
      return apiError('Erro ao adicionar créditos', 'ADD_FAILED', 500);
    }

    return apiSuccess({
      added: creditsToAdd,
      newBalance: result.newBalance,
      message: `${creditsToAdd} créditos adicionados com sucesso!`,
    });
  } catch (error) {
    console.error('Error adding demo credits:', error);
    return apiError('Erro interno do servidor', 'INTERNAL_ERROR', 500);
  }
}
