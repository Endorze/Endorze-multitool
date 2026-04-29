import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [Google],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;

        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { timeZone: true },
        });

        session.user.timeZone = dbUser?.timeZone ?? null;
      }

      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});