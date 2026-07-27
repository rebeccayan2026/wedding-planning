import { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

/** Refresh slightly before expiry so a request starting just under the wire
 * doesn't race the clock and fail with a 401. */
const EXPIRY_BUFFER_MS = 60_000;

/**
 * Google access tokens last ~1 hour. Exchange the long-lived refresh token
 * for a fresh one so the planner isn't forced to sign in again mid-session.
 *
 * Note: while the Google OAuth app is in "Testing" publishing status, the
 * refresh token itself expires after 7 days — so re-authentication is still
 * required weekly until the app is verified.
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  if (!token.refreshToken) {
    return { ...token, error: "NoRefreshToken" };
  }

  try {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });

    const refreshed = await res.json();

    if (!res.ok) {
      throw new Error(
        refreshed.error_description ?? refreshed.error ?? `HTTP ${res.status}`
      );
    }

    return {
      ...token,
      accessToken: refreshed.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + refreshed.expires_in,
      // Google only returns a refresh_token when it rotates one; otherwise
      // the existing one stays valid.
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch (err) {
    console.error("Failed to refresh Google access token:", err);
    // Surface the failure rather than returning a stale token, so the UI can
    // ask for a fresh sign-in instead of showing a confusing empty inbox.
    return { ...token, error: "RefreshFailed" };
  }
}

// Single-tenant MVP: one planner signs in with Google and grants read-only
// Gmail access. Tokens live in the encrypted session JWT; planner identity
// and cached analysis live in Supabase.
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/gmail.readonly",
          ].join(" "),
          // Required for Google to issue a refresh token at all.
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // account is only present on the initial sign-in
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
          error: undefined,
        };
      }

      if (
        typeof token.expiresAt === "number" &&
        Date.now() < token.expiresAt * 1000 - EXPIRY_BUFFER_MS
      ) {
        return token;
      }

      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      // The Gmail token is exposed so our own /api/emails route can use it;
      // the browser never calls Gmail directly.
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};
