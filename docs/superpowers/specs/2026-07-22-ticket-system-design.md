# Participant Ticket System — Design Spec

## Overview
Auto-generate and email tamper-proof QR tickets to approved participants. Each ticket is one-time-use and cryptographically signed.

## Data Flow
```
Admin approves registrant
  → POST /api/approve-registration { registrationId }
    → Convex: status=Approved, ticketId=TMI-<uuid>, ticketSent=false
    → Generate HMAC-signed QR (server-side via qrcode npm)
    → Send HTML email via nodemailer + SMTP
    → Convex: ticketSent=true
    → Return success

Participant opens ticket page
  → GET /api/get-ticket?ticketId=TMI-XXXX
    → Convex lookup → return { name, team, track, ticketId, status }

Future: Gate scanner
  → POST /api/check-in { ticketId }
    → Verify HMAC signature
    → If status=CheckedIn → return { error: "already used" }
    → Else → status=CheckedIn, checkedInAt=now, scanAttempts=1
    → return { success, participant }
```

## Convex Schema Changes
Add to `registrations` table:
- `ticketId: v.optional(v.string())`
- `ticketSent: v.optional(v.boolean())`
- `checkedInAt: v.optional(v.string())`
- `scanAttempts: v.optional(v.number())`

## New Netlify Functions

### 1. `approve-registration.mjs`
- Accepts `{ registrationId, approve?: boolean }` — approve=true by default
- Calls Convex `registrations:updateStatus` mutation
- Generates ticketId: `TMI-` + 8 random hex chars
- Updates Convex with ticketId and status
- Generates QR via `qrcode` npm (server-side SVG data URI)
- QR payload: `{ ticketId, name, sig }` where sig = HMAC-SHA256(ticketId + secret)
- Sends email via nodemailer with embedded ticket HTML
- Updates ticketSent=true

### 2. `get-ticket.mjs`
- Accepts `?ticketId=XXX` via GET
- Looks up registration in Convex by ticketId
- Returns: name, teamName, hackathonTrack, ticketId, status

### 3. `check-in.mjs`
- Accepts POST `{ ticketId }`
- Validates HMAC signature
- Checks status → if CheckedIn, return error
- Updates status=CheckedIn, scanAttempts++
- Returns success + participant info

## New Convex Functions

### `registrations.ts` additions:
- `updateStatus` mutation: updates status, ticketId, ticketSent for a registration by ID
- `getByTicketId` query: returns registration by ticketId
- `checkIn` mutation: sets status=CheckedIn, checkedInAt, increments scanAttempts

## Registrations Page UI Changes
- Add "Approve" button in action menu
- Add "Batch Approve" button when checkboxes selected
- Show ticket icon/sent badge for approved participants
- Show "Send Ticket" button if ticketSent=false for approved participants

## participant-ticket.html
- Reads ?ticketId from URL params
- Fetches participant data from /api/get-ticket
- Generates QR code with signed payload
- Shows ticket for printing
- If ticket is checked in, shows "Already used" message

## Env Vars (user to set)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — email server
- `TICKET_SECRET` — HMAC signing key for QR codes

## New npm Dependencies
- `qrcode` — server-side QR generation (data URI)
- `nodemailer` — SMTP email sending

## netlify.toml Changes
```
[[redirects]]
  from = "/api/approve-registration"
  to = "/.netlify/functions/approve-registration"
  status = 200

[[redirects]]
  from = "/api/get-ticket"
  to = "/.netlify/functions/get-ticket"
  status = 200

[[redirects]]
  from = "/api/check-in"
  to = "/.netlify/functions/check-in"
  status = 200
```

## File Cleanup
Remove: `WhatsApp Image 2026-07-21 at 02.21.57.jpeg`, `registration-status.json` (old local-only file, now using API)

## Implementation Order
1. Clean useless files
2. Install npm deps (qrcode, nodemailer)
3. Add Convex schema fields + deploy
4. Add Convex mutations/queries
5. Create Netlify functions
6. Update netlify.toml
7. Update registrations.html UI
8. Update participant-ticket.html
9. Commit, push, deploy
