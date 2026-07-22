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

    const store = getStore({ name: 'tmi-registrations', siteID, token });
    const data = await store.get('registrations', { type: 'json' });
    const registrations = Array.isArray(data) ? data : [];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: registrations }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
}
