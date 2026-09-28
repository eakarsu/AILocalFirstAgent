#!/usr/bin/env bash
set -euo pipefail

# Local demo credential bridge (managed by tools/fix_demo_autofill.mjs)
demo_credentials_project_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
if [ -f "$demo_credentials_project_dir/.env" ]; then
  while IFS= read -r demo_credentials_line || [ -n "$demo_credentials_line" ]; do
    case "$demo_credentials_line" in ''|'#'*) continue ;; esac
    demo_credentials_line="${demo_credentials_line#export }"
    demo_credentials_key="${demo_credentials_line%%=*}"
    demo_credentials_value="${demo_credentials_line#*=}"
    case "$demo_credentials_key" in
      NODE_ENV|ENABLE_DEMO_CREDENTIAL_AUTOFILL|DEMO_EMAIL|DEMO_PASSWORD|SEED_ADMIN_EMAIL|SEED_ADMIN_PASSWORD|SEED_USER_EMAIL|SEED_USER_PASSWORD|PROVISION_ADMIN_EMAIL|PROVISION_ADMIN_PASSWORD|BOOTSTRAP_ADMIN_EMAIL|BOOTSTRAP_ADMIN_PASSWORD|ADMIN_EMAIL|ADMIN_PASSWORD|DEFAULT_EMAIL|DEFAULT_PASSWORD|DEMO_TENANT|BOOTSTRAP_TENANT_SLUG|GOVERNANCE_TENANT_ID|TENANT_ID) ;;
      *) continue ;;
    esac
    [ -n "${!demo_credentials_key+x}" ] && continue
    demo_credentials_first="${demo_credentials_value:0:1}"
    demo_credentials_last="${demo_credentials_value: -1}"
    if { [ "$demo_credentials_first" = '"' ] && [ "$demo_credentials_last" = '"' ]; } || { [ "$demo_credentials_first" = "'" ] && [ "$demo_credentials_last" = "'" ]; }; then
      demo_credentials_value="${demo_credentials_value:1:${#demo_credentials_value}-2}"
    fi
    export "$demo_credentials_key=$demo_credentials_value"
  done < "$demo_credentials_project_dir/.env"
