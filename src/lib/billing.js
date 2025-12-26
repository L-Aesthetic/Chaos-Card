// src/lib/billing.js
import { supabase } from "./supabase";

function getDeviceId() {
  const key = "doomgo_device_id";

  // If somehow called outside browser, just return a non-persisted id
  if (typeof window === "undefined") {
    return (globalThis?.crypto?.randomUUID?.() || `dg_${Math.random().toString(36).slice(2)}_${Date.now()}`);
  }

  try {
    let id = window.localStorage.getItem(key);
    if (!id) {
      id = (globalThis?.crypto?.randomUUID?.() || `dg_${Math.random().toString(36).slice(2)}_${Date.now()}`);
      window.localStorage.setItem(key, id);
    }
    return id;
  } catch {
    // localStorage blocked — still return a stable-ish id for this session
    return (globalThis?.crypto?.randomUUID?.() || `dg_${Math.random().toString(36).slice(2)}_${Date.now()}`);
  }
}


export async function startCheckout() {
  // Prefer logged-in identity, but allow anonymous device checkout too
  let userId = null;
  let email = null;

  try {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    userId = session?.user?.id || null;
    email = session?.user?.email || null;
  } catch {}

  const deviceId = getDeviceId();
const kind = userId ? "user" : "device";
  const res = await fetch("/.netlify/functions/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // ✅ send whichever identity we have
    body: JSON.stringify({ userId, email, deviceId, kind }),
  });

  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}

  if (!res.ok) {
    throw new Error(json?.error || json?.message || text || "Checkout failed");
  }

  if (!json?.url) throw new Error("Checkout created, but no URL returned.");
  window.location.href = json.url;
}

export default { startCheckout };

