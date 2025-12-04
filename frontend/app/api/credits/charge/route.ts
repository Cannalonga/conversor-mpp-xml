import { NextRequest } from 'next/server';
import { getAuthUserId, deductCredits, getUserCredits, apiSuccess, apiError } from '@/lib/credits';
import { getConverterCost, converterCosts } from '@/lib/converter-costs';

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId(request);
    
    if (!userId) {
      return apiError('Não autorizado', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const { converterId } = body;

    if (!converterId) {
      return apiError('Conversor não especificado', 'MISSING_CONVERTER', 400);
    }

    // Get converter cost
    const cost = getConverterCost(converterId);
    const converterConfig = converterCosts[converterId];

    if (!converterConfig) {
      return apiError('Conversor inválido', 'INVALID_CONVERTER', 400);
    }

    // Check current balance
    const currentCredits = await getUserCredits(userId);
    
    if (currentCredits.balance < cost) {
      return apiError(
        `Saldo insuficiente. Você tem ${currentCredits.balance} créditos, mas precisa de ${cost}.`,
        'INSUFFICIENT_CREDITS',
        402
      );
    }

    // Deduct credits
    const result = await deductCredits(
      userId,
      cost,
      `Conversão: ${converterConfig.name}`,
      { converterId, converterName: converterConfig.name }
    );

    if (!result.success) {
      return apiError(
        'Não foi possível processar a cobrança',
        result.error || 'CHARGE_FAILED',
        402
      );
    }

    return apiSuccess({
      charged: cost,
      newBalance: result.newBalance,
      converter: converterConfig.name,
    });
  } catch (error) {
    console.error('Error charging credits:', error);
    return apiError('Erro interno do servidor', 'INTERNAL_ERROR', 500);
  }
}

// GET: Preview charge (check if user can afford conversion)
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId(request);
    
    if (!userId) {
      return apiError('Não autorizado', 'UNAUTHORIZED', 401);
    }

    const { searchParams } = new URL(request.url);
    const converterId = searchParams.get('converterId');

    if (!converterId) {
      return apiError('Conversor não especificado', 'MISSING_CONVERTER', 400);
    }

    const cost = getConverterCost(converterId);
    const credits = await getUserCredits(userId);
    const canAfford = credits.balance >= cost;

    return apiSuccess({
      converterId,
      cost,
      currentBalance: credits.balance,
      canAfford,
      missingCredits: canAfford ? 0 : cost - credits.balance,
    });
  } catch (error) {
    console.error('Error checking charge:', error);
    return apiError('Erro interno do servidor', 'INTERNAL_ERROR', 500);
  }
}
