import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "../../../lib/prisma";
import { authOptions } from "../../../lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const usage = await prisma.usageEvent.aggregate({
    _sum: { tokensIn: true, tokensOut: true },
    where: { userId: session.user.id }
  });
  return NextResponse.json({
    tokensIn: usage._sum.tokensIn ?? 0,
    tokensOut: usage._sum.tokensOut ?? 0
  });
}
