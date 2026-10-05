// Hono 4 on Node (@hono/node-server) + zod validator. Run: node apps/hono.mjs
import { serve } from "@hono/node-server";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { NewUser, pageQuery, pool, randomStart, users } from "./shared.mjs";

const app = new Hono();

app.get("/users", (c) => c.json(users()));

app.post("/users", zValidator("json", NewUser), (c) =>
  c.json({ id: 1, ...c.req.valid("json") }, 201),
);

app.get("/users-db", async (c) => {
  const { rows } = await pool.query(pageQuery, [randomStart()]);
  return c.json(rows);
});

serve({ fetch: app.fetch, port: 8103 });
