export async function handler(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: "Method not allowed" }) };
  }

  const convexUrl = process.env.CONVEX_URL;
  if (!convexUrl) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: "CONVEX_URL not set" }) };
  }

  try {
    const body = JSON.parse(event.body);

    const res = await fetch(`${convexUrl}/mutation/register:register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ args: body }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: errText }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: err.message }) };
  }
}
