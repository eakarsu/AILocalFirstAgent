#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"
API_DIR="backend"
UI_DIR="frontend"
MIGRATION="backend/migrations/001_governed_workflows.sql"

check() {
  command -v node >/dev/null || { echo "node is required" >&2; return 1; }
  command -v npm >/dev/null || { echo "npm is required" >&2; return 1; }
  [[ -f .env ]] || { echo "Create .env from .env.example; defaults are not generated." >&2; return 1; }
  grep -Eq '^JWT_SECRET=.{32,}$' .env || { echo "JWT_SECRET must contain at least 32 characters." >&2; return 1; }
  grep -Eq '^GOVERNANCE_TENANT_ID=[A-Za-z0-9][A-Za-z0-9._:-]+$' .env ||
    { echo "GOVERNANCE_TENANT_ID is required for signed tenant claims." >&2; return 1; }
  grep -Eq '^DATABASE_URL=.+|^DB_HOST=.+' .env ||
    { echo "DATABASE_URL or explicit DB_* settings are required." >&2; return 1; }
  if grep -Eqi 'password123|secure123|your_.*key|change[_-]?me|placeholder' .env; then
    echo "Refusing placeholder or demo credentials." >&2
    return 1
  fi
  echo "Configuration shape is valid; credentials and connectivity were not verified."
}

migrate() {
  check
  [[ "${ALLOW_SCHEMA_MIGRATION:-false}" == "true" ]] ||
    { echo "Set ALLOW_SCHEMA_MIGRATION=true for this explicit operation." >&2; return 1; }
  : "${DATABASE_URL:?Export DATABASE_URL for the migration process.}"
  command -v psql >/dev/null || { echo "psql is required" >&2; return 1; }
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$MIGRATION"
}

start_services() {
  check
  [[ -d "$API_DIR/node_modules" ]] ||
    { echo "Backend dependencies are absent; run reviewed locked installs separately." >&2; return 1; }

  if [[ "${NODE_ENV:-}" == "test" ]]; then
    exec npm --prefix "$API_DIR" start
  fi

  [[ -d "$UI_DIR/node_modules" ]] ||
    { echo "Frontend dependencies are absent; run reviewed locked installs separately." >&2; return 1; }

  frontend_port="${FRONTEND_PORT:-${CLIENT_PORT:-4050}}"
  allowed_origins="${ALLOWED_ORIGINS:-}"
  if [[ "${NODE_ENV:-development}" != "production" ]]; then
    allowed_origins="${allowed_origins:-http://127.0.0.1:$frontend_port}"
  fi

  ALLOWED_ORIGINS="$allowed_origins" npm --prefix "$API_DIR" start &
  api_pid=$!
  if node -e "const p=require('./$UI_DIR/package.json');process.exit(p.scripts&&p.scripts.dev?0:1)"; then
    PORT="$frontend_port" REACT_APP_API_URL="${REACT_APP_API_URL:-http://127.0.0.1:${BACKEND_PORT:-4051}/api}" npm --prefix "$UI_DIR" run dev &
  else
    BROWSER=none PORT="$frontend_port" REACT_APP_API_URL="${REACT_APP_API_URL:-http://127.0.0.1:${BACKEND_PORT:-4051}/api}" npm --prefix "$UI_DIR" start &
  fi
  ui_pid=$!

  cleanup() {
    kill "$api_pid" "$ui_pid" 2>/dev/null || true
    wait "$api_pid" "$ui_pid" 2>/dev/null || true
  }
  trap cleanup EXIT INT TERM
  wait "$api_pid" "$ui_pid"
}

case "${1:-check}" in
  check) check ;;
  migrate) migrate ;;
  start) start_services ;;
  *) echo "Usage: ./start.sh [check|migrate|start]" >&2; exit 64 ;;
esac
