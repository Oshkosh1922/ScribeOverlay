"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

export default function ConnectPage() {
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [connected, setConnected] = useState(false);
  const [autoRedirect, setAutoRedirect] = useState(3);
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);
  const codeGeneratedAtRef = useRef<number | null>(null);
  
  const formatCountdown = useCallback((expiry: Date) => {
    const diff = expiry.getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    pollCountRef.current = 0;
    codeGeneratedAtRef.current = Date.now();
  
    pollIntervalRef.current = setInterval(async () => {
      pollCountRef.current++;
      
      if (pollCountRef.current > 30) {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        return;
      }

      try {
        const res = await fetch("/api/extension/connection-status", {
          credentials: "include",
        });
        
        if (!res.ok) return;
        
        const data = await res.json();
        
        if (!data.hasPendingCode && codeGeneratedAtRef.current) {
          setConnected(true);
          setCode(null);
          setExpiresAt(null);
          
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 2000);
  }, []);

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const remaining = formatCountdown(expiresAt);
      setCountdown(remaining);
      if (remaining === "Expired") {
        setCode(null);
        setExpiresAt(null);
        setError("Code expired. Generate a new one.");
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, formatCountdown]);
  
  useEffect(() => {
    if (!connected) return;
    
    const interval = setInterval(() => {
      setAutoRedirect((prev) => {
        if (prev <= 1) {
          router.push("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [connected, router]);
  
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setCopied(false);
    setConnected(false);

    try {
      const res = await fetch("/api/pair", {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          setError("You must be logged in to generate a pairing code. Please sign in first.");
        } else {
          setError(data.message || data.error || `Request failed with status ${res.status}`);
        }
        setCode(null);
        setExpiresAt(null);
        return;
      }

      const json = await res.json();
      setCode(json.code);
      setExpiresAt(new Date(json.expiresAt));
      setCountdown(formatCountdown(new Date(json.expiresAt)));
      
      startPolling();
    } catch (err) {
      console.error("Generate code error:", err);
      setError("Network error. Please check your connection and try again.");
      setCode(null);
      setExpiresAt(null);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const goToDashboard = () => {
    router.push("/");
  };

  // Connected state
  if (connected) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center animate-fade-in">
        <div className="w-full max-w-md glass rounded-3xl p-8 sm:p-10 text-center">
          {/* Success Animation */}
          <div className="relative mx-auto mb-6 h-20 w-20">
            <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-lg shadow-green-500/30">
              <svg className="h-10 w-10 text-white animate-scale-in" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">You're Connected!</h1>
          <p className="text-white/60 mb-6">
            Your extension is now linked to your account.
          </p>

          <div className="rounded-2xl bg-green-500/10 border border-green-500/20 p-4 mb-6">
            <p className="text-sm text-green-300">
              Highlight text on any page and press{" "}
              <kbd className="mx-1 rounded-md bg-white/10 px-2 py-1 font-mono text-xs font-semibold">⌘</kbd>
              <span className="text-green-400">+</span>
              <kbd className="mx-1 rounded-md bg-white/10 px-2 py-1 font-mono text-xs font-semibold">⇧</kbd>
              <span className="text-green-400">+</span>
              <kbd className="mx-1 rounded-md bg-white/10 px-2 py-1 font-mono text-xs font-semibold">E</kbd>
              {" "}to explain
            </p>
          </div>

          <button
            onClick={goToDashboard}
            className="btn-primary w-full text-base py-4"
          >
            Go to Dashboard
          </button>
          
          <p className="mt-4 text-sm text-white/40">
            Redirecting in {autoRedirect}s...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center animate-fade-in">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg shadow-brand/30 mb-4">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Connect Extension</h1>
          <p className="text-white/50">
            Link your browser extension to your account securely
          </p>
        </div>

        {/* Main Card */}
        <div className="glass rounded-3xl p-6 sm:p-8 space-y-6">
          {error && (
            <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4 animate-fade-in">
              <div className="flex gap-3">
                <svg className="h-5 w-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-red-300">{error}</p>
              </div>
            </div>
          )}

          <button
            className="btn-primary w-full text-base py-4 flex items-center justify-center gap-2"
            onClick={generate}
            disabled={loading}
          >
            {loading ? (
              <>
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </>
            ) : code ? (
              <>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Regenerate Code
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Generate Pairing Code
              </>
            )}
          </button>

          {code && (
            <div className="space-y-4 animate-fade-in-up">
              {/* Code Display */}
              <div className="relative">
                <button
                  onClick={copyToClipboard}
                  className="w-full rounded-2xl bg-black/40 border border-white/10 p-6 group hover:border-brand/30 hover:bg-black/50 transition-all"
                >
                  <p className="text-xs uppercase tracking-wider text-white/40 mb-2">Your Pairing Code</p>
                  <p className="font-mono text-4xl sm:text-5xl font-bold tracking-[0.3em] text-white group-hover:text-brand-300 transition-colors">
                    {code}
                  </p>
                  <div className="mt-3 flex items-center justify-center gap-2 text-sm text-white/40 group-hover:text-white/60 transition-colors">
                    {copied ? (
                      <>
                        <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-green-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>Tap to copy</span>
                      </>
                    )}
                  </div>
                </button>
              </div>

              {/* Timer and Status */}
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
                  <span className="text-sm text-white/50">Waiting for connection...</span>
                </div>
                <div className={`font-mono text-sm font-semibold ${countdown === "Expired" ? "text-red-400" : "text-amber-400"}`}>
                  {countdown}
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-5">
            <h3 className="font-semibold text-white/80 mb-3 flex items-center gap-2">
              <svg className="h-5 w-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              How to Connect
            </h3>
            <ol className="space-y-3 text-sm text-white/50">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-xs font-semibold text-brand-400">1</span>
                <span>Generate a code above</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-xs font-semibold text-brand-400">2</span>
                <span>Click the ScribeOverlay extension icon in Chrome</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-xs font-semibold text-brand-400">3</span>
                <span>Enter the 6-character code</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-xs font-semibold text-brand-400">4</span>
                <span>This page will update automatically</span>
              </li>
            </ol>
          </div>
        </div>

        {/* Back to Dashboard */}
        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-white/40 hover:text-white/70 transition-colors">
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
