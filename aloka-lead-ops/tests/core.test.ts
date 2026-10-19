import { test } from "node:test";
import assert from "node:assert/strict";
import {
  phone,
  canAccess,
  sendWindow,
  intakeSchema,
} from "../packages/contracts/src/index.js";
import { secret } from "../apps/api/src/auth.js";
import { safeCell } from "../packages/integrations/src/index.js";
test("Indian and international phone normalization", () => {
  assert.equal(phone("9187969708"), "+919187969708");
  assert.equal(phone("+44 7700 900123"), "+447700900123");
  assert.throws(() => phone("123"));
});
test("Sales ownership and viewer scope", () => {
  assert.equal(canAccess("sales", "a", "b"), false);
  assert.equal(canAccess("sales", "a", "a"), true);
  assert.equal(canAccess("manager", "a", null), true);
});
test("Quiet hour boundaries in India", () => {
  assert.equal(sendWindow(new Date("2026-10-19T03:29:00Z")), false);
  assert.equal(sendWindow(new Date("2026-10-19T03:30:00Z")), true);
  assert.equal(sendWindow(new Date("2026-10-19T15:29:00Z")), true);
  assert.equal(sendWindow(new Date("2026-10-19T15:30:00Z")), false);
});
test("Absent or weak service secrets fail closed", () => {
  assert.equal(secret(undefined, undefined), false);
  assert.equal(secret("short", "short"), false);
  assert.equal(secret("x".repeat(32), "x".repeat(32)), true);
});
test("Consent required in intake and formula export escaped", () => {
  assert.equal(
    intakeSchema.safeParse({ name: "A", phone: "9187969708" }).success,
    false,
  );
  assert.equal(safeCell("=IMPORTXML()"), "'=IMPORTXML()");
});
