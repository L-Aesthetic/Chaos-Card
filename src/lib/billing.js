// src/lib/billing.js
import { supabase } from "./supabase";

function getDeviceId() {
  const key = "doomgo_device_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = (crypto?.randomUUID?.() || `dg_${Math.random().toString(36).slice(2)}_${Date.now()}`);
    localStorage.setItem(key, id);
  }
  return id;
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

  const res = await fetch("/.netlify/functions/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // ✅ send whichever identity we have
    body: JSON.stringify({ userId, email, deviceId }),
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

