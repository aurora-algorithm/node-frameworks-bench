// Shared by every framework: the same payload, the same validation rules, the same Postgres driver and query.
import process from "node:process";
import pg from "pg";
import { z } from "zod";

const tags = ["a", "b"];

export function users() {
  const list = [];
  for (let i = 0; i < 50; i++) {
    list.push({
      id: i, name: "User", email: "user@example.com",
      active: i % 2 === 0, tags,
    });
  }
  return list;
}

// POST /users body: what each framework validates, in its own idiomatic way.
export const NewUser = z.object({
  name: z.string().min(1).max(50),
  email: z.email(),
  age: z.number().int().min(0).max(150),
});

const POOL_SIZE = 20;
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: POOL_SIZE,
});
export const pageQuery =
  "SELECT id, name, email, active, tags FROM users " +
  "WHERE id > $1 ORDER BY id LIMIT 50";
export const randomStart = () => Math.floor(Math.random() * 9950);

// Open every connection up front, so no run pays for connecting.
await Promise.all(
  Array.from({ length: POOL_SIZE }, () => pool.query("SELECT 1")),
);
