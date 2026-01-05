import { getPinned } from "./state";

let iframe: HTMLIFrameElement | null = null;
let abortController: AbortController | null = null;

export function openPanel({
  text,
  error,
  reattachIfPinned
}: {
  text?: string;
  error?: string;
  reattachIfPinned?: boolean;
}) {
  void (async () => {
    if (reattachIfPinned) {
      const pinned = await getPinned();
      if (!pinned) return;
    }

    const existingFrame = document.getElementById("scribeoverlay-frame");
    if (existingFrame) {
      existingFrame.remove();
      iframe = null;
    }

    iframe = document.createElement("iframe");
    iframe.id = "scribeoverlay-frame";
    iframe.style.cssText = `
      position: fixed; top: 0; right: 0; width: 420px; height: 100vh;
      z-index: 2147483647; border: none; background: transparent;
      display: block; visibility: visible; opacity: 1; margin: 0; padding: 0;
    `;
    
    iframe.srcdoc = getHTML();
    document.documentElement.appendChild(iframe);
    
    await new Promise<void>((resolve) => {
      iframe!.onload = () => resolve();
      setTimeout(() => resolve(), 200);
    });
    
    const doc = iframe.contentDocument;
    if (!doc) return;
    
    doc.getElementById("close")?.addEventListener("click", () => {
      abortController?.abort();
      iframe?.remove();
      iframe = null;
    });
    
    doc.getElementById("copy")?.addEventListener("click", async () => {
      const contentEl = doc.getElementById("content");
      if (contentEl) {
        try {
          await navigator.clipboard.writeText(contentEl.innerText);
          const btn = doc.getElementById("copy");
          if (btn) {
            btn.textContent = "Copied!";
            setTimeout(() => { btn.textContent = "Copy"; }, 2000);
          }
        } catch {}
      }
    });
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") { abortController?.abort(); iframe?.remove(); iframe = null; }
    };
    doc.addEventListener("keydown", handleEsc);
    document.addEventListener("keydown", handleEsc);
    
    abortController?.abort();
    abortController = new AbortController();
    
    const contentEl = doc.getElementById("content");
    if (contentEl) {
      if (error) {
        contentEl.innerHTML = `<div class="error">${escapeHtml(error)}</div>`;
      } else if (text) {
        streamExplain(text, contentEl, abortController.signal);
      }
    }
  })();
}

