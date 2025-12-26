import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { userId, email, deviceId, kind } = JSON.parse(event.body || "{}");

// Require *some* stable identity
const finalKind = kind || (userId ? "user" : "device");
const ref = userId || deviceId;

if (!ref) {
  return { statusCode: 400, body: JSON.stringify({ error: "Missing identity (userId or deviceId)" }) };
}

const siteUrl = process.env.SITE_URL || "https://doomgo.world";

const metadata = {
  kind: finalKind,
  userId: userId || "",
  deviceId: deviceId || "",
};

const session = await stripe.checkout.sessions.create({
  mode: "subscription",
  line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],

  // ✅ Stripe can collect email automatically if you don't provide one.
  // If you *do* have it (logged-in), you can prefill it:
  ...(email ? { customer_email: email } : { customer_creation: "always" }),

  // ✅ Keep a reference too (handy for debugging), but metadata is the real mapping
  client_reference_id: ref,

  // ✅ Put identity in BOTH places so subscription events also carry it
  metadata,
  subscription_data: { metadata },

  success_url: `${siteUrl}/?upgraded=1`,
  cancel_url: `${siteUrl}/?upgrade=cancel`,
  allow_promotion_codes: true,
});


    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (e) {
    console.error("create-checkout-session error:", e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
