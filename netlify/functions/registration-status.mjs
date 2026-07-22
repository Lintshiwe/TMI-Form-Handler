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
    const store = getStore('tmi-config');

    if (event.httpMethod === "GET") {
      let open = true;
      try {
        const stored = await store.get(STATUS_KEY, { type: 'json' });
        open = stored !== null ? stored : true;
      } catch {
        open = true;
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, open }),
      };
    }

    if (event.httpMethod === "POST") {
      const { open } = JSON.parse(event.body);
      await store.setJSON(STATUS_KEY, open);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, open }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: "Method not allowed" }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
}
