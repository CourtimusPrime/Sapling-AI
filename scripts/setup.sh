#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✓${NC} $*"; }
skip() { echo -e "${YELLOW}–${NC} $* (already done)"; }

echo "Setting up sapling..."
echo

# 1. Install dependencies
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  deno install
  ok "Dependencies installed"
else
  skip "Dependencies"
fi

# 2. Generate migrations
if [ ! -d "db/migrations" ] || [ -z "$(ls -A db/migrations 2>/dev/null)" ]; then
  echo "Generating database migrations..."
  deno task db:generate
  ok "Migrations generated"
else
  skip "Migrations"
fi

# 3. Run migrations
if [ ! -f "sapling.db" ]; then
  echo "Running database migrations..."
  deno task db:migrate
  ok "Database migrated"
else
  skip "Database"
fi

# 4. Create .env
if [ ! -f ".env" ]; then
  echo "Creating .env with generated secrets..."
  JWT_SECRET=$(openssl rand -hex 32)
  ENCRYPTION_KEY=$(openssl rand -hex 16)  # 16 bytes = 32 hex chars
  cat > .env <<EOF
# Required for JWT signing
JWT_SECRET=${JWT_SECRET}

# Required for API key encryption at rest (must be exactly 32 characters)
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# Optional: Turso credentials (only needed for deployed environments)
# TURSO_DATABASE_URL=libsql://...
# TURSO_AUTH_TOKEN=
EOF
  ok ".env created with generated secrets"
else
  skip ".env"
fi

echo
echo "Setup complete. Run 'deno task dev' to start the dev server."
