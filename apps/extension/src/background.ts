const API_BASE = "http://localhost:3000";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "scribeoverlay-explain", title: "Explain selection", contexts: ["selection"] });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "scribeoverlay-explain" && tab?.id) {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: "EXPLAIN",
        selection: info.selectionText
      });
    } catch (e) {
      // Content script not loaded - inject it first
      console.log("[ScribeOverlay] Injecting content script...");
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["contentScript.js"]
      });
      // Retry after injection
      await chrome.tabs.sendMessage(tab.id, {
        type: "EXPLAIN",
        selection: info.selectionText
      });
    }
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "open-explain" && chrome.tabs) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id && tab.url && !tab.url.startsWith("chrome://")) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: "EXPLAIN" });
      } catch (e) {
        // Content script not loaded - inject it first
        console.log("[ScribeOverlay] Injecting content script...");
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["contentScript.js"]
          });
          // Retry after injection
          await chrome.tabs.sendMessage(tab.id, { type: "EXPLAIN" });
        } catch (injectErr) {
          console.error("[ScribeOverlay] Cannot inject on this page:", injectErr);
        }
      }
    }
  }
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "scribeoverlay-stream") return;
  port.onMessage.addListener(async (msg) => {
    if (msg.type !== "explain") return;
    const payload = msg.payload;
    const token = await new Promise<string | undefined>((resolve) => {
      chrome.storage.sync.get(["sessionToken"], (result) => resolve(result.sessionToken));
    });
    try {
      const resp = await fetch(`${API_BASE}/api/explain`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-extension-token": token ?? ""
        },
        body: JSON.stringify(payload)
      });
      if (!resp.body) {
        port.postMessage({ type: "error", error: "No response body" });
        return;
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";
        for (const part of parts) {
          if (part.startsWith("data:")) {
            const data = part.replace(/^data:\s*/, "");
            port.postMessage({ type: "chunk", data });
          } else if (part.startsWith("event: done")) {
            const dataLine = part.split("\n").find((l) => l.startsWith("data:"));
            if (dataLine) {
              const data = dataLine.replace(/^data:\s*/, "");
              port.postMessage({ type: "done", data });
            }
          }
        }
      }
      if (buffer) {
        port.postMessage({ type: "chunk", data: buffer });
      }
    } catch (error) {
      port.postMessage({ type: "error", error: String(error) });
    }
  });
});