fi
demo_credentials_email=""
demo_credentials_password=""
demo_credentials_tenant="${DEMO_TENANT:-${BOOTSTRAP_TENANT_SLUG:-${GOVERNANCE_TENANT_ID:-${TENANT_ID:-}}}}"
demo_credentials_tenant="${DEMO_TENANT:-${BOOTSTRAP_TENANT_SLUG:-${GOVERNANCE_TENANT_ID:-${TENANT_ID:-}}}}"
demo_credentials_tenant="${DEMO_TENANT:-${BOOTSTRAP_TENANT_SLUG:-${GOVERNANCE_TENANT_ID:-${TENANT_ID:-}}}}"
if [ -n "${PROVISION_ADMIN_EMAIL:-}" ] && [ -n "${PROVISION_ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$PROVISION_ADMIN_EMAIL"
  demo_credentials_password="$PROVISION_ADMIN_PASSWORD"
elif [ -n "${BOOTSTRAP_ADMIN_EMAIL:-}" ] && [ -n "${BOOTSTRAP_ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$BOOTSTRAP_ADMIN_EMAIL"
  demo_credentials_password="$BOOTSTRAP_ADMIN_PASSWORD"
elif [ -n "${SEED_ADMIN_EMAIL:-}" ] && [ -n "${SEED_ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$SEED_ADMIN_EMAIL"
  demo_credentials_password="$SEED_ADMIN_PASSWORD"
elif [ -n "${SEED_USER_EMAIL:-}" ] && [ -n "${SEED_USER_PASSWORD:-}" ]; then
  demo_credentials_email="$SEED_USER_EMAIL"
  demo_credentials_password="$SEED_USER_PASSWORD"
elif [ -n "${DEMO_EMAIL:-}" ] && [ -n "${DEMO_PASSWORD:-}" ]; then
  demo_credentials_email="$DEMO_EMAIL"
  demo_credentials_password="$DEMO_PASSWORD"
elif [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$ADMIN_EMAIL"
  demo_credentials_password="$ADMIN_PASSWORD"
elif [ -n "${DEFAULT_EMAIL:-}" ] && [ -n "${DEFAULT_PASSWORD:-}" ]; then
  demo_credentials_email="$DEFAULT_EMAIL"
  demo_credentials_password="$DEFAULT_PASSWORD"
fi
if [ "${NODE_ENV:-development}" != production ] && [ "${ENABLE_DEMO_CREDENTIAL_AUTOFILL:-true}" = true ] && [ -n "$demo_credentials_email" ] && [ -n "$demo_credentials_password" ]; then
  export NEXT_PUBLIC_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export NEXT_PUBLIC_DEMO_EMAIL="$demo_credentials_email"
  export NEXT_PUBLIC_DEMO_PASSWORD="$demo_credentials_password"
  export VITE_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export VITE_DEMO_EMAIL="$demo_credentials_email"
  export VITE_DEMO_PASSWORD="$demo_credentials_password"
  export REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export REACT_APP_DEMO_EMAIL="$demo_credentials_email"
  export REACT_APP_DEMO_PASSWORD="$demo_credentials_password"
  if [ -n "$demo_credentials_tenant" ]; then
    export NEXT_PUBLIC_DEMO_TENANT="$demo_credentials_tenant"
    export VITE_DEMO_TENANT="$demo_credentials_tenant"
    export REACT_APP_DEMO_TENANT="$demo_credentials_tenant"
  else
    unset NEXT_PUBLIC_DEMO_TENANT VITE_DEMO_TENANT REACT_APP_DEMO_TENANT
  fi
else
  export NEXT_PUBLIC_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  export VITE_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  export REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  unset NEXT_PUBLIC_DEMO_EMAIL NEXT_PUBLIC_DEMO_PASSWORD NEXT_PUBLIC_DEMO_TENANT
  unset VITE_DEMO_EMAIL VITE_DEMO_PASSWORD VITE_DEMO_TENANT
  unset REACT_APP_DEMO_EMAIL REACT_APP_DEMO_PASSWORD REACT_APP_DEMO_TENANT
fi
unset demo_credentials_email demo_credentials_password demo_credentials_tenant demo_credentials_project_dir demo_credentials_line demo_credentials_key demo_credentials_value demo_credentials_first demo_credentials_last

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
  set -a
  # shellcheck disable=SC1091
  . "$PROJECT_DIR/.env"
  set +a
  [[ -d "$API_DIR/node_modules" ]] ||
    { echo "Backend dependencies are absent; run reviewed locked installs separately." >&2; return 1; }

  if [[ "${NODE_ENV:-}" == "test" ]]; then
    exec npm --prefix "$API_DIR" start
  fi

  [[ -d "$UI_DIR/node_modules" ]] ||
    { echo "Frontend dependencies are absent; run reviewed locked installs separately." >&2; return 1; }

  frontend_port="${FRONTEND_PORT:-${CLIENT_PORT:-4050}}"
  configured_api_url="${REACT_APP_API_URL:-http://127.0.0.1:${BACKEND_PORT:-4051}/api}"
  case "$configured_api_url" in
    */api) frontend_api_url="$configured_api_url" ;;
    *) frontend_api_url="${configured_api_url%/}/api" ;;
  esac
  allowed_origins="${ALLOWED_ORIGINS:-}"
  if [[ "${NODE_ENV:-development}" != "production" ]]; then
    allowed_origins="${allowed_origins:-http://127.0.0.1:$frontend_port}"
  fi

  ALLOWED_ORIGINS="$allowed_origins" npm --prefix "$API_DIR" start &
  api_pid=$!
  if node -e "const p=require('./$UI_DIR/package.json');process.exit(p.scripts&&p.scripts.dev?0:1)"; then
    PORT="$frontend_port" REACT_APP_API_URL="$frontend_api_url" npm --prefix "$UI_DIR" run dev &
  else
    BROWSER=none PORT="$frontend_port" REACT_APP_API_URL="$frontend_api_url" npm --prefix "$UI_DIR" start &
  fi
  ui_pid=$!

  cleanup() {
    kill "$api_pid" "$ui_pid" 2>/dev/null || true
    wait "$api_pid" "$ui_pid" 2>/dev/null || true
  }
  trap cleanup EXIT INT TERM
  wait "$api_pid" "$ui_pid"
}

case "${1:-start}" in
  check) check ;;
  migrate) migrate ;;
  start) start_services ;;
  *) echo "Usage: ./start.sh [check|migrate|start]" >&2; exit 64 ;;
esac
