#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
cd "$APP_DIR"

echo "==> Atualizando código"
git pull --ff-only

echo "==> Construindo e iniciando PostgreSQL, API e Caddy"
docker compose -f "$COMPOSE_FILE" up -d --build

echo "==> Aguardando API ficar saudável"
for attempt in $(seq 1 30); do
  status="$(docker compose -f "$COMPOSE_FILE" ps -q api | xargs -r docker inspect -f '{{.State.Health.Status}}' 2>/dev/null || true)"
  if [[ "$status" == "healthy" ]]; then
    break
  fi
  if [[ "$attempt" == "30" ]]; then
    echo "API não ficou saudável a tempo." >&2
    docker compose -f "$COMPOSE_FILE" logs --tail=120 api >&2
    exit 1
  fi
  sleep 5
done

echo "==> Aplicando migrações Prisma"
docker compose -f "$COMPOSE_FILE" exec -T api npx prisma migrate deploy

echo "==> Status final"
docker compose -f "$COMPOSE_FILE" ps
