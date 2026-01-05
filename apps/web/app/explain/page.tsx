"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function ExplainContent() {
  const searchParams = useSearchParams();
  const [text, setText] = useState("");
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const sharedText = searchParams.get("text") || searchParams.get("title") || "";
    if (sharedText) setText(sharedText);
  }, [searchParams]);

  async function handleExplain() {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    setResponse(null);

    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, mode: "executive", contextLevel: "expanded" }),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to analyze");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let jsonStr = "";
      let finalJson: any = null;

      if (reader) {
        let buffer = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              const payload = trimmed.slice(6);
              if (payload.startsWith("{") && payload.includes('"json"') && payload.includes('"textHash"')) {
                try {
                  const donePayload = JSON.parse(payload);
                  if (donePayload.json) finalJson = donePayload.json;
                } catch {}
              } else {
                jsonStr += payload;
              }
            }
          }
        }
      }

      if (finalJson) {
        setResponse(finalJson);
      } else if (jsonStr) {
        const start = jsonStr.indexOf("{");
        const end = jsonStr.lastIndexOf("}");
        if (start >= 0 && end > start) {
          try {
            setResponse(JSON.parse(jsonStr.slice(start, end + 1)));
          } catch {
            setResponse({ raw: jsonStr });
          }
        }
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handlePaste() {
    try {
      const clipboardText = await navigator.clipboard.readText();
      setText(clipboardText);
    } catch {}
  }

  return (
    <main className="min-h-screen bg-[#0a0a12]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center text-white font-bold">
            S
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">ScribeOverlay</h1>
            <p className="text-sm text-white/40">Understand any text</p>
          </div>
        </div>

        {/* Input */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 mb-6">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste or type text to analyze..."
            className="w-full h-36 bg-transparent text-white placeholder-white/30 resize-none focus:outline-none text-[16px]"
          />
          <div className="flex gap-3 mt-3 pt-3 border-t border-white/5">
            <button
              onClick={handlePaste}
              className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm font-medium"
            >
              Paste
            </button>
            <button
              onClick={handleExplain}
              disabled={!text.trim() || loading}
              className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold disabled:opacity-50 transition-all text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Analyze"
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Results */}
        {response && <ResponseDisplay data={response} />}

        {/* Empty state */}
        {!response && !loading && (
          <div className="text-center py-16">
            <p className="text-white/30 text-sm">Paste text above to get a clear explanation</p>
          </div>
        )}
      </div>
    </main>
  );
}

function ResponseDisplay({ data }: { data: any }) {
  if (data.raw) {
    return (
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
        <p className="text-white/70 text-sm whitespace-pre-wrap">{data.raw}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      {data.summary && (
        <Section label="What This Says">
          <p className="text-white/90 text-[15px] leading-relaxed">{data.summary}</p>
        </Section>
      )}

      {/* Key Points */}
      {data.keyPoints?.length > 0 && (
        <Section label="Key Takeaways">
          <ul className="space-y-3">
            {data.keyPoints.map((point: string, i: number) => (
              <li key={i} className="text-white/70 text-sm pl-4 border-l-2 border-purple-500/30">
                {point}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Context */}
      {data.context && (
        <Section label="Background Context">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <p className="text-blue-200 text-sm">{data.context}</p>
          </div>
        </Section>
      )}

      {/* Implications */}
      {data.implications && (
        <Section label="What This Means">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
            <p className="text-emerald-200 text-sm">{data.implications}</p>
          </div>
        </Section>
      )}

      {/* Critical Analysis */}
      {data.criticalAnalysis && (
        <Section label="Critical Take">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <p className="text-amber-200 text-sm">{data.criticalAnalysis}</p>
          </div>
        </Section>
      )}

      {/* Bottom Line */}
      {data.bottomLine && (
        <Section label="Bottom Line">
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
            <p className="text-purple-200 font-medium">{data.bottomLine}</p>
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
      <p className="text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-3">{label}</p>
      {children}
    </div>
  );
}

export default function ExplainPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    }>
      <ExplainContent />
    </Suspense>
  );
}
