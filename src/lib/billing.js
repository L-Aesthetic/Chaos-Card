import { supabase } from "./supabase";

const getDeviceId = () => {
  const key = "doomgo_device_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = (crypto?.randomUUID?.() || `dg_${Math.random().toString(36).slice(2)}_${Date.now()}`);
    localStorage.setItem(key, id);
  }
  return id;
};

export async function startCheckout() {
  const deviceId = getDeviceId();

  const { data } = await supabase.auth.getSession();
  const userId = data?.session?.user?.id || null;

  const res = await fetch("/.netlify/functions/create_checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, deviceId }),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || "Checkout failed");
  }

  const { url } = await res.json();
  if (!url) throw new Error("No Stripe checkout URL returned");

  window.location.href = url;
}
