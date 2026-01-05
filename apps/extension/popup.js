const API_BASE = "http://localhost:3000";

const codeInput = document.getElementById("codeInput");
const pairBtn = document.getElementById("pairBtn");
const statusEl = document.getElementById("status");
const connectSection = document.getElementById("connectSection");
const connectedSection = document.getElementById("connectedSection");
const userEmailEl = document.getElementById("userEmail");
const disconnectBtn = document.getElementById("disconnectBtn");

// Auto-uppercase input
codeInput.addEventListener("input", (e) => {
  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
});

// Enter to submit
codeInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    pairBtn.click();
  }
});

function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = "status show " + type;
}

function hideStatus() {
  statusEl.className = "status";
}

function showConnected(email) {
  connectSection.classList.add("hidden");
  connectedSection.classList.add("show");
  userEmailEl.textContent = email || "Account connected";
}

function showDisconnected() {
  connectSection.classList.remove("hidden");
  connectedSection.classList.remove("show");
  codeInput.value = "";
  hideStatus();
}

// Check if already connected on load
chrome.storage.sync.get(["sessionToken", "userEmail"], (data) => {
  if (data.sessionToken) {
    showConnected(data.userEmail);
  }
});

// Pair button
pairBtn.addEventListener("click", async () => {
  const code = codeInput.value.trim();
  
  if (!code || code.length < 6) {
    showStatus("Please enter a 6-character code", "error");
    return;
  }
  
  pairBtn.disabled = true;
  showStatus("Connecting...", "loading");
  
  try {
    const res = await fetch(`${API_BASE}/api/extension/pair`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.message || data.error || "Pairing failed");
    }
    
    // Store the token
    const storageData = {
      sessionToken: data.sessionToken,
      userEmail: data.user?.email || null,
      userId: data.user?.id || null,
      workspaceId: data.workspaceId || null,
      expiresAt: data.expiresAt || null,
    };
    
    chrome.storage.sync.set(storageData, () => {
      showStatus("Connected successfully!", "success");
      setTimeout(() => {
        showConnected(data.user?.email);
      }, 1000);
    });
    
  } catch (err) {
    showStatus(err.message, "error");
  } finally {
    pairBtn.disabled = false;
  }
});

// Disconnect button
disconnectBtn.addEventListener("click", () => {
  chrome.storage.sync.remove(
    ["sessionToken", "userEmail", "userId", "workspaceId", "expiresAt"],
    () => {
      showDisconnected();
    }
  );
});
