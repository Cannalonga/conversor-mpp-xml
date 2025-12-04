import { NextRequest } from 'next/server';
import { getAuthUserId, getUserCredits, apiSuccess, apiError } from '@/lib/credits';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId(request);
    
    if (!userId) {
      return apiError('Não autorizado', 'UNAUTHORIZED', 401);
    }

    const credits = await getUserCredits(userId);

    return apiSuccess({
      balance: credits.balance,
      updatedAt: credits.updatedAt,
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    return apiError('Erro interno do servidor', 'INTERNAL_ERROR', 500);
  }
}
