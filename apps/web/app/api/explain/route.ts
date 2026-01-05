import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import OpenAI from "openai";
import { prisma } from "../../../lib/prisma";
import { verifyExtensionToken } from "../../../lib/tokens";
import { ExplainRequestSchema } from "@scribeoverlay/shared";
import { redact, hashText } from "@scribeoverlay/shared";
import { authOptions } from "../../../lib/auth";

const apiKey = process.env.OPENAI_API_KEY;
const tavilyKey = process.env.TAVILY_API_KEY;
const isDemoMode = !apiKey || apiKey === "sk-placeholder" || apiKey.length < 20;
const openai = isDemoMode ? null : new OpenAI({ apiKey });

interface TavilySource {
  title: string;
  url: string;
  content: string;
  score: number;
}

// Search Tavily for relevant sources
async function searchTavily(query: string): Promise<TavilySource[]> {
  if (!tavilyKey) return [];
  
  try {
    // Extract key terms from the text (first 200 chars for search query)
    const searchQuery = query.slice(0, 400).replace(/[^\w\s]/g, ' ').trim();
    
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: tavilyKey,
        query: searchQuery,
        search_depth: 'basic',
        include_answer: false,
        include_raw_content: false,
        max_results: 5
      })
    });
    
    if (!res.ok) {
      console.error('[Tavily] Search failed:', res.status);
      return [];
    }
    
    const data = await res.json();
    return (data.results || []).map((r: any) => ({
      title: r.title || 'Untitled',
      url: r.url,
      content: r.content?.slice(0, 300) || '',
      score: r.score || 0
    }));
  } catch (e) {
    console.error('[Tavily] Error:', e);
    return [];
  }
}

const SYSTEM_PROMPT = `You are an expert analyst who helps people understand complex text. Your job is to thoroughly explain what they're reading in a clear, intelligent way.

Analyze the text and return JSON with these fields:

{
  "summary": "A clear 2-3 sentence explanation of what this text is saying and why it matters. Write like you're explaining to a smart friend.",
  
  "keyPoints": ["Array of 3-5 important takeaways from this text"],
  
  "context": "Background information that helps understand this better. What should someone know to fully grasp this? Historical context, industry knowledge, related events, etc.",
  
  "implications": "What does this mean going forward? What are the consequences or opportunities? Be specific and practical.",
  
  "criticalAnalysis": "Your honest assessment. Is this reliable? What's the angle or bias? What's being left out? What questions should the reader be asking?",
  
  "bottomLine": "One sentence: the single most important thing to take away from this."
}

Guidelines:
- Write in plain English, not corporate speak
- Be direct and insightful, not generic
- If something is questionable, say so clearly
- Focus on what actually matters to the reader
- Don't pad with filler content
- When sources are provided, reference them to support your analysis`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-extension-token, Authorization",
  "Access-Control-Max-Age": "86400",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const extensionToken = req.headers.get("x-extension-token");
  const extPayload = verifyExtensionToken(extensionToken || undefined);
  
  if (!session && !extPayload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }
  
  const userId = session?.user?.id ?? extPayload?.userId;
  const workspaceId = extPayload?.workspaceId;

  const json = await req.json();
  const parsed = ExplainRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.format() }, { status: 400, headers: corsHeaders });
  }
  const body = parsed.data;

  const { redacted } = body.redactionEnabled ? redact(body.text) : { redacted: body.text, replaced: [] };
  const textHash = hashText(body.text);

  // Demo mode
  if (isDemoMode || !openai) {
    const mockJson = {
      summary: "This is a demo explanation. To get real AI-powered analysis, add your OpenAI API key to the .env.local file.",
      keyPoints: ["Demo mode is active", "Add OPENAI_API_KEY to enable real analysis", "The extension is working correctly"],
      context: "ScribeOverlay uses GPT-4 to analyze text and provide clear explanations.",
      implications: "Once configured with an API key, you'll get thorough explanations of any text you select.",
      criticalAnalysis: "This is placeholder content for testing purposes.",
      bottomLine: "Add your OpenAI API key to unlock the full experience.",
      sources: []
    };
    
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(`data: ${JSON.stringify(mockJson)}\n\n`);
        controller.enqueue(`event: done\ndata: ${JSON.stringify({ json: mockJson, textHash })}\n\n`);
        controller.close();
      }
    });
    
    return new NextResponse(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" }
    });
  }

  // Search for relevant sources with Tavily
  const sources = await searchTavily(redacted);
  
  // Build context from sources
  let sourcesContext = "";
  if (sources.length > 0) {
    sourcesContext = "\n\nRelevant sources found:\n" + sources.map((s, i) => 
      `[${i + 1}] ${s.title}\nURL: ${s.url}\nExcerpt: ${s.content}`
    ).join("\n\n");
  }

  const stream = new ReadableStream({
    async start(controller) {
      let collected = "";
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          stream: true,
          temperature: 0.3,
          max_tokens: 2000,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Analyze this text:\n\n${redacted}${sourcesContext}` }
          ]
        });

        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            collected += delta;
            controller.enqueue(`data: ${delta}\n\n`);
          }
        }

        let parsedJson: any = null;
        try {
          const start = collected.indexOf("{");
          const end = collected.lastIndexOf("}");
          if (start >= 0 && end > start) {
            parsedJson = JSON.parse(collected.slice(start, end + 1));
          }
        } catch {}

        // Add sources to the response
        if (parsedJson) {
          parsedJson.sources = sources.map(s => ({ title: s.title, url: s.url }));
        }

        controller.enqueue(`event: done\ndata: ${JSON.stringify({ json: parsedJson, textHash, sources })}\n\n`);
        controller.close();

        // Save to database
        await prisma.explanation.create({
          data: {
            userId: userId!,
            workspaceId,
            mode: body.mode,
            contextLevel: body.contextLevel,
            metadata: body.metadata,
            textHash,
            responseJson: parsedJson ?? collected
          }
        }).catch(console.error);

      } catch (error) {
        console.error("[ScribeOverlay] Error:", error);
        controller.enqueue(`event: error\ndata: ${JSON.stringify({ message: String(error) })}\n\n`);
        controller.close();
      }
    }
  });

  return new NextResponse(stream, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" }
  });
}
