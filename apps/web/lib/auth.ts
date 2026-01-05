import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import argon2 from "argon2";
import { randomUUID } from "crypto";

async function ensureDefaultWorkspace(userId: string) {
  const existingMembership = await prisma.membership.findFirst({ where: { userId } });
  if (existingMembership) return existingMembership.workspaceId;
  const workspace = await prisma.workspace.create({ data: { name: "Personal Workspace" } });
  await prisma.membership.create({
    data: { userId, workspaceId: workspace.id, role: "owner" }
  });
  await prisma.user.update({ where: { id: userId }, data: { defaultWorkspaceId: workspace.id } });
  return workspace.id;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt" },
  pages: { signIn: "/auth/signin" },
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user?.hashedPassword) {
          throw new Error("Invalid credentials");
        }

        const valid = await argon2.verify(user.hashedPassword, credentials.password);
        if (!valid) {
          throw new Error("Invalid credentials");
        }

        await ensureDefaultWorkspace(user.id);
        return user;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string | undefined;
        session.user.email = token.email as string | null;
        session.user.name = (token.name as string | null) ?? session.user.name;
      }
      return session;
    },
    async signIn({ user }) {
      await ensureDefaultWorkspace((user as any).id as string);
      return true;
    }
  },
  secret: process.env.NEXTAUTH_SECRET || randomUUID()
};

export const getServerAuthSession = () => getServerSession(authOptions);

export const { handlers: { GET, POST } = {} as any } = NextAuth(authOptions);
