let pinnedCache: boolean | null = null;
let hydrated = false;
const listeners = new Set<(v: boolean) => void>();

export async function hydratePinned(): Promise<boolean> {
  if (hydrated && pinnedCache !== null) return pinnedCache;
  const result = await chrome.storage.sync.get("panelPinned");
  pinnedCache = !!result.panelPinned;
  hydrated = true;
  return pinnedCache;
}

export async function getPinned(): Promise<boolean> {
  return hydratePinned();
}

export async function setPinned(val: boolean) {
  pinnedCache = val;
  hydrated = true;
  await chrome.storage.sync.set({ panelPinned: val });
  listeners.forEach((l) => l(val));
}

export function onPinnedChange(fn: (v: boolean) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
