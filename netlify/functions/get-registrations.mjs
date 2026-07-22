import { ConvexHttpClient } from "convex/browser"

export async function handler(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  }

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" }
  }

  try {
    const convexUrl = process.env.CONVEX_URL
    if (!convexUrl) {
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: "CONVEX_URL not set" }) }
    }

    const client = new ConvexHttpClient(convexUrl)
    const registrations = await client.query("registrations:getAll")

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: registrations }),
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message }),
    }
  }
}
