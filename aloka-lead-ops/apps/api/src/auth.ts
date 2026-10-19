import { createRemoteJWKSet, jwtVerify } from "jose";
import { timingSafeEqual } from "node:crypto";
import { createHash, randomBytes, scrypt as nodeScrypt } from "node:crypto";
import { promisify } from "node:util";
import type { FastifyRequest } from "fastify";
import { pool } from "./db.js";
import type { Role } from "../../../packages/contracts/src/index.js";
let jwks: ReturnType<typeof createRemoteJWKSet>;
const scrypt = promisify(nodeScrypt);
const sessionHours = 12;

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, saltHex, expectedHex] = encoded.split("$");
  if (algorithm !== "scrypt" || !saltHex || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = (await scrypt(password, Buffer.from(saltHex, "hex"), expected.length)) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function login(email: string, password: string) {
  const { rows } = await pool.query(
    "SELECT id,name,email,role,active,capacity,password_hash,must_change_password FROM staff WHERE email=$1",
    [email],
  );
  const staff = rows[0];
  if (!staff?.active || !staff.password_hash || !(await verifyPassword(password, staff.password_hash)))
    throw Object.assign(new Error("Invalid email or password"), { statusCode: 401 });
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionHours * 60 * 60 * 1000);
  await pool.query(
    "INSERT INTO sessions(token_hash,staff_id,expires_at) VALUES($1,$2,$3)",
    [tokenHash(token), staff.id, expiresAt],
  );
  const { password_hash: _passwordHash, active: _active, ...profile } = staff;
  return { token, expiresAt: expiresAt.toISOString(), staff: profile };
}

export async function logout(token: string | undefined) {
  if (token) await pool.query("UPDATE sessions SET revoked_at=now() WHERE token_hash=$1", [tokenHash(token)]);
}
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
  const token = req.headers.authorization?.replace(/^Bearer /, "") || "";
  try {
    if (token) {
      const local = await pool.query(
        `SELECT s.id,s.name,s.email,s.role,s.capacity,s.must_change_password
         FROM sessions x JOIN staff s ON s.id=x.staff_id
         WHERE x.token_hash=$1 AND x.revoked_at IS NULL AND x.expires_at>now() AND s.active`,
        [tokenHash(token)],
      );
      if (local.rows[0]) return local.rows[0] as { id: string; name: string; email: string; role: Role; capacity: number; must_change_password: boolean };
    }
    if (!process.env.AUTH_JWKS_URL || !process.env.AUTH_ISSUER) throw Error();
    jwks ??= createRemoteJWKSet(new URL(process.env.AUTH_JWKS_URL!));
    const { payload } = await jwtVerify(
      token,
      jwks,
      {
        issuer: process.env.AUTH_ISSUER,
        audience: process.env.AUTH_AUDIENCE || "authenticated",
        algorithms: ["RS256", "ES256"],
        requiredClaims: ["sub", "exp"],
      },
    );
    const { rows } = await pool.query(
      "SELECT id,name,email,role,capacity,must_change_password FROM staff WHERE id=$1 AND active",
      [payload.sub],
    );
    if (!rows[0]) throw Error();
    return rows[0] as { id: string; name: string; email: string; role: Role; capacity: number; must_change_password: boolean };
  } catch {
    throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  }
}
export function write(role: Role) {
  if (role === "viewer")
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
}
