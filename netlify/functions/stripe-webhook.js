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
    const setPro = async ({ userId, customerId, subId, periodEnd, isPro }) => {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({
          is_pro: isPro,
          stripe_customer_id: customerId || null,
          stripe_subscription_id: subId || null,
          pro_current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        })
        .eq("id", userId);

      if (error) throw error;
    };

    if (stripeEvent.type === "checkout.session.completed") {
      const s = stripeEvent.data.object;
      await setPro({
        userId: s.client_reference_id,
        customerId: s.customer,
        subId: s.subscription,
        periodEnd: null,
        isPro: true,
      });
    }

    if (stripeEvent.type === "customer.subscription.updated" || stripeEvent.type === "customer.subscription.created") {
      const sub = stripeEvent.data.object;
      const userId = sub.metadata?.userId || null; // optional if you add metadata later

      // If we don’t have userId in metadata, we can’t safely map here.
      // BUT checkout.session.completed already set the profile, so this is extra.
      // (You can improve later by writing metadata.userId when creating session.)

      // Still update period end if we can find profile by subscription id:
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("stripe_subscription_id", sub.id)
        .maybeSingle();

      if (profile?.id) {
        await setPro({
          userId: profile.id,
          customerId: sub.customer,
          subId: sub.id,
          periodEnd: sub.current_period_end,
          isPro: sub.status === "active" || sub.status === "trialing",
        });
      }
    }

    if (stripeEvent.type === "customer.subscription.deleted") {
      const sub = stripeEvent.data.object;

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("stripe_subscription_id", sub.id)
        .maybeSingle();

      if (profile?.id) {
        await setPro({
          userId: profile.id,
          customerId: sub.customer,
          subId: sub.id,
          periodEnd: sub.current_period_end,
          isPro: false,
        });
      }
    }

    return { statusCode: 200, body: "ok" };
  } catch (e) {
    console.error("stripe-webhook error:", e);
    return { statusCode: 400, body: `Webhook Error: ${e.message}` };
  }
};
