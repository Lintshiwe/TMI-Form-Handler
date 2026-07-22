import { ConvexHttpClient } from "convex/browser"
import QRCode from "qrcode"
import nodemailer from "nodemailer"
import crypto from "crypto"
import sharp from "sharp"
import fs from "fs"
import path from "path"

function generateTicketId() {
  const rand = crypto.randomBytes(4).toString("hex").toUpperCase()
  return "TMI-" + rand
}

function signData(ticketId, secret) {
  return crypto.createHmac("sha256", secret).update(ticketId).digest("hex")
}

function pickBackground() {
  const num = Math.random() < 0.5 ? 1 : 2
  const bgPath = path.resolve(process.cwd(), "assets", `tmi-ticket-background${num}.png`)
  return { num, bgPath }
}

function escapeHtml(str) {
  if (!str) return ""
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

async function generateTicketImage(reg, ticketId, qrDataUri, sig) {
  const { num, bgPath } = pickBackground()

  let bgBuffer
  if (fs.existsSync(bgPath)) {
    bgBuffer = await sharp(bgPath).resize(800, 1100, { fit: "cover" }).png().toBuffer()
  } else {
    bgBuffer = await sharp({
      create: { width: 800, height: 1100, channels: 3, background: { r: 238, g: 244, b: 255 } }
    }).png().toBuffer()
  }

  const name = escapeHtml(reg.firstName + " " + reg.lastName)
  const team = escapeHtml(reg.teamName || "Unassigned")
  const track = escapeHtml(reg.hackathonTrack || "General")

  const cardX = 80
  const cardY = 140
  const cardW = 640
  const cardH = 820
  const cardR = 32

  const logoBase64 = await getLogoBase64()
  const logoSrc = logoBase64 ? `data:image/png;base64,${logoBase64}` : ""

  const svg = `
<svg width="800" height="1100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow" x="-5%" y="-5%" width="115%" height="115%">
      <feDropShadow dx="0" dy="4" stdDeviation="12" flood-color="#000" flood-opacity="0.08"/>
    </filter>
  </defs>

  <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="${cardR}" ry="${cardR}"
        fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" filter="url(#shadow)"/>

  <image x="340" y="180" width="120" height="120" href="${logoSrc}"/>

  <text x="400" y="345" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="900" letter-spacing="-1">
    <tspan fill="#000000">TM</tspan><tspan fill="#2563eb">I</tspan><tspan fill="#1e293b"> HACKATHON</tspan>
  </text>
  <text x="400" y="370" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" fill="#2563eb" letter-spacing="3">OFFICIAL ENTRY PASS</text>

  <line x1="120" y1="400" x2="680" y2="400" stroke="#e2e8f0" stroke-width="1"/>

  <text x="400" y="460" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="800" fill="#1e293b">${name}</text>

  <rect x="290" y="478" width="220" height="28" rx="14" ry="14" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1"/>
  <text x="400" y="497" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="700" fill="#2563eb" letter-spacing="1.5">PARTICIPANT</text>

  <text x="400" y="545" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="15" fill="#64748b" font-weight="600">Team: ${team}  •  ${track}</text>

  <image x="250" y="580" width="300" height="300" href="${qrDataUri}"/>

  <text x="400" y="910" text-anchor="middle" font-family="Courier New, monospace" font-size="14" fill="#94a3b8" letter-spacing="1.5">${escapeHtml(ticketId)}</text>

  <text x="400" y="940" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#cbd5e1" font-weight="600" letter-spacing="1.5">SCAN AT ENTRANCE FOR VALIDATION</text>
</svg>`

  const svgBuffer = Buffer.from(svg)

  const final = await sharp(bgBuffer)
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
    .png({ quality: 90 })
    .toBuffer()

  return { imageBuffer: final, bgIndex: num }
}

let _logoBase64 = null
async function getLogoBase64() {
  if (_logoBase64) return _logoBase64
  const logoPath = path.resolve(process.cwd(), "assets", "tmi-logo.png")
  if (fs.existsSync(logoPath)) {
    const buf = fs.readFileSync(logoPath)
    const resized = await sharp(buf).resize(120, 120).png().toBuffer()
    _logoBase64 = resized.toString("base64")
  } else {
    _logoBase64 = ""
  }
  return _logoBase64
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
      const { imageBuffer, bgIndex } = await generateTicketImage(reg, ticketId, qrDataUri, sig)

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      })

      const attachmentName = `TMI-Hackathon-Ticket-${ticketId}.png`

      await transporter.sendMail({
        from: smtpUser,
        to: reg.email,
        subject: "Your TMI Hackathon 2024 Entry Ticket",
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#eef4ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef4ff">
    <tr>
      <td align="center" style="padding:32px 16px">
        <p style="font-size:14px;color:#475569;margin:0 0 4px">Your entry ticket is attached to this email.</p>
        <p style="font-size:13px;color:#64748b;margin:0 0 20px">Please download and save it, or print it out for check-in.</p>
        <p style="font-size:13px;color:#94a3b8;margin:0">Ticket: <strong style="color:#2563eb;font-family:monospace">${ticketId}</strong></p>
      </td>
    </tr>
  </table>
</body>
</html>`,
        attachments: [{
          filename: attachmentName,
          content: imageBuffer,
          contentType: "image/png",
          cid: "ticket-attachment"
        }]
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
