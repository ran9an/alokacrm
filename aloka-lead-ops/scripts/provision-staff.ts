import "dotenv/config";
import { pool } from "../apps/api/src/db.js";
import { hashPassword } from "../apps/api/src/auth.js";

const accounts = [
  { name: "Aloka Administrator", email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD, role: "admin", capacity: 1000 },
  { name: "Priya", email: process.env.PRIYA_EMAIL, password: process.env.PRIYA_PASSWORD, role: "sales", capacity: 100 },
] as const;

try {
  for (const account of accounts) {
    if (!account.email || !account.password) throw new Error(`Missing credentials for ${account.name}`);
    if (account.password.length < 12) throw new Error(`${account.name} password must be at least 12 characters`);
    const email = account.email.trim().toLowerCase();
    const passwordHash = await hashPassword(account.password);
    await pool.query(
      `INSERT INTO staff(id,name,email,password_hash,role,capacity,active)
       VALUES(gen_random_uuid(),$1,$2,$3,$4,$5,true)
       ON CONFLICT(email) DO UPDATE SET name=excluded.name,password_hash=excluded.password_hash,role=excluded.role,capacity=excluded.capacity,active=true`,
      [account.name, email, passwordHash, account.role, account.capacity],
    );
    console.log(`Provisioned ${account.role}: ${email}`);
  }
} finally {
  await pool.end();
}
