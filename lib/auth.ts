import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Single-tenant MVP: one planner (you) signs in with Google and grants
// read-only Gmail access. The access token is kept in the encrypted
// session JWT — there is no database yet. Multi-planner support (isolated
// accounts, refresh-token storage in Supabase, etc.) is the next milestone,
// not this one.
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
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose the Gmail access token to the client so the dashboard
      // can call our own /api/emails route (which calls Gmail on the
      // server side — the token never needs to touch Gmail directly
      // from the browser).
      (session as any).accessToken = token.accessToken;
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};
