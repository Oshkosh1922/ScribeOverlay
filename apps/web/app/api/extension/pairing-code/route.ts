import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized", message: "You must be logged in to generate a pairing code" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get user's workspace
    const membership = await prisma.membership.findFirst({
      where: { userId },
      select: { workspaceId: true },
    });

    // Check for existing unexpired code
    const existingCode = await prisma.pairingCode.findFirst({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingCode) {
      return NextResponse.json({
        code: existingCode.code,
        expiresAt: existingCode.expiresAt.toISOString(),
      });
    }

    // Delete any expired codes for this user
    await prisma.pairingCode.deleteMany({
      where: {
        userId,
        expiresAt: { lte: new Date() },
      },
    });

    // Generate new code
    let code = generateCode();
    let attempts = 0;

    // Ensure uniqueness
    while (attempts < 10) {
      const existing = await prisma.pairingCode.findUnique({ where: { code } });
      if (!existing) break;
      code = generateCode();
      attempts++;
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.pairingCode.create({
      data: {
        code,
        userId,
        workspaceId: membership?.workspaceId ?? null,
        expiresAt,
      },
    });

    return NextResponse.json({
      code,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("[pairing-code] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: "Failed to generate pairing code" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized", message: "You must be logged in" },
        { status: 401 }
      );
    }

    const existingCode = await prisma.pairingCode.findFirst({
      where: {
        userId: session.user.id,
        expiresAt: { gt: new Date() },
      },
    });

    if (!existingCode) {
      return NextResponse.json({ code: null, expiresAt: null });
    }

    return NextResponse.json({
      code: existingCode.code,
      expiresAt: existingCode.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("[pairing-code] GET Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
