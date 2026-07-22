import { getStore } from '@netlify/blobs';

const STATUS_KEY = 'tmi_registrations_open';

export async function handler(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
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
          error: !siteID
            ? "SITE_ID not available in function environment"
            : "NETLIFY_ACCESS_TOKEN not set. Add a Netlify Personal Access Token in Site Settings > Environment Variables."
        })
      };
    }

    const store = getStore({ name: 'tmi-config', siteID, token });

    if (event.httpMethod === "GET") {
      let open = true;
      try {
        const stored = await store.get(STATUS_KEY, { type: 'json' });
        open = stored !== null ? stored : true;
      } catch {
        open = true;
      }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, open }) };
    }

    if (event.httpMethod === "POST") {
      const { open } = JSON.parse(event.body);
      await store.setJSON(STATUS_KEY, open);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, open }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: "Method not allowed" }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: err.message }) };
  }
}
