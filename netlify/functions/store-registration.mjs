import { getStore } from '@netlify/blobs';

export async function handler(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: "Method not allowed" }) };
  }

  try {
    const siteID = process.env.SITE_ID;
    const token = process.env.NETLIFY_ACCESS_TOKEN;
    if (!siteID || !token) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: !siteID ? "SITE_ID not available" : "NETLIFY_ACCESS_TOKEN not set"
        })
      };
    }

    const body = JSON.parse(event.body);
    body.createdAt = body.createdAt || new Date().toISOString();
    body.status = body.status || 'Pending';

    const store = getStore({ name: 'tmi-registrations', siteID, token });
    const existing = await store.get('registrations', { type: 'json' });
    const registrations = Array.isArray(existing) ? existing : [];
    registrations.push(body);
    await store.setJSON('registrations', registrations);

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: err.message }) };
  }
}
