#!/bin/bash
# Full suite: 5 alternating runs of every configuration. Needs Postgres with the bench DB (see README).
# Every framework runs on Node in one process (one JavaScript thread), like a default deployment.
# On a shared laptop, each run waits for a quiet machine and is redone if background CPU was too high.
set -euo pipefail
export DATABASE_URL="${DATABASE_URL:-postgres://$USER@localhost:5432/bench}"
QUIET_PCT=170     # max background CPU (sum of %; this laptop idles around 100–200) before a run starts
DISTURBED_PCT=190 # a run averaging more background CPU than this is discarded and redone (Postgres runs swing ~15% above it)
ATTEMPTS=8
NODE_BIN="${NODE_BIN:-node}"

npm ci --silent && npm run build --silent
mkdir -p results
# RESUME=1 keeps finished runs (e.g. after an interruption) and only measures the missing ones.
[ "${RESUME:-0}" = 1 ] || rm -f results/*.json
{ echo "node $($NODE_BIN --version)"; node -e "for (const p of ['express','fastify','hono','@hono/node-server','@nestjs/core','zod','class-validator','pg']) console.log(p, require('./node_modules/'+p+'/package.json').version)"
  oha --version; psql "$DATABASE_URL" -tAc 'show server_version' | sed 's/^/postgres /'; } > results/versions.txt

EXPRESS="exec $NODE_BIN apps/express.mjs"
EXPRESS_TUNED="exec $NODE_BIN apps/express-tuned.mjs"
FASTIFY="exec $NODE_BIN apps/fastify.mjs"
HONO="exec $NODE_BIN apps/hono.mjs"
NEST="exec $NODE_BIN apps/nest/dist/main.js"

background_cpu() {
  ps -axo %cpu=,comm= | awk '/postgres|oha|awk|ps$|perl|python3/ { next } { s += $1 } END { printf "%.0f", s }'
}

wait_quiet() {
  local calm=0
  while [ "$calm" -lt 5 ]; do
    if [ "$(background_cpu)" -le "$QUIET_PCT" ]; then calm=$((calm + 1)); else calm=0; fi
    sleep 1
  done
}

measure() { # name command port path run [POST]
  local route=${4#/}; [ "${6:-GET}" = POST ] && route="$route-post"
  [ -f "results/$1_${route}_run$5.json" ] && return 0
  for attempt in $(seq 1 $ATTEMPTS); do
    wait_quiet
    ./load.sh "$1" "$2" "$3" "$4" "$5" "${6:-GET}"
    local bg; bg=$(python3 -c "import json;print(json.load(open('results/$1_${route}_mem_run$5.json'))['bg_cpu_pct'])")
    if [ "$bg" -le "$DISTURBED_PCT" ]; then return 0; fi
    echo "  $1 $4 run $5 disturbed (background ${bg}%), retry $attempt" >&2
  done
  echo "  $1 $4 run $5 kept despite background load" >&2
}

for run in 1 2 3 4 5; do
  measure express "$EXPRESS" 8101 /users "$run"
  measure express-tuned "$EXPRESS_TUNED" 8105 /users "$run"
  measure fastify "$FASTIFY" 8102 /users "$run"
  measure hono    "$HONO"    8103 /users "$run"
  measure nest    "$NEST"    8104 /users "$run"
  measure express "$EXPRESS" 8101 /users "$run" POST
  measure express-tuned "$EXPRESS_TUNED" 8105 /users "$run" POST
  measure fastify "$FASTIFY" 8102 /users "$run" POST
  measure hono    "$HONO"    8103 /users "$run" POST
  measure nest    "$NEST"    8104 /users "$run" POST
  measure express "$EXPRESS" 8101 /users-db "$run"
  measure express-tuned "$EXPRESS_TUNED" 8105 /users-db "$run"
  measure fastify "$FASTIFY" 8102 /users-db "$run"
  measure hono    "$HONO"    8103 /users-db "$run"
  measure nest    "$NEST"    8104 /users-db "$run"
  echo "run $run done"
done
