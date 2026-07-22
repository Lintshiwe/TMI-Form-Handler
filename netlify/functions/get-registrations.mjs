export async function handler(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  const convexUrl = process.env.CONVEX_URL;
  if (!convexUrl) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: "CONVEX_URL not set" }),
    };
  }

  try {
    const res = await fetch(`${convexUrl}/query/getRegistrations:getAll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ args: {} }),
    });
    const data = await res.json();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
}
