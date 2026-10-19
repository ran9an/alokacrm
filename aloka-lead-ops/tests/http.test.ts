import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "../apps/api/src/server.js";
test("HTTP trust boundaries reject absent, weak and wrong credentials", async () => {
  process.env.INTAKE_TOKEN = "a".repeat(40);
  process.env.OPENWA_WEBHOOK_TOKEN = "b".repeat(40);
  process.env.AUTOMATION_TOKEN = "c".repeat(40);
  const app = build();
  try {
    for (const [method, url] of [
      ["POST", "/v1/intake"],
      ["POST", "/v1/webhooks/openwa"],
      ["GET", "/v1/automation/export"],
      ["POST", "/v1/automation/followups"],
      ["GET", "/v1/leads"],
    ] as const) {
      const res = await app.inject({ method, url });
      assert.equal(res.statusCode, 401, url);
    }
    const validation = await app.inject({
      method: "POST",
      url: "/v1/intake",
      headers: { authorization: "Bearer " + process.env.INTAKE_TOKEN },
      payload: { name: "No consent" },
    });
    assert.equal(validation.statusCode, 400);
    const crossSecret = await app.inject({
      method: "POST",
      url: "/v1/webhooks/openwa",
      headers: { authorization: "Bearer " + process.env.INTAKE_TOKEN },
      payload: {},
    });
    assert.equal(crossSecret.statusCode, 401);
  } finally {
    await app.close();
  }
});
