import { ConvexHttpClient } from "convex/browser"
import QRCode from "qrcode"
import nodemailer from "nodemailer"
import crypto from "crypto"
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
      const { num, bgPath } = pickBackground()
      const bgExists = fs.existsSync(bgPath)
      const name = escapeHtml(reg.firstName + " " + reg.lastName)
      const team = escapeHtml(reg.teamName || "Unassigned")
      const track = escapeHtml(reg.hackathonTrack || "General")

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      })

      const bgUrl = `https://tmi-form-handler.netlify.app/assets/tmi-ticket-background${num}.png`

      const bgImg = bgExists
        ? `<img src="${bgUrl}" width="600" style="display:block;max-width:100%;height:auto;border:0" />`
        : ""

      const bgStyles = bgExists
        ? `background-image:url('${bgUrl}');background-size:cover;background-position:center;background-repeat:no-repeat;background-color:#eef4ff`
        : "background-color:#eef4ff"

      await transporter.sendMail({
        from: '"TMI Hackathon" <' + smtpUser + '>',
        to: reg.email,
        subject: "Your TMI Hackathon 2024 Entry Ticket",
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  .bg-wrap img { display:none !important; }
</style>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
  <!--[if gte mso 9]>
  <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px">
    <v:fill type="frame" src="${bgUrl}" color="#eef4ff" />
    <v:textbox inset="0,0,0,0">
  <![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#eef4ff" style="${bgStyles}">
    <tr>
      <td align="center" style="padding:0;font-size:0;line-height:0" class="bg-wrap">
        ${bgImg}
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:0 16px 32px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" align="center" style="max-width:420px;margin:0 auto;background:#ffffff;border-radius:24px;border:1px solid #e2e8f0">
          <tr>
            <td align="center" style="padding:32px 24px 0">
              <table role="presentation" style="width:64px;height:64px;border:1px solid #e2e8f0;border-radius:16px;margin:0 auto 12px">
                <tr><td align="center" style="padding:4px">
                  <img src="https://tmi-form-handler.netlify.app/assets/tmi-logo.png" alt="TMI" width="56" height="56" style="display:block;border:0">
                </td></tr>
              </table>
              <p style="margin:0;font-size:26px;font-weight:900;letter-spacing:-1px">
                <span style="color:#000">TM</span><span style="color:#2563eb">I</span><span style="color:#1e293b"> HACKATHON</span>
              </p>
              <p style="margin:2px 0 0;font-size:11px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:2px">Official Entry Pass</p>
            </td>
          </tr>
          <tr><td style="padding:0 24px"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0"></td></tr>
          <tr>
            <td align="center" style="padding:24px 24px 0">
              <p style="margin:0 0 4px;font-size:24px;font-weight:800;color:#1e293b">${name}</p>
              <table role="presentation" style="margin:0 auto 12px">
                <tr>
                  <td style="padding:4px 14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:20px;font-size:11px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:1px">PARTICIPANT</td>
                </tr>
              </table>
              <p style="margin:0 0 20px;font-size:13px;color:#64748b;font-weight:500">Team: ${team} • ${track}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 24px">
              <table role="presentation" style="padding:8px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;margin:0 auto">
                <tr><td><img src="${qrDataUri}" alt="QR Code" width="180" height="180" style="display:block;border:0"></td></tr>
              </table>
              <p style="margin:12px 0 0;font-family:monospace;font-size:12px;color:#94a3b8;letter-spacing:1px">${escapeHtml(ticketId)}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:16px 24px 24px">
              <p style="margin:0;font-size:11px;color:#cbd5e1;font-weight:600;text-transform:uppercase;letter-spacing:1px">Scan at entrance for validation</p>
            </td>
          </tr>
          <tr><td style="padding:0 24px"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0"></td></tr>
          <tr>
            <td align="center" style="padding:12px 24px">
              <p style="margin:0;font-size:10px;color:#94a3b8">This ticket is cryptographically signed. Tampering will invalidate it.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  <!--[if gte mso 9]>
    </v:textbox>
  </v:rect>
  <![endif]-->
</body>
</html>`,
        attachments: []
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
