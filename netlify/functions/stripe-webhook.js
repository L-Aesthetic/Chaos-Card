import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Netlify gives event.body as a string; Stripe needs raw bytes
const getRawBody = (event) => {
  if (event.isBase64Encoded) return Buffer.from(event.body, "base64");
  return Buffer.from(event.body || "", "utf8");
};

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const sig = event.headers["stripe-signature"];
    const raw = getRawBody(event);

    const stripeEvent = stripe.webhooks.constructEvent(
      raw,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    // We rely on: client_reference_id = Supabase user id
const setPro = async ({ userId, deviceId, customerId, subId, periodEnd, isPro }) => {
  const patch = {
    is_pro: isPro,
    stripe_customer_id: customerId || null,
    stripe_subscription_id: subId || null,
    pro_current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
  };

  if (userId) {
    const { error } = await supabaseAdmin
      .from("profiles")
      .update(patch)
      .eq("id", userId);
    if (error) throw error;
    return;
  }

  if (deviceId) {
    // Try update first (most likely row already exists because your app upserts presence)
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update(patch)
      .eq("device_id", deviceId)
      .select("device_id")
      .maybeSingle();

    if (error) throw error;

    // If no row existed, upsert one (safe fallback)
    if (!data?.device_id) {
      const { error: upsertErr } = await supabaseAdmin
        .from("profiles")
        .upsert({ device_id: deviceId, ...patch }, { onConflict: "device_id" });
      if (upsertErr) throw upsertErr;
    }
  }
};


if (stripeEvent.type === "checkout.session.completed") {
  const s = stripeEvent.data.object;

  const md = s.metadata || {};
  const userId = md.userId || null;
  const deviceId = md.deviceId || null;

  await setPro({
    userId,
    deviceId,
    customerId: s.customer,
    subId: s.subscription,
    periodEnd: null,
    isPro: true,
  });
}


    if (
  stripeEvent.type === "customer.subscription.updated" ||
  stripeEvent.type === "customer.subscription.created"
) {
  const sub = stripeEvent.data.object;

  const md = sub.metadata || {};
  const userId = md.userId || null;
  const deviceId = md.deviceId || null;

  // ✅ Best path: update by identity saved in metadata
  if (userId || deviceId) {
    await setPro({
      userId,
      deviceId,
      customerId: sub.customer,
      subId: sub.id,
      periodEnd: sub.current_period_end,
      isPro: sub.status === "active" || sub.status === "trialing",
    });
  } else {
    // ✅ Fallback: find the profile by subscription id
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, device_id")
      .eq("stripe_subscription_id", sub.id)
      .maybeSingle();

    if (profile?.id || profile?.device_id) {
      await setPro({
        userId: profile?.id || null,
        deviceId: profile?.device_id || null,
        customerId: sub.customer,
        subId: sub.id,
        periodEnd: sub.current_period_end,
        isPro: sub.status === "active" || sub.status === "trialing",
      });
    }
  }
}


if (stripeEvent.type === "customer.subscription.deleted") {
  const sub = stripeEvent.data.object;

  const md = sub.metadata || {};
  const userId = md.userId || null;
  const deviceId = md.deviceId || null;

  // ✅ Best path: update by metadata identity
  if (userId || deviceId) {
    await setPro({
      userId,
      deviceId,
      customerId: sub.customer,
      subId: sub.id,
      periodEnd: sub.current_period_end,
      isPro: false,
    });
  } else {
    // ✅ Fallback: find by subscription id
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, device_id")
      .eq("stripe_subscription_id", sub.id)
      .maybeSingle();

    if (profile?.id || profile?.device_id) {
      await setPro({
        userId: profile?.id || null,
        deviceId: profile?.device_id || null,
        customerId: sub.customer,
        subId: sub.id,
        periodEnd: sub.current_period_end,
        isPro: false,
      });
    }
  }
}


    return { statusCode: 200, body: "ok" };
  } catch (e) {
    console.error("stripe-webhook error:", e);
    return { statusCode: 400, body: `Webhook Error: ${e.message}` };
  }
};
