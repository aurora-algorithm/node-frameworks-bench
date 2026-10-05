// Express 5 + zod, with Express's per-response extras switched off. Run: node apps/express-tuned.mjs
import express from "express";
import { NewUser, pageQuery, pool, randomStart, users } from "./shared.mjs";

const app = express();
app.set("etag", false); // no hash of every response body
app.disable("x-powered-by");
app.use(express.json());

app.get("/users", (req, res) => res.json(users()));

app.post("/users", (req, res) => {
  const parsed = NewUser.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.issues);
  }
  res.status(201).json({ id: 1, ...parsed.data });
});

app.get("/users-db", async (req, res) => {
  const { rows } = await pool.query(pageQuery, [randomStart()]);
  res.json(rows);
});

app.listen(8105);
