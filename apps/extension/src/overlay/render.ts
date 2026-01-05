import css from "./styles.css";
import { setPinned, onPinnedChange, hydratePinned } from "./state";

const API_BASE = "http://localhost:3000";

let docRef: Document | null = null;
let onNewExplainRef: (() => void) | null = null;

export function renderPanel(
  doc: Document,
  opts: {
    onClose: () => void;
    onNewExplain: () => void;
  }
) {
  docRef = doc;
  onNewExplainRef = opts.onNewExplain;
  
  // Write complete HTML to iframe document
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { 
          width: 100%; 
          height: 100%; 
          background: #1a1a2e;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          line-height: 1.5;
          color: #e5e7eb;
          overflow: hidden;
        }
        .panel {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #1a1a2e;
          border-left: 2px solid #7c3aed;
          box-shadow: -12px 0 32px rgba(0,0,0,.5);
        }
        header {
          padding: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          background: #16213e;
          flex-shrink: 0;
        }
        .logo {
          font-weight: 700;
          letter-spacing: 0.08em;
          font-size: 12px;
          text-transform: uppercase;
          color: #a78bfa;
        }
        .controls {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .icon-btn {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: #e5e7eb;
          border-radius: 8px;
          width: 32px;
          height: 32px;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .icon-btn:hover {
          background: rgba(255,255,255,0.2);
        }
        .icon-btn.active {
          border-color: #a78bfa;
          color: #a78bfa;
        }
        main {
          padding: 16px;
          overflow-y: auto;
          flex: 1;
          background: #1a1a2e;
        }
        #content {
          white-space: pre-wrap;
          word-wrap: break-word;
          color: #e5e7eb;
          font-size: 14px;
          line-height: 1.6;
        }
        .skeleton .line {
          height: 14px;
          background: linear-gradient(90deg, #2d2d44, #3d3d5c, #2d2d44);
          background-size: 200% 100%;
          animation: pulse 1.4s infinite;
          margin-bottom: 12px;
          border-radius: 6px;
        }
        .skeleton .line.w60 { width: 60%; }
        .skeleton .line.w80 { width: 80%; }
        .skeleton .line.w40 { width: 40%; }
        @keyframes pulse {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .error-message {
          padding: 16px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 10px;
          color: #fca5a5;
          font-size: 13px;
          line-height: 1.5;
        }
        .error-message p { margin: 0 0 8px 0; }
        .error-message p:last-child { margin-bottom: 0; }
        .error-message strong { color: #f87171; }
      </style>
    </head>
    <body>
      <div class="panel">
        <header>
          <span class="logo">ScribeOverlay</span>
          <div class="controls">
            <button id="pin" class="icon-btn" title="Pin">📌</button>
            <button id="close" class="icon-btn" title="Close">✕</button>
          </div>
        </header>
        <main>
          <div id="content">${skeleton()}</div>
        </main>
      </div>
    </body>
    </html>
  `);
  doc.close();

  console.log("[ScribeOverlay] iframe document written");

  wireEvents(doc, opts);
}

export function updatePanel({
  text,
  error,
  signal,
  iframe
}: {
  text?: string;
  error?: string;
  signal: AbortSignal;
  iframe?: HTMLIFrameElement | null;
}) {
  const doc = iframe?.contentDocument || docRef;
  const content = doc?.getElementById("content");

  if (!content) {
    console.error("[ScribeOverlay] Content element not found");
    return;
  }

  content.innerHTML = skeleton();

  if (error) {
    content.innerHTML = `<div class="error-message">${escapeHtml(error)}</div>`;
    return;
  }

  if (!text) return;

  streamExplain(text, content, signal);
}

function skeleton() {
  return `
    <div class="skeleton">
      <div class="line w60"></div>
      <div class="line w80"></div>
      <div class="line w40"></div>
    </div>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wireEvents(
  doc: Document,
  { onClose }: { onClose: () => void; onNewExplain: () => void }
) {
  const closeBtn = doc.getElementById("close");
  const pinBtn = doc.getElementById("pin");

  if (closeBtn) closeBtn.onclick = onClose;

  if (pinBtn) {
    pinBtn.onclick = async () => {
      const pinned = pinBtn.classList.toggle("active");
      await setPinned(pinned);
    };

    onPinnedChange((v) => {
      pinBtn.classList.toggle("active", v);
    });

    void (async () => {
      const current = await hydratePinned();
      pinBtn.classList.toggle("active", current);
    })();
  }
}

async function streamExplain(text: string, el: HTMLElement, signal: AbortSignal) {
  onNewExplainRef?.();
  
  // Get the session token from chrome storage
  const storage = await chrome.storage.sync.get(["sessionToken"]);
  const token = storage.sessionToken;
  
  // Check if user is signed in
  if (!token) {
    el.innerHTML = `
      <div class="error-message">
        <p><strong>Not connected</strong></p>
        <p>Sign in to ScribeOverlay and connect the extension first.</p>
        <p style="margin-top: 8px; font-size: 12px; opacity: 0.7;">
          Click the extension icon → Enter your pairing code
        </p>
      </div>
    `;
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/explain`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-extension-token": token
      },
      body: JSON.stringify({ 
        text, 
        mode: "executive",
        contextLevel: "standard",
        metadata: {
          url: window.location.href,
          domain: window.location.hostname,
          title: document.title
        }
      }),
      signal
    });

    if (!res.ok) {
      if (res.status === 401) {
        el.innerHTML = `
          <div class="error-message">
            <p><strong>Session expired</strong></p>
            <p>Please reconnect the extension from the ScribeOverlay dashboard.</p>
          </div>
        `;
        return;
      }
      const errData = await res.json().catch(() => ({}));
      el.innerHTML = `<div class="error-message">Error: ${escapeHtml(errData.error || res.statusText)}</div>`;
      return;
    }

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let out = "";

    if (!reader) {
      el.textContent = "No response body.";
      return;
    }

    el.innerHTML = ""; // Clear skeleton
    
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      // Parse SSE format
      const lines = chunk.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data && !data.startsWith("{")) {
            out += data;
            el.textContent = out;
          }
        }
      }
    }
    
    // If we got no output, show a fallback
    if (!out.trim()) {
      el.textContent = "Explanation complete.";
    }
  } catch (e) {
    if (signal.aborted) return;
    console.error("ScribeOverlay explain error:", e);
    el.innerHTML = `<div class="error-message">Error loading explanation. Please try again.</div>`;
  }
}
