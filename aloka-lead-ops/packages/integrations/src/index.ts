import { createHash } from "node:crypto";
import { SignJWT, importPKCS8 } from "jose";
async function post(
  url: string,
  payload: unknown,
  headers: Record<string, string> = {},
) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw Error("Integration HTTP " + res.status);
  return res;
}
export async function ga4(input: {
  clientId: string;
  eventId: string;
  name: string;
  params: Record<string, string | number>;
  analyticsConsent: boolean;
}) {
  if (!input.analyticsConsent) return;
  const id = process.env.GA4_MEASUREMENT_ID,
    secret = process.env.GA4_API_SECRET;
  if (!id || !secret) throw Error("GA4 missing configuration");
  await post(
    "https://www.google-analytics.com/mp/collect?measurement_id=" +
      encodeURIComponent(id) +
      "&api_secret=" +
      encodeURIComponent(secret),
    {
      client_id: input.clientId,
      events: [
        {
          name: input.name,
          params: { ...input.params, event_id: input.eventId },
        },
      ],
    },
  );
}
export async function meta(input: {
  eventId: string;
  eventTime: number;
  eventName: string;
  phone: string;
  marketingConsent: boolean;
  sourceUrl: string;
}) {
  if (!input.marketingConsent) return;
  const version = process.env.META_GRAPH_VERSION,
    pixel = process.env.META_PIXEL_ID,
    token = process.env.META_ACCESS_TOKEN;
  if (!version || !pixel || !token) throw Error("Meta missing configuration");
  await post(
    `https://graph.facebook.com/${version}/${pixel}/events`,
    {
      data: [
        {
          event_name: input.eventName,
          event_id: input.eventId,
          event_time: input.eventTime,
          action_source: "website",
          event_source_url: input.sourceUrl,
          user_data: {
            ph: [
              createHash("sha256")
                .update(input.phone.replace(/\D/g, ""))
                .digest("hex"),
            ],
          },
        },
      ],
    },
    { Authorization: "Bearer " + token },
  );
}
export function safeCell(value: unknown) {
  const s = String(value ?? "");
  return /^[=+@\-\t\r]/.test(s) ? "'" + s : s;
}
export async function sheetsSnapshot(rows: unknown[][]) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    id = process.env.SHEETS_SPREADSHEET_ID;
  if (!email || !key || !id) throw Error("Sheets missing configuration");
  const assertion = await new SignJWT({
    scope: "https://www.googleapis.com/auth/spreadsheets",
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(await importPKCS8(key, "RS256"));
  const auth = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!auth.ok) throw Error("Google authentication failed");
  const { access_token } = (await auth.json()) as { access_token: string };
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}/values/Master!A1?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: {
        Authorization: "Bearer " + access_token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: rows.map((row) => row.map(safeCell)) }),
      signal: AbortSignal.timeout(20000),
    },
  );
  if (!res.ok) throw Error("Sheets export failed");
}
