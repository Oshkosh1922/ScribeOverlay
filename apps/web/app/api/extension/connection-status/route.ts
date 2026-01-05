import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

// Check if a user has an active pairing (i.e., extension is connected)
// The extension stores the token in chrome.storage.sync after successful pairing
// This endpoint lets the /connect page know when to show "Connected" state

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { connected: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Check if there's a pending (unexpired) pairing code
    // If there's no pending code, it means it was consumed (extension paired)
    const pendingCode = await prisma.pairingCode.findFirst({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
    });

    // If no pending code exists, user either:
    // 1. Never generated one (not paired)
    // 2. The code was consumed by extension (paired!)
    // 
    // We can't definitively know from server side if extension is paired
    // because the token is stored in chrome.storage.sync
    // 
    // Best approach: check if there are any recent explanations from this user
    // which would indicate the extension is working
    
    const recentExplanation = await prisma.explanation.findFirst({
      where: {
        userId,
        createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24h
      },
      orderBy: { createdAt: "desc" }
    });

    // Simple heuristic:
    // - If no pending code AND we had a code before (indicated by having generated one recently), likely paired
    // - The client-side can also track this by storing when they generated a code
    
    return NextResponse.json({
      connected: !pendingCode && recentExplanation !== null,
      hasPendingCode: !!pendingCode,
      pendingCodeExpiresAt: pendingCode?.expiresAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("[connection-status] Error:", error);
    return NextResponse.json(
      { connected: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
