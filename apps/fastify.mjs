// Fastify 5 with JSON-schema validation and response schemas. Run: node apps/fastify.mjs
import Fastify from "fastify";
import { pageQuery, pool, randomStart, users } from "./shared.mjs";

const user = {
  type: "object",
  properties: {
    id: { type: "integer" }, name: { type: "string" },
    email: { type: "string" }, active: { type: "boolean" },
    tags: { type: "array", items: { type: "string" } },
  },
};
const newUser = {
  type: "object",
  required: ["name", "email", "age"],
  // Strip unknown fields, like zod and class-validator's whitelist do.
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1, maxLength: 50 },
    email: { type: "string", format: "email" },
    age: { type: "integer", minimum: 0, maximum: 150 },
  },
};
const list = { 200: { type: "array", items: user } };

const app = Fastify();

app.get("/users", { schema: { response: list } }, async () => users());

app.post(
  "/users",
  { schema: { body: newUser } },
  async (req, reply) =>
    reply.code(201).send({ id: 1, ...req.body }),
);

app.get("/users-db", { schema: { response: list } }, async () => {
  const { rows } = await pool.query(pageQuery, [randomStart()]);
  return rows;
});

await app.listen({ port: 8102 });
