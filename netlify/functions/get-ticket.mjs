import { ConvexHttpClient } from "convex/browser"
import crypto from "crypto"

export async function handler(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  }

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" }
  if (event.httpMethod !== "GET") return { statusCode: 405, headers, body: JSON.stringify({ success: false }) }

  try {
    const convexUrl = process.env.CONVEX_URL
    if (!convexUrl) return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: "CONVEX_URL not set" }) }

    const ticketId = event.queryStringParameters?.ticketId
    if (!ticketId) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: "ticketId required" }) }

    const client = new ConvexHttpClient(convexUrl)
    const reg = await client.query("registrations:getByTicketId", { ticketId })
    if (!reg) return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: "Ticket not found" }) }

    const ticketSecret = process.env.TICKET_SECRET

    function maskEmail(email) {
      if (!email || !email.includes('@')) return email;
      var parts = email.split('@');
      var name = parts[0];
      var masked = name.length <= 2 ? name[0] + '***' : name.slice(0, 2) + '***' + name.slice(-1);
      return masked + '@' + parts[1];
    }

    var sig = ticketSecret ? crypto.createHmac("sha256", ticketSecret).update(ticketId).digest("hex") : '';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          ticketId: reg.ticketId,
          firstName: reg.firstName,
          lastName: reg.lastName,
          teamName: reg.teamName,
          hackathonTrack: reg.hackathonTrack,
          email: maskEmail(reg.email),
          status: reg.status,
          ticketSent: reg.ticketSent,
          checkedInAt: reg.checkedInAt,
          scanAttempts: reg.scanAttempts || 0,
          sig: sig,
        },
      }),
    }
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: err.message }) }
  }
}
