import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/lib/db";
import { AUTH_ENABLED } from "@/lib/auth-mode";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: AUTH_ENABLED
    ? [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID ?? "",
          clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        }),
      ]
    : [],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !user.id || !user.email) {
        return false;
      }

      await db.user.upsert({
        where: { id: user.id },
        update: {
          email: user.email,
          name: user.name,
        },
        create: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });

      return true;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};
