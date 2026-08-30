/**
 * Auth identity types.
 *
 * The session itself lives in an httpOnly cookie set by the BFF route
 * handlers (`app/api/auth/*`). The token is never exposed to the browser,
 * so there is no token storage here — only the fetched user identity.
 */

export type User = {
  id: number;
  email: string;
  username: string;
};