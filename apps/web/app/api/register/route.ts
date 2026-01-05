import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import argon2 from "argon2";

export async function POST(req: Request) {
  const body = await req.json();
  const { email, password } = body as { email?: string; password?: string };
  if (!email || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "User exists" }, { status: 400 });
  const hashed = await argon2.hash(password);
  const user = await prisma.user.create({ data: { email, hashedPassword: hashed } });
  await prisma.workspace.create({
    data: {
      name: "Personal Workspace",
      members: { create: { userId: user.id, role: "owner" } }
    }
  });
  return NextResponse.json({ ok: true });
}
