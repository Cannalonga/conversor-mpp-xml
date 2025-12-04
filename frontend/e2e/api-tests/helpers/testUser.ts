/**
 * Helper to create and authenticate test users
 */

interface TestUser {
  id: string;
  email: string;
  password: string;
  name?: string;
  token?: string;
  sessionCookie?: string;
}

interface CreateUserResult {
  success: boolean;
  user?: TestUser;
  error?: string;
}

/**
 * Create a test user via the API
 */
export async function createTestUser(
  frontendUrl: string,
  options: { email?: string; password?: string; name?: string } = {}
): Promise<CreateUserResult> {
  const timestamp = Date.now();
  const email = options.email || `testuser+${timestamp}@api-test.local`;
  const password = options.password || `TestPass${timestamp}!`;
  const name = options.name || `Test User ${timestamp}`;

  try {
    const response = await fetch(`${frontendUrl}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || `Registration failed: ${response.status}`,
      };
    }

    return {
      success: true,
      user: {
        id: data.user.id,
        email,
        password,
        name,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown registration error',
    };
  }
}

/**
 * Get CSRF token from NextAuth
 */
export async function getCsrfToken(frontendUrl: string): Promise<string | null> {
  try {
    const response = await fetch(`${frontendUrl}/api/auth/csrf`);
    const data = await response.json();
    return data.csrfToken || null;
  } catch {
    return null;
  }
}

/**
 * Login a test user and get session cookie
 */
export async function loginTestUser(
  frontendUrl: string,
  email: string,
  password: string
): Promise<{ success: boolean; cookie?: string; error?: string }> {
  try {
    // Get CSRF token first
    const csrfToken = await getCsrfToken(frontendUrl);
    if (!csrfToken) {
      return { success: false, error: 'Failed to get CSRF token' };
    }

    // Login via credentials
    const response = await fetch(`${frontendUrl}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        csrfToken,
        email,
        password,
        callbackUrl: frontendUrl,
        json: 'true',
      }),
      redirect: 'manual',
    });

    // Extract session cookie from Set-Cookie header
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      // Parse the session cookie
      const sessionMatch = setCookie.match(/next-auth\.session-token=([^;]+)/);
      if (sessionMatch) {
        return {
          success: true,
          cookie: `next-auth.session-token=${sessionMatch[1]}`,
        };
      }
    }

    // Check if login was successful via redirect
    if (response.status === 302 || response.status === 200) {
      return { success: true };
    }

    return {
      success: false,
      error: 'Login failed - no session cookie returned',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown login error',
    };
  }
}

/**
 * Add demo credits to a user
 */
export async function addCreditsToUser(
  frontendUrl: string,
  sessionCookie: string,
  amount: number
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  try {
    const response = await fetch(`${frontendUrl}/api/credits/add-demo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie,
      },
      body: JSON.stringify({ amount }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || `Failed: ${response.status}`,
      };
    }

    return {
      success: true,
      newBalance: data.newBalance,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error adding credits',
    };
  }
}

/**
 * Get user's credit balance
 */
export async function getCreditsBalance(
  frontendUrl: string,
  sessionCookie: string
): Promise<{ success: boolean; balance?: number; error?: string }> {
  try {
    const response = await fetch(`${frontendUrl}/api/credits/balance`, {
      method: 'GET',
      headers: {
        'Cookie': sessionCookie,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || `Failed: ${response.status}`,
      };
    }

    return {
      success: true,
      balance: data.balance || data.credits || 0,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Setup a complete test user with credits
 */
export async function setupTestUserWithCredits(
  frontendUrl: string,
  credits: number = 100
): Promise<{
  success: boolean;
  user?: TestUser;
  sessionCookie?: string;
  balance?: number;
  error?: string;
}> {
  // Create user
  const createResult = await createTestUser(frontendUrl);
  if (!createResult.success || !createResult.user) {
    return { success: false, error: createResult.error };
  }

  // Login
  const loginResult = await loginTestUser(
    frontendUrl,
    createResult.user.email,
    createResult.user.password
  );
  if (!loginResult.success || !loginResult.cookie) {
    return { success: false, error: loginResult.error || 'Login failed' };
  }

  // Add credits
  const creditsResult = await addCreditsToUser(frontendUrl, loginResult.cookie, credits);
  if (!creditsResult.success) {
    return { success: false, error: creditsResult.error };
  }

  return {
    success: true,
    user: createResult.user,
    sessionCookie: loginResult.cookie,
    balance: creditsResult.newBalance,
  };
}
