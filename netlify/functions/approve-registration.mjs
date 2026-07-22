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

    const allRegs = await client.query("registrations:getAll")
    const reg = allRegs.find(r => r._id === registrationId)
    if (!reg) return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: "Registration not found" }) }

    const ticketId = reg.ticketId || generateTicketId()
    const sig = signData(ticketId, ticketSecret)

    if (reg.status !== "Approved" || !reg.ticketId) {
      await client.mutation("registrations:updateStatus", {
        id: registrationId,
        status: "Approved",
        ticketId,
        ticketSent: false,
      })
    }

    const qrPayload = JSON.stringify({ ticketId, name: reg.firstName + " " + reg.lastName, sig })
    const qrDataUri = await QRCode.toDataURL(qrPayload, { width: 300, margin: 2, color: { dark: "#2563eb", light: "#ffffff" } })

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

      await transporter.sendMail({
        from: smtpUser,
        to: reg.email,
        subject: "Your TMI Hackathon 2024 Entry Ticket",
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f1f5f9; padding: 40px 20px; }
  .container { max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
  .header { border-bottom: 1px solid #e2e8f0; padding: 24px; text-align: center; }
  .header .logo { font-size: 26px; font-weight: 900; letter-spacing: -1px; }
  .header .logo .tm { color: #000; }
  .header .logo .i { color: #2563eb; }
  .header .sub { font-size: 11px; font-weight: 600; color: #2563eb; text-transform: uppercase; letter-spacing: 2px; margin-top: 2px; }
  .body { padding: 24px; text-align: center; }
  .name { font-size: 24px; font-weight: 800; color: #1e293b; }
  .badge { display: inline-block; padding: 4px 14px; background: #eff6ff; border: 1px solid #bfdbfe; color: #2563eb; border-radius: 20px; font-size: 12px; font-weight: 700; margin: 8px 0 12px; }
  .team { font-size: 14px; color: #64748b; margin-bottom: 20px; }
  .qr { padding: 12px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; display: inline-block; }
  .qr img { display: block; max-width: 200px; }
  .ticketId { font-family: monospace; font-size: 12px; color: #94a3b8; margin-top: 12px; }
  .footer { border-top: 1px solid #e2e8f0; padding: 16px; font-size: 11px; color: #94a3b8; text-align: center; }
</style></head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo"><span class="tm">TM</span><span class="i">I</span> HACKATHON 2024</div>
      <div class="sub">Official Entry Pass</div>
    </div>
    <div class="body">
      <div class="name">${reg.firstName} ${reg.lastName}</div>
      <div class="badge">PARTICIPANT</div>
      <div class="team">Team: ${reg.teamName || "Unassigned"} • ${reg.hackathonTrack || "General"}</div>
      <div class="qr"><img src="${qrDataUri}" alt="QR Code"></div>
      <div class="ticketId">${ticketId}</div>
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
