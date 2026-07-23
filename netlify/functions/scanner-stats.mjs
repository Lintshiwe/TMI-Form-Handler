import { ConvexHttpClient } from "convex/browser"

export async function handler(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  }

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" }

  try {
    const convexUrl = process.env.CONVEX_URL
    if (!convexUrl) return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: "CONVEX_URL not set" }) }

    const client = new ConvexHttpClient(convexUrl)

    if (event.httpMethod === "GET") {
      const stats = await client.query("settings:getScannerStats")
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: stats }) }
    }

    if (event.httpMethod === "POST") {
      const { total, valid, invalid } = JSON.parse(event.body)
      if (typeof total !== "number" || typeof valid !== "number" || typeof invalid !== "number") {
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: "total, valid, invalid required" }) }
      }
      await client.mutation("settings:updateScannerStats", { total, valid, invalid })
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: { total, valid, invalid } }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: "Method not allowed" }) }
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: err.message }) }
  }
}
