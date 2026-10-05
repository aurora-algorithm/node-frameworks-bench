# node-frameworks-bench

Code and per-run results behind the "Is Express slow?" Short: Express, Fastify, Hono and NestJS on Node 24.

## What is measured
- **Test 1 — plain JSON:** `GET /users` returns the same 50 users (4,116 bytes, identical across all four).
- **Test 2 — validated input:** `POST /users` with `{"name","email","age"}`; each framework validates it its own way
  (Express + zod, Fastify + JSON schema, Hono + `@hono/zod-validator`, NestJS + class-validator) and replies 201 with
  the same 56-byte body. Invalid input gets 400 everywhere (checked).
- **Test 3 — Postgres:** `GET /users-db` reads 50 rows from a random start in a 10,000-row table (`schema.sql`) with
  node-postgres (`pg`), the same query and a 20-connection pool opened at startup.
- Per run: requests/second (per 0.5 s), latency percentiles, peak memory (RSS) of the Node process.

## Results (median of 5 runs)
| Test | Framework | req/s (median) | slowest–fastest run | typical (p50) | slowest 1% (p99) | peak memory |
|---|---|---|---|---|---|---|
| Plain JSON | Express 5 | 23,190 | 22,396–23,447 | 2.69 ms | 5.36 ms | 135.0 MiB |
| Plain JSON | Express 5, ETag + X-Powered-By off | 25,926 | 24,900–26,154 | 2.42 ms | 4.86 ms | 139.7 MiB |
| Plain JSON | Fastify 5 | 27,173 | 27,026–27,330 | 2.29 ms | 4.59 ms | 161.7 MiB |
| Plain JSON | Hono 4 | 34,535 | 33,272–34,850 | 1.79 ms | 3.58 ms | 124.6 MiB |
| Plain JSON | NestJS 12 | 25,093 | 24,514–25,195 | 2.48 ms | 4.94 ms | 192.5 MiB |
| Validated POST | Express 5 | 26,775 | 26,726–29,253 | 2.28 ms | 4.63 ms | 147.4 MiB |
| Validated POST | Express 5, ETag + X-Powered-By off | 29,998 | 29,857–30,235 | 2.05 ms | 4.07 ms | 142.6 MiB |
| Validated POST | Fastify 5 | 38,638 | 38,300–39,079 | 1.59 ms | 3.22 ms | 129.9 MiB |
| Validated POST | Hono 4 | 40,146 | 39,014–40,509 | 1.53 ms | 3.11 ms | 128.9 MiB |
| Validated POST | NestJS 12 | 22,245 | 21,810–22,429 | 2.83 ms | 5.63 ms | 179.3 MiB |
| Postgres | Express 5 | 10,308 | 10,129–10,425 | 6.19 ms | 7.4 ms | 204.3 MiB |
| Postgres | Express 5, ETag + X-Powered-By off | 10,817 | 9,869–10,936 | 5.88 ms | 6.89 ms | 214.9 MiB |
| Postgres | Fastify 5 | 10,865 | 10,204–11,609 | 5.86 ms | 6.76 ms | 223.8 MiB |
| Postgres | Hono 4 | 12,221 | 11,185–12,284 | 5.21 ms | 6.01 ms | 214.4 MiB |
| Postgres | NestJS 12 | 10,453 | 9,733–10,649 | 6.06 ms | 7.28 ms | 246.7 MiB |

Versions: node 24.21.0 · express 5.2.1 · fastify 5.12.5 · hono 4.13.13 · @hono/node-server 2.1.3 · @nestjs/core 12.1.2 · zod 4.6.5 · class-validator 0.15.1 · pg 8.23.1 · oha 1.16.0 · postgres 17.11. Raw per-run files are in `results/`.

## Method
- Apple M1 Pro (10 cores, 16 GB), macOS. One Node 24 process per framework (Node's default).
- oha with 64 connections: 10 s warm-up, then 20 s measured; 5 runs per configuration, alternating; median reported.
- A run only starts when other processes use under 170% CPU (summed), and is redone (up to 8 times) if they averaged
  over 190% during it (`run_all.sh`). A first pass with a looser limit (280%) let background load reorder the Postgres
  results (Express ~10.1k req/s at 140% background, ~8.9k at 250%), so everything was re-measured in one session.
- Every configuration, including the tuned Express, was measured in the same session, alternating.

## Caveats
- Express (and NestJS on Express) computes an ETag for every response by default; Fastify and Hono don't.
  `apps/express-tuned.mjs` turns off ETag and the X-Powered-By header: +12% on plain JSON.
- NestJS (on the same Express 5.2.1) beats plain Express by 8% on plain JSON with byte-identical responses, headers
  included. In a quick 15 s A/B, moving `express.json()` to the POST route only didn't consistently close it (23.5k, 23.5k,
  25.7k req/s vs NestJS ~25.0k). The cause isn't identified; PRs welcome.
- Fastify gets response schemas (its built-in fast serializer), as its docs recommend.
- NestJS runs on its default Express platform; NestJS on the Fastify adapter isn't tested.
- Hono runs on Node through `@hono/node-server`; it is also built for Bun, Deno and edge runtimes.
- The load tool, the server and Postgres share one laptop. Compare the gaps, not the absolute numbers.

## Run it
```bash
psql -c 'CREATE DATABASE bench' && psql bench -f schema.sql
NODE_BIN=$(which node) ./run_all.sh          # 1–3 hours, depending on how quiet the machine is; RESUME=1 continues an interrupted run
python3 export_charts.py summary.json charts.json
```
