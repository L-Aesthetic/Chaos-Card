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
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const sig =
      event.headers["stripe-signature"] ||
      event.headers["Stripe-Signature"] ||
      event.headers["STRIPE-SIGNATURE"];

    if (!sig) {
      return { statusCode: 400, body: "Missing Stripe-Signature header" };
    }

    const raw = getRawBody(event);

    const stripeEvent = stripe.webhooks.constructEvent(
      raw,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    const setPro = async ({
      userId,
      deviceId,
      customerId,
      subId,
      periodEnd,
      isPro,
    }) => {
      const patch = {
        is_pro: !!isPro,
        stripe_customer_id: customerId || null,
        stripe_subscription_id: subId || null,
        pro_current_period_end: periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : null,
      };

      // Your profiles table requires device_id NOT NULL,
      // so for best reliability we always update/insert by device_id first if present.
      if (deviceId) {
        // Update existing row by device_id; if userId exists, also "attach" auth uid by setting auth_user_id = userId
const updatePatch = userId ? { ...patch, auth_user_id: userId } : patch;

        const { data, error } = await supabaseAdmin
          .from("profiles")
          .update(updatePatch)
          .eq("device_id", deviceId)
          .select("device_id")
          .maybeSingle();

        if (error) throw error;

        // If no row existed, insert one
        if (!data?.device_id) {
          const insertRow = userId
  ? { auth_user_id: userId, device_id: deviceId, ...patch }
  : { device_id: deviceId, ...patch };


          // Insert safely by device_id (unique)
          const { error: upsertErr } = await supabaseAdmin
            .from("profiles")
            .upsert(insertRow, { onConflict: "device_id" });

          if (upsertErr) throw upsertErr;
        }

        return;
      }

      // fallback: userId only — update by auth_user_id instead of id
  if (userId) {
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ ...patch, auth_user_id: userId })
      .eq("auth_user_id", userId);

    if (error) throw error;
      }
    };

    const recordPurchase = async ({
  stripeEventId,
  sessionId,
  invoiceId,
  customerId,
  subId,
  userId,
  deviceId,
  amountCents,
  currency = "usd",
  status = "paid",
  kind = "payment",
  periodStart = null,
  periodEnd = null,
}) => {
  const row = {
    stripe_event_id: stripeEventId || null,
    stripe_session_id: sessionId || null,
    stripe_invoice_id: invoiceId || null,
    stripe_customer_id: customerId || null,
    stripe_subscription_id: subId || null,

    user_id: userId || null,
    device_id: deviceId || null,

    amount_cents: Number(amountCents || 0),
    currency: currency || "usd",
    status,
    kind,

    period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
  };

  // Upsert on stripe_event_id (dedupe). If no stripe_event_id, it will just insert.
  const { error } = await supabaseAdmin
    .from("doomgo_purchases")
    .upsert(row, { onConflict: "stripe_event_id" });

  if (error) throw error;
};