function getHTML() {
  return `<!DOCTYPE html><html><head><style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { 
  width: 100%; height: 100%; 
  background: transparent; 
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
  color: #e8e8f0; 
  font-size: 14px; 
  line-height: 1.7; 
}
.panel { 
  width: 100%; height: 100%; 
  display: flex; flex-direction: column; 
  background: linear-gradient(180deg, #0f0f1a 0%, #121220 100%);
  border-left: 1px solid rgba(124, 58, 237, 0.2);
  animation: slideIn 0.25s ease-out;
}
@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

header { 
  padding: 16px 20px; 
  display: flex; justify-content: space-between; align-items: center; 
  border-bottom: 1px solid rgba(255,255,255,0.06);
  background: rgba(124, 58, 237, 0.05);
}
.logo { 
  font-weight: 600; font-size: 14px; color: #fff;
  display: flex; align-items: center; gap: 10px;
}
.logo-mark {
  width: 28px; height: 28px;
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px;
}
.controls { display: flex; gap: 8px; }
.btn { 
  background: rgba(255,255,255,0.06); 
  border: 1px solid rgba(255,255,255,0.1); 
  color: #999; 
  border-radius: 8px; 
  padding: 6px 12px; 
  cursor: pointer; 
  font-size: 12px;
  transition: all 0.15s;
}
.btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
.btn-close { padding: 6px 10px; }

main { 
  padding: 20px; 
  flex: 1; 
  overflow-y: auto; 
  overflow-x: hidden; 
}
main::-webkit-scrollbar { width: 4px; }
main::-webkit-scrollbar-track { background: transparent; }
main::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.3); border-radius: 2px; }

#content { }

.loading { 
  display: flex; align-items: center; gap: 12px; 
  color: #a78bfa; padding: 20px 0;
}
.spinner { 
  width: 18px; height: 18px; 
  border: 2px solid rgba(124,58,237,0.2); 
  border-top-color: #7c3aed; 
  border-radius: 50%; 
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Clean section styling */
.section { margin-bottom: 24px; }
.section-label { 
  font-size: 11px; 
  text-transform: uppercase; 
  letter-spacing: 0.08em; 
  color: #666;
  margin-bottom: 8px;
  font-weight: 600;
}
.section-content { color: #d0d0e0; }

.summary { 
  font-size: 15px; 
  line-height: 1.8;
  color: #f0f0f5;
}

.key-points { list-style: none; }
.key-points li { 
  padding: 8px 0 8px 16px;
  border-left: 2px solid rgba(124,58,237,0.3);
  margin-bottom: 8px;
  color: #c0c0d0;
}

.context-box {
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.15);
  border-radius: 10px;
  padding: 14px 16px;
  color: #93c5fd;
  font-size: 13px;
}

.implications-box {
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.15);
  border-radius: 10px;
  padding: 14px 16px;
  color: #6ee7b7;
  font-size: 13px;
}

.analysis-box {
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.15);
  border-radius: 10px;
  padding: 14px 16px;
  color: #fcd34d;
  font-size: 13px;
}

.bottom-line {
  background: linear-gradient(135deg, rgba(124,58,237,0.15), rgba(124,58,237,0.05));
  border: 1px solid rgba(124,58,237,0.25);
  border-radius: 10px;
  padding: 14px 16px;
  color: #c4b5fd;
  font-weight: 500;
  font-size: 14px;
}

.error { 
  background: rgba(239,68,68,0.1); 
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: 10px;
  padding: 14px 16px; 
  color: #fca5a5; 
}

footer { 
  padding: 12px 20px; 
  border-top: 1px solid rgba(255,255,255,0.04);
  font-size: 11px; color: #444; 
  text-align: center;
}
</style></head><body>
<div class="panel">
  <header>
    <span class="logo"><span class="logo-mark">S</span>ScribeOverlay</span>
    <div class="controls">
      <button id="copy" class="btn">Copy</button>
      <button id="close" class="btn btn-close">✕</button>
    </div>
  </header>
  <main><div id="content"><div class="loading"><div class="spinner"></div><span>Analyzing...</span></div></div></main>
  <footer>Press Esc to close</footer>
</div>
</body></html>`;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatResponse(data: any): string {
  if (!data || typeof data !== 'object') {
    return `<div class="error">Unable to parse response</div>`;
  }
  
  let html = '';
  
  // Summary - the main explanation
  if (data.summary) {
    html += `<div class="section">
      <div class="section-label">What This Says</div>
      <div class="summary">${escapeHtml(data.summary)}</div>
    </div>`;
  }
  
  // Key Points
  if (data.keyPoints && Array.isArray(data.keyPoints) && data.keyPoints.length > 0) {
    html += `<div class="section">
      <div class="section-label">Key Takeaways</div>
      <ul class="key-points">
        ${data.keyPoints.map((p: string) => `<li>${escapeHtml(p)}</li>`).join('')}
      </ul>
    </div>`;
  }
  
  // Context
  if (data.context) {
    html += `<div class="section">
      <div class="section-label">Background Context</div>
      <div class="context-box">${escapeHtml(data.context)}</div>
    </div>`;
  }
  
  // Implications
  if (data.implications) {
    html += `<div class="section">
      <div class="section-label">What This Means</div>
      <div class="implications-box">${escapeHtml(data.implications)}</div>
    </div>`;
  }
  
  // Critical Analysis
  if (data.criticalAnalysis) {
    html += `<div class="section">
      <div class="section-label">Critical Take</div>
      <div class="analysis-box">${escapeHtml(data.criticalAnalysis)}</div>
    </div>`;
  }
  
  // Bottom Line
  if (data.bottomLine) {
    html += `<div class="section">
      <div class="section-label">Bottom Line</div>
      <div class="bottom-line">${escapeHtml(data.bottomLine)}</div>
    </div>`;
  }
  
  return html || '<div class="error">No analysis available</div>';
}

async function streamExplain(text: string, el: HTMLElement, signal: AbortSignal) {
  const API_BASE = "http://localhost:3000";
  const storage = await chrome.storage.sync.get(["sessionToken"]);
  const token = storage.sessionToken;
  
  if (!token) {
    el.innerHTML = '<div class="error"><strong>Not connected</strong><br><br>Sign in at localhost:3000 and connect your extension to start analyzing text.</div>';
    return;
  }

  try {
    const res = await fetch(API_BASE + "/api/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-extension-token": token },
      body: JSON.stringify({ text, mode: "executive", contextLevel: "expanded", metadata: { url: window.location.href, domain: window.location.hostname, title: document.title } }),
      signal
    });
    
    if (!res.ok) {
      if (res.status === 401) {
        el.innerHTML = '<div class="error"><strong>Session expired</strong><br><br>Please reconnect the extension at localhost:3000/connect</div>';
        return;
      }
      const errData = await res.json().catch(() => ({}));
      el.innerHTML = `<div class="error">Error: ${escapeHtml(errData.error || res.statusText)}</div>`;
      return;
    }

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let streamedJson = "";
    let finalJson: any = null;
    
    if (!reader) { el.innerHTML = '<div class="error">No response</div>'; return; }

    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
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
            streamedJson += payload;
          }
        }
      }
    }
    
    let dataToFormat: any = null;
    if (finalJson) {
      dataToFormat = finalJson;
    } else if (streamedJson) {
      const start = streamedJson.indexOf("{");
      const end = streamedJson.lastIndexOf("}");
      if (start >= 0 && end > start) {
        try { dataToFormat = JSON.parse(streamedJson.slice(start, end + 1)); } catch {}
      }
    }
    
    if (dataToFormat) {
      el.innerHTML = formatResponse(dataToFormat);
    } else {
      el.innerHTML = `<div class="section"><div class="summary">${escapeHtml(streamedJson || "No response")}</div></div>`;
    }
  } catch (e) {
    if (signal.aborted) return;
    el.innerHTML = '<div class="error">Error loading analysis. Please try again.</div>';
  }
}
