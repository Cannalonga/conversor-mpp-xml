import { useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';

/**
 * Hook to validate user session and automatically logout if invalid
 * Handles cases where JWT contains deleted user ID
 */
export function useSessionValidator() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      // Validate session by checking if user credits can be fetched
      validateUserSession(session.user.id).catch((error) => {
        console.error('Session validation failed:', error);
        // Force logout if session is invalid
        signOut({ redirect: true, callbackUrl: '/login' });
      });
    }
  }, [session, status]);

  return { session, status };
}

/**
 * Validate if user session is still valid by checking user existence
 */
async function validateUserSession(userId: string): Promise<void> {
  try {
    const response = await fetch('/api/credits/balance', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      const data = await response.json();
      if (data.error === 'INVALID_SESSION') {
        // User doesn't exist anymore, force logout
        throw new Error('User session is invalid');
      }
    }

    if (!response.ok) {
      throw new Error(`Session validation failed: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error validating session:', error);
    throw error;
  }
}
