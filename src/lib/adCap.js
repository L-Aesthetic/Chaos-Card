// src/lib/adCap.js
const key = "doomgo_adcap_v1";
const todayKey = () => new Date().toISOString().slice(0, 10);

function readState() {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return { day: todayKey(), count: 0 };
    return { day: parsed.day || todayKey(), count: Number(parsed.count) || 0 };
  } catch {
    return { day: todayKey(), count: 0 };
  }
}

function writeState(state) {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {}
}

export function canShowAd(maxPerDay = 2) {
  if (typeof window === "undefined") return false;

  const state = readState();

  if (state.day !== todayKey()) {
    state.day = todayKey();
    state.count = 0;
    writeState(state);
  }

  return state.count < maxPerDay;
}

export function markAdShown() {
  if (typeof window === "undefined") return;

  const state = readState();

  if (state.day !== todayKey()) {
    state.day = todayKey();
    state.count = 0;
  }

  state.count += 1;
  writeState(state);
}
