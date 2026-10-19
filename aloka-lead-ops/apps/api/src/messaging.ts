export interface Message {
  to: string;
  body: string;
  key: string;
}
export interface MessagingProvider {
  readonly name: string;
  send(message: Message): Promise<{ id: string }>;
}
export class OpenWAProvider implements MessagingProvider {
  readonly name = "openwa";
  async send(m: Message) {
    const base = process.env.OPENWA_BASE_URL;
    if (!base || !process.env.OPENWA_API_KEY)
      throw Error("OpenWA not configured");
    const res = await fetch(
      new URL(process.env.OPENWA_SEND_PATH || "/sendText", base),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          api_key: process.env.OPENWA_API_KEY,
        },
        body: JSON.stringify({
          args: { to: m.to.replace("+", "") + "@c.us", content: m.body },
        }),
        signal: AbortSignal.timeout(20000),
      },
    );
    if (!res.ok) throw Error("OpenWA HTTP " + res.status);
    const result = (await res.json()) as {
      success?: boolean;
      response?: string | { id?: string };
    };
    if (result.success === false) throw Error("OpenWA rejected message");
    const id =
      typeof result.response === "string"
        ? result.response
        : result.response?.id;
    if (!id) throw Error("Unrecognized OpenWA receipt");
    return { id };
  }
}
export function messaging(): MessagingProvider {
  if (process.env.MESSAGING_PROVIDER !== "openwa")
    throw Error("Unsupported messaging provider");
  return new OpenWAProvider();
}
