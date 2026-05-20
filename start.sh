#!/bin/bash
set -e
BLUE='\033[0;34m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
echo -e "${BLUE}== Local-First Agent Console ==${NC}"
if [ -f .env ]; then export $(grep -v '^#' .env | xargs); fi
BACKEND_PORT=${BACKEND_PORT:-4051}
FRONTEND_PORT=${FRONTEND_PORT:-4050}
DB_NAME=${DB_NAME:-local_first_agent}
DB_USER=${DB_USER:-postgres}
echo -e "${YELLOW}Cleaning ports...${NC}"
lsof -ti:$BACKEND_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:$FRONTEND_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
echo -e "${YELLOW}Checking PostgreSQL...${NC}"
if ! pg_isready -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} > /dev/null 2>&1; then
  if [[ "$OSTYPE" == "darwin"* ]]; then
    brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
    sleep 2
  fi
fi
echo -e "${GREEN}✓ Postgres ok${NC}"
psql -h ${DB_HOST:-localhost} -U $DB_USER -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null | grep -q 1 || \
  createdb -h ${DB_HOST:-localhost} -U $DB_USER $DB_NAME 2>/dev/null || true
echo -e "${GREEN}✓ DB ready ($DB_NAME)${NC}"
cd backend && [ -d node_modules ] || npm install --silent 2>&1 | tail -3
cd ..
cd frontend && [ -d node_modules ] || npm install --silent 2>&1 | tail -3
cd ..
(cd backend && node seed/seed.js) || true
echo -e "${GREEN}✓ Seeded${NC}"
echo -e "${BLUE}Backend on $BACKEND_PORT, Frontend on $FRONTEND_PORT${NC}"
(cd backend && npx --yes nodemon server.js) &
BACKEND_PID=$!
sleep 2
(cd frontend && BROWSER=none PORT=$FRONTEND_PORT npm start) &
FRONTEND_PID=$!
cleanup() {
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  lsof -ti:$BACKEND_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
  lsof -ti:$FRONTEND_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM
wait
