import crypto from "crypto";

const secret = process.env.NEXTAUTH_SECRET || "dev-secret";

type Payload = { userId: string; workspaceId?: string; exp: number };

export function signExtensionToken(payload: Payload): string {
  const base = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(base).digest("base64url");
  return `${base}.${sig}`;
}

export function verifyExtensionToken(token?: string): Payload | null {
  if (!token) return null;
  const [base, sig] = token.split(".");
  if (!base || !sig) return null;
  const expected = crypto.createHmac("sha256", secret).update(base).digest("base64url");
  if (expected !== sig) return null;
  const payload = JSON.parse(Buffer.from(base, "base64url").toString()) as Payload;
  if (payload.exp * 1000 < Date.now()) return null;
  return payload;
}
