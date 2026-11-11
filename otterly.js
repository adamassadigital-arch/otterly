// Netlify Function: server-side proxy for the Otterly Public API.
// The API key lives in the OTTERLY_API_KEY environment variable and is never sent to the browser.

const BASE = "https://data.otterly.ai/v1";

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  const key = process.env.OTTERLY_API_KEY;
  if (!key) {
    return json(500, {
      error: "OTTERLY_API_KEY is not set. Add it under Site settings → Environment variables in Netlify.",
    });
  }

  const p = event.queryStringParameters || {};
  const { action, reportId, startDate, endDate, country } = p;

  let url;
  if (action === "reports") {
    url = `${BASE}/reports/brand`;
  } else if (action === "stats" && reportId) {
    url = `${BASE}/reports/brand/${encodeURIComponent(reportId)}/stats`;
  } else if (action === "citations" && reportId) {
    url = `${BASE}/reports/brand/${encodeURIComponent(reportId)}/citations/stats`;
  } else {
    return json(400, { error: "Invalid request. Expected action=reports|stats|citations and reportId." });
  }

  if (action !== "reports") {
    if (!startDate || !endDate || !country) {
      return json(400, { error: "startDate, endDate and country are required." });
    }
    const qs = new URLSearchParams({ startDate, endDate, country: country.toLowerCase() });
    url += `?${qs.toString()}`;
  }

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
    });
    const text = await res.text();
    return {
      statusCode: res.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: text,
    };
  } catch (err) {
    return json(502, { error: `Could not reach Otterly: ${err.message}` });
  }
};
