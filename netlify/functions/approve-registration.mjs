import { ConvexHttpClient } from "convex/browser"
import QRCode from "qrcode"
import nodemailer from "nodemailer"
import crypto from "crypto"

function generateTicketId() {
  const rand = crypto.randomBytes(4).toString("hex").toUpperCase()
  return "TMI-" + rand
}

function signData(ticketId, secret) {
  return crypto.createHmac("sha256", secret).update(ticketId).digest("hex")
}

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

    const { registrationId } = JSON.parse(event.body)
    if (!registrationId) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: "registrationId required" }) }

    const client = new ConvexHttpClient(convexUrl)
    const ticketId = generateTicketId()
    const sig = signData(ticketId, ticketSecret)

    const allRegs = await client.query("registrations:getAll")
    const reg = allRegs.find(r => r._id === registrationId)
    if (!reg) return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: "Registration not found" }) }

    await client.mutation("registrations:updateStatus", {
      id: registrationId,
      status: "Approved",
      ticketId,
      ticketSent: false,
    })

    const qrPayload = JSON.stringify({ ticketId, name: reg.firstName + " " + reg.lastName, sig })
    const qrDataUri = await QRCode.toDataURL(qrPayload, { width: 300, margin: 2, color: { dark: "#0f172a", light: "#ffffff" } })

    const smtpHost = process.env.SMTP_HOST
    const smtpPort = parseInt(process.env.SMTP_PORT || "587")
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS

    if (smtpHost && smtpUser) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      })

      const ticketUrl = `https://tmi-form-handler.netlify.app/participant-ticket.html?ticketId=${ticketId}`

      await transporter.sendMail({
        from: smtpUser,
        to: reg.email,
        subject: "🎟 Your TMI Hackathon 2024 Entry Ticket",
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; padding: 40px 20px; }
  .container { max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.1); }
  .header { background: linear-gradient(135deg, #2563eb, #1e40af); padding: 24px; text-align: center; color: white; }
  .header h1 { margin: 0; font-size: 22px; }
  .header p { margin: 4px 0 0; opacity: 0.85; font-size: 13px; }
  .body { padding: 24px; text-align: center; }
  .name { font-size: 24px; font-weight: 800; color: #0f172a; }
  .badge { display: inline-block; padding: 4px 14px; background: #eff6ff; color: #2563eb; border-radius: 20px; font-size: 12px; font-weight: 700; margin: 8px 0 12px; }
  .team { font-size: 14px; color: #64748b; margin-bottom: 20px; }
  .qr { padding: 12px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; display: inline-block; }
  .qr img { display: block; max-width: 200px; }
  .ticketId { font-family: monospace; font-size: 12px; color: #94a3b8; margin-top: 12px; }
  .footer { border-top: 1px solid #e5e7eb; padding: 16px; font-size: 11px; color: #94a3b8; text-align: center; }
  .btn { display: inline-block; margin-top: 16px; padding: 12px 24px; background: #2563eb; color: white; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px; }
</style></head>
<body>
  <div class="container">
    <div class="header"><h1>TMI HACKATHON 2024</h1><p>Official Entry Pass</p></div>
    <div class="body">
      <div class="name">${reg.firstName} ${reg.lastName}</div>
      <div class="badge">PARTICIPANT</div>
      <div class="team">Team: ${reg.teamName || "Unassigned"} • ${reg.hackathonTrack || "General"}</div>
      <div class="qr"><img src="${qrDataUri}" alt="QR Code"></div>
      <div class="ticketId">${ticketId}</div>
      <a href="${ticketUrl}" class="btn">View Online Ticket</a>
    </div>
    <div class="footer">This ticket is cryptographically signed. Tampering will invalidate it.</div>
  </div>
</body>
</html>`,
      })

      await client.mutation("registrations:updateStatus", {
        id: registrationId,
        status: "Approved",
        ticketId,
        ticketSent: true,
      })
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, ticketId }) }
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: err.message }) }
  }
}
