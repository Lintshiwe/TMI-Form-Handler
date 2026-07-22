# Ticket System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-generate and email tamper-proof QR tickets to approved participants with one-time-use validation.

**Architecture:** New Netlify functions (approve-registration, get-ticket, check-in) handle server-side QR generation + SMTP email. Convex stores ticketId, ticketSent, checkedInAt, scanAttempts. Registrations page gets approve flow. participant-ticket.html loads ticket by ticketId.

**Tech Stack:** Convex (queries/mutations), Netlify Functions (Node.js), qrcode npm, nodemailer, HMAC signing

---

### Task 1: Clean useless files + install deps

**Files:**
- Delete: `WhatsApp Image 2026-07-21 at 02.21.57.jpeg`
- Delete: `registration-status.json`
- Modify: `package.json`

- [ ] **Step 1: Remove useless files**

```bash
rm "WhatsApp Image 2026-07-21 at 02.21.57.jpeg" registration-status.json
```

- [ ] **Step 2: Install new npm dependencies**

```bash
npm install qrcode nodemailer
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: clean useless files, add qrcode + nodemailer deps"
```

---

### Task 2: Add Convex schema fields + deploy

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Add ticket fields to registrations table**

Edit `convex/schema.ts` — in the registrations table object, add after the last field:
```
    ticketId: v.optional(v.string()),
    ticketSent: v.optional(v.boolean()),
    checkedInAt: v.optional(v.string()),
    scanAttempts: v.optional(v.number()),
```

- [ ] **Step 2: Add new Convex queries and mutations to registrations.ts**

Add `updateStatus` mutation, `getByTicketId` query, `checkIn` mutation.

- [ ] **Step 3: Deploy Convex functions**

```bash
npx convex deploy
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add ticketId, ticketSent, checkedInAt, scanAttempts to Convex"
```

---

### Task 3: Create approve-registration.mjs Netlify function

**Files:**
- Create: `netlify/functions/approve-registration.mjs`

Generates ticketId + QR code + sends email via SMTP.

- [ ] **Step 1: Create the function file**

- [ ] **Step 2: Commit**

---

### Task 4: Create get-ticket.mjs Netlify function

**Files:**
- Create: `netlify/functions/get-ticket.mjs`

Public endpoint to look up ticket by ticketId.

- [ ] **Step 1: Create the function file**

- [ ] **Step 2: Commit**

---

### Task 5: Create check-in.mjs Netlify function

**Files:**
- Create: `netlify/functions/check-in.mjs`

Validates one-time use, marks Checked In.

- [ ] **Step 1: Create the function file**

- [ ] **Step 2: Commit**

---

### Task 6: Update netlify.toml + participant-ticket.html

- [ ] **Step 1: Add 3 new API redirects to netlify.toml**

- [ ] **Step 2: Update participant-ticket.html to read ?ticketId from URL and auto-load**

- [ ] **Step 3: Commit**

---

### Task 7: Update registrations page — approve action + ticket column

- [ ] **Step 1: Add Approve action in action menu + batch approve button**

- [ ] **Step 2: Add ticket status column to table**

- [ ] **Step 3: Commit**

---

### Task 8: Deploy + set env vars

- [ ] **Step 1: Push + deploy**

```bash
git push
netlify deploy --prod --dir=. --functions=netlify/functions --skip-functions-cache
```

- [ ] **Step 2: Tell user what env vars to set**

SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, TICKET_SECRET
