import { ConvexHttpClient } from "convex/browser"
import crypto from "crypto"

export async function handler(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  }

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" }
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: "Method not allowed" }) }

  try {
    const convexUrl = process.env.CONVEX_URL
    const ticketSecret = process.env.TICKET_SECRET
    if (!convexUrl) return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: "CONVEX_URL not set" }) }
    if (!ticketSecret) return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: "TICKET_SECRET not set" }) }

    const { ticketId, sig } = JSON.parse(event.body)
    if (!ticketId) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: "ticketId required" }) }

    if (sig) {
      const expectedSig = crypto.createHmac("sha256", ticketSecret).update(ticketId).digest("hex")
      if (sig !== expectedSig) return { statusCode: 403, headers, body: JSON.stringify({ success: false, error: "Invalid ticket signature" }) }
    }

    const client = new ConvexHttpClient(convexUrl)

    try {
      await client.mutation("registrations:checkIn", { ticketId })
    } catch (err) {
      if (err.message === "already_checked_in") {
        const reg = await client.query("registrations:getByTicketId", { ticketId })
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: false,
            error: "already_checked_in",
            message: "This ticket has already been used.",
            scanAttempts: reg?.scanAttempts || 0,
          }),
        }
      }
      throw err
    }

    const reg = await client.query("registrations:getByTicketId", { ticketId })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          name: (reg.firstName || "") + " " + (reg.lastName || ""),
          teamName: reg.teamName,
          ticketId,
        },
      }),
    }
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: err.message }) }
  }
}
