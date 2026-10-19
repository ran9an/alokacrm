import { createRemoteJWKSet, jwtVerify } from "jose";
import { timingSafeEqual } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { pool } from "./db.js";
import type { Role } from "../../../packages/contracts/src/index.js";
let jwks: ReturnType<typeof createRemoteJWKSet>;
export function secret(
  actual: string | undefined,
  expected: string | undefined,
) {
  if (!expected || expected.length < 32 || !actual) return false;
  const a = Buffer.from(actual),
    b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function service(req: FastifyRequest, key: string) {
  if (
    !secret(
      req.headers.authorization?.replace(/^Bearer /, ""),
      process.env[key],
    )
  )
    throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
}
export async function user(req: FastifyRequest) {
  try {
    jwks ??= createRemoteJWKSet(new URL(process.env.AUTH_JWKS_URL!));
    const { payload } = await jwtVerify(
      req.headers.authorization?.replace(/^Bearer /, "") || "",
      jwks,
      {
        issuer: process.env.AUTH_ISSUER,
        audience: process.env.AUTH_AUDIENCE || "authenticated",
        algorithms: ["RS256", "ES256"],
        requiredClaims: ["sub", "exp"],
      },
    );
    const { rows } = await pool.query(
      "SELECT id,role FROM staff WHERE id=$1 AND active",
      [payload.sub],
    );
    if (!rows[0]) throw Error();
    return rows[0] as { id: string; role: Role };
  } catch {
    throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  }
}
export function write(role: Role) {
  if (role === "viewer")
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
}
