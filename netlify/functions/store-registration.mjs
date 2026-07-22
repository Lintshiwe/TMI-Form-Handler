import { ConvexHttpClient } from "convex/browser"

const botKeywords = [
  "ignore previous", "ignore all", "disregard", "forget", "ignore your",
  "you are an ai", "as an ai", "language model", "llm", "prompt",
  "you must", "you will", "ignore the", "system prompt", "instruction",
]

function isBotSubmission(body) {
  if (body.hpField || body.website || body.url) return true
  var text = JSON.stringify(body).toLowerCase()
  for (var i = 0; i < botKeywords.length; i++) {
    if (text.indexOf(botKeywords[i]) !== -1) return true
  }
  return false
}

export async function handler(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  }

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" }
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: "Method not allowed" }) }
  }

  try {
    const convexUrl = process.env.CONVEX_URL
    if (!convexUrl) {
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: "CONVEX_URL not set" }) }
    }

    const body = JSON.parse(event.body)

    if (isBotSubmission(body)) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

    const client = new ConvexHttpClient(convexUrl)
    await client.mutation("registrations:register", body)

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: err.message }) }
  }
}
