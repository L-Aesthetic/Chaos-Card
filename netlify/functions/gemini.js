// netlify/functions/gemini.js

export async function handler(event, context) {
  try {
    const body = JSON.parse(event.body || "{}");
    const { prompt, systemInstruction } = body;

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No prompt provided" }),
      };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
    };

    if (systemInstruction && systemInstruction.trim() !== "") {
      payload.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify({ result: data }),
    };
  } catch (error) {
    console.error("Gemini function error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}
