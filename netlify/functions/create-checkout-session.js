import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { userId, deviceId } = JSON.parse(event.body || "{}");

    if (!deviceId) {
      return { statusCode: 400, body: "Missing deviceId" };
    }

    // Put your Stripe Price ID in Netlify env vars
    // STRIPE_PRICE_ID=price_123...
    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      return { statusCode: 500, body: "Missing STRIPE_PRICE_ID env var" };
    }

    const siteUrl = process.env.SITE_URL || "https://doomgo.world";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],

      success_url: `${siteUrl}/?plus=success`,
      cancel_url: `${siteUrl}/?plus=canceled`,

      // Session metadata (available on checkout.session.completed)
      metadata: {
        userId: userId || "",
        deviceId,
      },

      // Subscription metadata (available on customer.subscription.updated/created/deleted)
      subscription_data: {
        metadata: {
          userId: userId || "",
          deviceId,
        },
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (e) {
    console.error("create_checkout error:", e);
    return { statusCode: 500, body: e.message };
  }
};
