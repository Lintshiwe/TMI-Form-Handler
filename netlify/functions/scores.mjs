import { ConvexHttpClient } from "convex/browser"

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" }
  }

  try {
    const convexUrl = process.env.CONVEX_URL
    if (!convexUrl) {
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: "CONVEX_URL not set" }) }
    }

    const client = new ConvexHttpClient(convexUrl)

    if (event.httpMethod === "GET") {
      const projectId = event.queryStringParameters?.projectId
      if (projectId) {
        const scores = await client.query("scores:getByProjectId", { projectId })
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, data: scores }),
        }
      }
      const scores = await client.query("scores:getAll")
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: scores }),
      }
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body)
      await client.mutation("scores:create", body)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true }),
      }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: "Method not allowed" }) }
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message }),
    }
  }
}
