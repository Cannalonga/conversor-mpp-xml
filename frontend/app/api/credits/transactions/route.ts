import { NextRequest } from 'next/server';
import { getAuthUserId, getTransactionHistory, apiSuccess, apiError } from '@/lib/credits';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId(request);
    
    if (!userId) {
      return apiError('Não autorizado', 'UNAUTHORIZED', 401);
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const transactions = await getTransactionHistory(userId, limit, offset);

    return apiSuccess({
      transactions: transactions.map(t => ({
        id: t.id,
        amount: t.amount,
        type: t.type,
        description: t.description,
        createdAt: t.createdAt,
        metadata: t.metadata ? JSON.parse(t.metadata) : null,
      })),
      pagination: {
        limit,
        offset,
        hasMore: transactions.length === limit,
      },
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return apiError('Erro interno do servidor', 'INTERNAL_ERROR', 500);
  }
}
