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
        // Update existing row by device_id; if userId exists, also "attach" auth uid by setting id = userId
        const updatePatch = userId ? { ...patch, id: userId } : patch;

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
            ? { id: userId, device_id: deviceId, ...patch }
            : { device_id: deviceId, ...patch };

          // Insert safely by device_id (unique)
          const { error: upsertErr } = await supabaseAdmin
            .from("profiles")
            .upsert(insertRow, { onConflict: "device_id" });

          if (upsertErr) throw upsertErr;
        }

        return;
      }

      // Fallback: userId only (won’t be able to insert new row because device_id is required)
      if (userId) {
        const { error } = await supabaseAdmin
          .from("profiles")
          .update(patch)
          .eq("id", userId);

        if (error) throw error;
      }
    };

    // ---- ROUTING ----

    if (stripeEvent.type === "checkout.session.completed") {
      const s = stripeEvent.data.object;
      const md = s.metadata || {};

      await setPro({
        userId: md.userId || null,
        deviceId: md.deviceId || null,
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
          .select("id, device_id")
          .or(
            `stripe_subscription_id.eq.${sub.id},stripe_customer_id.eq.${sub.customer}`
          )
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
          .select("id, device_id")
          .or(
            `stripe_subscription_id.eq.${sub.id},stripe_customer_id.eq.${sub.customer}`
          )
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

    // Optional: invoice.payment_failed (only subscribe if you want this)
    if (stripeEvent.type === "invoice.payment_failed") {
      const inv = stripeEvent.data.object;

      const subId = inv.subscription || null;
      const customerId = inv.customer || null;
      const periodEnd = inv.lines?.data?.[0]?.period?.end || null;

      if (subId || customerId) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id, device_id")
          .or(
            subId
              ? `stripe_subscription_id.eq.${subId},stripe_customer_id.eq.${customerId}`
              : `stripe_customer_id.eq.${customerId}`
          )
          .maybeSingle();

        if (profile?.id || profile?.device_id) {
          await setPro({
            userId: profile?.id || null,
            deviceId: profile?.device_id || null,
            customerId,
            subId,
            periodEnd,
            isPro: false, // payment failed => treat as not pro until recovered
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
