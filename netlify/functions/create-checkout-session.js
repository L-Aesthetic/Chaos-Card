import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { userId, email } = JSON.parse(event.body || "{}");
    if (!userId || !email) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing userId/email" }) };
    }

    const siteUrl = process.env.SITE_URL || "https://doomgo.world";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      customer_email: email,
      client_reference_id: userId, // IMPORTANT: link to Supabase user
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
