import { test } from "node:test";
import assert from "node:assert/strict";
import { OpenWAProvider } from "../apps/api/src/messaging.js";
test("OpenWA adapter maps its contract and rejects ambiguous response", async () => {
  const original = globalThis.fetch;
  process.env.OPENWA_BASE_URL = "https://example.invalid";
  process.env.OPENWA_API_KEY = "test-key";
  try {
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), "https://example.invalid/sendText");
      const body = JSON.parse(init?.body as string);
      assert.equal(body.args.to, "919187969708@c.us");
      assert.equal(body.args.content, "Hello");
      return new Response(
        JSON.stringify({ success: true, response: "provider-id" }),
      );
    };
    assert.deepEqual(
      await new OpenWAProvider().send({
        to: "+919187969708",
        body: "Hello",
        key: "one",
      }),
      { id: "provider-id" },
    );
    globalThis.fetch = async () => new Response("{}");
    await assert.rejects(() =>
      new OpenWAProvider().send({
        to: "+919187969708",
        body: "Hello",
        key: "one",
      }),
    );
  } finally {
    globalThis.fetch = original;
  }
});
