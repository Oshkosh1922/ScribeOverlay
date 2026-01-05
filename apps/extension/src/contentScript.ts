import { openPanel } from "./overlay/panel";
import { getPinned } from "./overlay/state";

console.log("[ScribeOverlay] Content script loaded");

let selectionBubble: HTMLElement | null = null;
let hideTimeout: ReturnType<typeof setTimeout> | null = null;

function getSelectionText() {
  return window.getSelection()?.toString().trim() || "";
}

function getSelectionRect(): DOMRect | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  return range.getBoundingClientRect();
}

function createBubble() {
  if (selectionBubble) return selectionBubble;
  
  selectionBubble = document.createElement("div");
  selectionBubble.id = "scribeoverlay-bubble";
  selectionBubble.innerHTML = `
    <style>
      #scribeoverlay-bubble {
        position: fixed;
        z-index: 2147483646;
        pointer-events: none;
        opacity: 0;
        transform: translateY(8px) scale(0.9);
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      #scribeoverlay-bubble.visible {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }
      #scribeoverlay-bubble-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        background: linear-gradient(135deg, #7c3aed, #6d28d9);
        color: white;
        border: none;
        border-radius: 24px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(124, 58, 237, 0.4), 0 2px 8px rgba(0,0,0,0.2);
        transition: all 0.15s ease;
        white-space: nowrap;
      }
      #scribeoverlay-bubble-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 24px rgba(124, 58, 237, 0.5), 0 4px 12px rgba(0,0,0,0.25);
      }
      #scribeoverlay-bubble-btn:active {
        transform: scale(0.98);
      }
      #scribeoverlay-bubble-btn svg {
        width: 16px;
        height: 16px;
      }
    </style>
    <button id="scribeoverlay-bubble-btn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
      </svg>
      Explain
    </button>
  `;
  
  document.documentElement.appendChild(selectionBubble);
  
  const btn = selectionBubble.querySelector("#scribeoverlay-bubble-btn");
  btn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const text = getSelectionText();
    if (text) {
      hideBubble();
      openPanel({ text });
    }
  });
  
  return selectionBubble;
}

function showBubble(rect: DOMRect) {
  const bubble = createBubble();
  
  // Position above selection, centered
  const bubbleWidth = 110; // approximate
  let left = rect.left + rect.width / 2 - bubbleWidth / 2;
  let top = rect.top - 48;
  
  // Keep within viewport
  left = Math.max(10, Math.min(left, window.innerWidth - bubbleWidth - 10));
  if (top < 10) {
    top = rect.bottom + 10; // Show below if no space above
  }
  
  bubble.style.left = `${left}px`;
  bubble.style.top = `${top}px`;
  
  requestAnimationFrame(() => {
    bubble.classList.add("visible");
  });
}

function hideBubble() {
  if (selectionBubble) {
    selectionBubble.classList.remove("visible");
  }
}

function handleSelectionChange() {
  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }
  
  const text = getSelectionText();
  const rect = getSelectionRect();
  
  if (text && text.length >= 3 && rect && rect.width > 0) {
    // Small delay to avoid flickering
    hideTimeout = setTimeout(() => {
      showBubble(rect);
    }, 300);
  } else {
    hideBubble();
  }
}

// Listen for selection changes
document.addEventListener("selectionchange", handleSelectionChange);

// Hide on click elsewhere
document.addEventListener("mousedown", (e) => {
  if (selectionBubble && !selectionBubble.contains(e.target as Node)) {
    // Small delay to allow click on bubble
    setTimeout(hideBubble, 100);
  }
});

// Hide on scroll
document.addEventListener("scroll", hideBubble, true);

// Also support keyboard shortcut and message from popup
chrome.runtime.onMessage.addListener((msg) => {
  console.log("[ScribeOverlay] Message received:", msg);
  if (msg.type === "EXPLAIN") {
    const text = msg.selection?.trim() || getSelectionText();
    console.log("[ScribeOverlay] Selected text:", text?.substring(0, 50) || "(none)");
    if (!text) {
      console.log("[ScribeOverlay] No text selected, showing error");
      openPanel({ error: "Select text first." });
      return;
    }
    hideBubble();
    openPanel({ text });
  }
});

// SPA survival (X / Gmail) — debounced + pinned-only
let reattachTimer: number | null = null;

const observer = new MutationObserver(() => {
  if (reattachTimer !== null) return;
  reattachTimer = window.setTimeout(async () => {
    reattachTimer = null;

    const pinned = await getPinned();
    if (!pinned) return;

    const existing = document.getElementById("scribeoverlay-root");
    if (existing) return;

    openPanel({ reattachIfPinned: true });
  }, 400);
});

observer.observe(document.documentElement, { childList: true, subtree: true });
