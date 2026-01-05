import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import OpenAI from "openai";
import { verifyExtensionToken } from "../../../lib/tokens";
import { FollowUpRequestSchema } from "@scribeoverlay/shared";
import { authOptions } from "../../../lib/auth";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const ext = verifyExtensionToken(req.headers.get("x-extension-token") || undefined);
  if (!session && !ext) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = FollowUpRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const payload = parsed.data;
  const prompt = `User follow-up question about previously explained text. Answer concisely in bullets. Keep style consistent with prior answer JSON.`;
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [
      { role: "system", content: prompt },
      {
        role: "user",
        content: `Prior answer: ${JSON.stringify(payload.priorAnswerJson)}\nOriginal text: ${payload.originalText}\nQuestion: ${payload.question}`
      }
    ]
  });
  const text = completion.choices[0]?.message?.content ?? "";
  return NextResponse.json({ text });
}
