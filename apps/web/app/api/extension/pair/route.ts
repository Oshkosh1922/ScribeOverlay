import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { signExtensionToken } from "../../../../lib/tokens";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code } = body as { code?: string };

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Missing code", message: "A pairing code is required" },
        { status: 400 }
      );
    }

    const normalizedCode = code.trim().toUpperCase();

    const record = await prisma.pairingCode.findUnique({
      where: { code: normalizedCode },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (!record) {
      return NextResponse.json(
        { error: "Invalid code", message: "This pairing code does not exist" },
        { status: 400 }
      );
    }

    if (record.expiresAt.getTime() < Date.now()) {
      // Clean up expired code
      await prisma.pairingCode.delete({ where: { code: normalizedCode } });
      return NextResponse.json(
        { error: "Expired", message: "This pairing code has expired. Please generate a new one." },
        { status: 400 }
      );
    }

    // Generate extension token (valid for 12 hours)
    const token = signExtensionToken({
      userId: record.userId,
      workspaceId: record.workspaceId ?? undefined,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12,
    });

    // Delete the pairing code after successful exchange
    await prisma.pairingCode.delete({ where: { code: normalizedCode } });

    return NextResponse.json({
      sessionToken: token,
      user: {
        id: record.user.id,
        email: record.user.email,
        name: record.user.name,
      },
      workspaceId: record.workspaceId,
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error("[pair] Exchange error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: "Failed to exchange pairing code" },
      { status: 500 }
    );
  }
}

// Allow OPTIONS for CORS preflight from extension
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