const recordSubEvent = async ({
  stripeEventId,
  customerId,
  subId,
  userId,
  deviceId,
  eventType,
  status = null,
}) => {
  const row = {
    stripe_event_id: stripeEventId || null,
    stripe_customer_id: customerId || null,
    stripe_subscription_id: subId || null,
    user_id: userId || null,
    device_id: deviceId || null,
    event_type: eventType,
    status,
    occurred_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin
    .from("doomgo_subscription_events")
    .upsert(row, { onConflict: "stripe_event_id" });

  if (error) throw error;
};

    // ---- ROUTING ----

if (stripeEvent.type === "checkout.session.completed") {
  const s = stripeEvent.data.object;
  const md = s.metadata || {};

  // 1) set pro
  await setPro({
    userId: md.userId || null,
    deviceId: md.deviceId || null,
    customerId: s.customer,
    subId: s.subscription,
    periodEnd: null,
    isPro: true,
  });

  // 2) record initial revenue (if any)
  // Stripe sessions usually include amount_total + currency
  await recordPurchase({
    stripeEventId: stripeEvent.id,
    sessionId: s.id,
    invoiceId: s.invoice || null,
    customerId: s.customer,
    subId: s.subscription,
    userId: md.userId || null,
    deviceId: md.deviceId || null,
    amountCents: s.amount_total || 0,
    currency: s.currency || "usd",
    status: s.payment_status === "paid" ? "paid" : (s.payment_status || "paid"),
    kind: s.mode === "subscription" ? "subscription" : "one_time",
    periodStart: null,
    periodEnd: null,
  });
}


    if (
      stripeEvent.type === "customer.subscription.updated" ||
      stripeEvent.type === "customer.subscription.created"
    ) {
      const sub = stripeEvent.data.object;
      const md = sub.metadata || {};

      await recordSubEvent({
  stripeEventId: stripeEvent.id,
  customerId: sub.customer,
  subId: sub.id,
  userId: md.userId || null,
  deviceId: md.deviceId || null,
  eventType: stripeEvent.type.includes("created") ? "created" : "updated",
  status: sub.status,
});


      const userId = md.userId || null;
      const deviceId = md.deviceId || null;

      // Best path: metadata
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
        // Fallback: find profile by subscription id OR customer id
const { data: profile } = await supabaseAdmin
  .from("profiles")
  .select("auth_user_id, device_id")
  .or(
    `stripe_subscription_id.eq.${sub.id},stripe_customer_id.eq.${sub.customer}`
  )
  .maybeSingle();

if (profile?.auth_user_id || profile?.device_id) {
  await setPro({
    userId: profile?.auth_user_id || null,
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

await recordSubEvent({
  stripeEventId: stripeEvent.id,
  customerId: sub.customer,
  subId: sub.id,
  userId: md.userId || null,
  deviceId: md.deviceId || null,
  eventType: "deleted",
  status: sub.status,
});


      const userId = md.userId || null;
      const deviceId = md.deviceId || null;

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
        const { data: profile } = await supabaseAdmin
  .from("profiles")
  .select("auth_user_id, device_id")
  .or(
    `stripe_subscription_id.eq.${sub.id},stripe_customer_id.eq.${sub.customer}`
  )
  .maybeSingle();

if (profile?.auth_user_id || profile?.device_id) {
  await setPro({
    userId: profile?.auth_user_id || null,
    deviceId: profile?.device_id || null,
            customerId: sub.customer,
            subId: sub.id,
            periodEnd: sub.current_period_end,
            isPro: false,
          });
        }
      }
    }

    if (stripeEvent.type === "invoice.paid") {
  const inv = stripeEvent.data.object;

  const subId = inv.subscription || null;
  const customerId = inv.customer || null;

  // try to pull userId/deviceId from metadata if you store it on subscription
  const md = inv.subscription_details?.metadata || inv.metadata || {};
  let userId = md.userId || null;
  let deviceId = md.deviceId || null;

  // fallback: find profile by sub/customer
  if (!userId && !deviceId && (subId || customerId)) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("auth_user_id, device_id")
      .or(
        subId
          ? `stripe_subscription_id.eq.${subId},stripe_customer_id.eq.${customerId}`
          : `stripe_customer_id.eq.${customerId}`
      )
      .maybeSingle();

    userId = profile?.auth_user_id || null;
    deviceId = profile?.device_id || null;
  }

  // period from first line item if present
  const line = inv.lines?.data?.[0];
  const periodStart = line?.period?.start || null;
  const periodEnd = line?.period?.end || null;

  await recordPurchase({
    stripeEventId: stripeEvent.id,
    sessionId: null,
    invoiceId: inv.id,
    customerId,
    subId,
    userId,
    deviceId,
    amountCents: inv.amount_paid || 0,
    currency: inv.currency || "usd",
    status: "paid",
    kind: "subscription",
    periodStart,
    periodEnd,
  });
}


    // Optional: invoice.payment_failed (only subscribe if you want this)
    if (stripeEvent.type === "invoice.payment_failed") {
      const inv = stripeEvent.data.object;

      const subId = inv.subscription || null;
      const customerId = inv.customer || null;
      const periodEnd = inv.lines?.data?.[0]?.period?.end || null;

      if (subId || customerId) {
        const { data: profile } = await supabaseAdmin
  .from("profiles")
  .select("auth_user_id, device_id")
  .or(
    subId
      ? `stripe_subscription_id.eq.${subId},stripe_customer_id.eq.${customerId}`
      : `stripe_customer_id.eq.${customerId}`
  )
  .maybeSingle();

if (profile?.auth_user_id || profile?.device_id) {
  await setPro({
    userId: profile?.auth_user_id || null,
    deviceId: profile?.device_id || null,
    customerId,
    subId,
    periodEnd,
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
