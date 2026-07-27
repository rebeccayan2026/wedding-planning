import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    /** Set when the Google token could not be refreshed — the client should
     * prompt the planner to sign in again. */
    error?: "RefreshFailed" | "NoRefreshToken";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    /** Unix seconds, as returned by Google's `expires_at`. */
    expiresAt?: number;
    error?: "RefreshFailed" | "NoRefreshToken";
  }
}
