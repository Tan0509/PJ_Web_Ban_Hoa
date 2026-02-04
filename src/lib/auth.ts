// ❌ DO NOT USE FOR NEW CODE
// Auth is handled by NextAuth session
// This file is kept for backward compatibility only
// Use getNextAuthSession() from @/lib/authHelpers instead

import { cookies } from 'next/headers';

/**
 * @deprecated Use NextAuth session instead
 * This function reads cookies directly, which is deprecated
 * Use getRoleFromSession() from @/lib/authHelpers for NextAuth-based auth
 */
export async function getRoleFromCookies() {
  // AUTH REFACTOR: Cookie-based auth is deprecated
  // This function is kept for backward compatibility only
  // In production, this should return 'guest' as cookies are no longer set
  const store = await cookies();
  const role = store.get('role')?.value || store.get('role_client')?.value || 'guest';
  return role;
}

/**
 * @deprecated Use NextAuth session instead
 * This function reads cookies directly, which is deprecated
 * Use getNextAuthSession() from @/lib/authHelpers for NextAuth-based auth
 */
export async function getUserFromCookies() {
  // AUTH REFACTOR: Cookie-based auth is deprecated
  // This function is kept for backward compatibility only
  // In production, this should return guest data as cookies are no longer set
  const store = await cookies();
  return {
    role: store.get('role')?.value || store.get('role_client')?.value || 'guest',
    userId: store.get('userId')?.value,
    username: store.get('username')?.value || store.get('username_client')?.value,
  };
}
