#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
#  Sanchay — Local Development Startup Script
# ──────────────────────────────────────────────────────────────────────────────
#  Boots the ENTIRE platform with one command:
#    1. Hyperledger Fabric network (peers, orderer, CAs, CouchDB)
#    2. Channel creation + chaincode deployment
#    3. Wallet identity enrollment (admin bootstrap)
#    4. Dockerized API + Frontend
#
#  Usage:
#    chmod +x start-local.sh
#    ./start-local.sh                # Full startup (Fabric + Docker)
#    ./start-local.sh --skip-fabric  # Skip Fabric, just rebuild containers
#
#  Prerequisites:
#    - Docker & Docker Compose installed
#    - Fabric binaries (peer, orderer, etc.) in PATH or fabric-samples/bin
#    - Node.js 18+ installed (for enrollment scripts)
#    - server-node-sdk/.env configured (see .env.local.example)
# ──────────────────────────────────────────────────────────────────────────────

set -e

# ─── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ─── Helpers ──────────────────────────────────────────────────────────────────
info()    { echo -e "${BLUE}ℹ ${NC}${1}"; }
success() { echo -e "${GREEN}✔ ${NC}${1}"; }
warn()    { echo -e "${YELLOW}⚠ ${NC}${1}"; }
error()   { echo -e "${RED}✖ ${NC}${1}"; }
header()  { echo -e "\n${PURPLE}${BOLD}═══════════════════════════════════════════════════════════════${NC}"; echo -e "${PURPLE}${BOLD}  $1${NC}"; echo -e "${PURPLE}${BOLD}═══════════════════════════════════════════════════════════════${NC}\n"; }
step()    { echo -e "${CYAN}→ ${BOLD}$1${NC}"; }

# ─── Flags ────────────────────────────────────────────────────────────────────
SKIP_FABRIC=false
for arg in "$@"; do
    case $arg in
        --skip-fabric) SKIP_FABRIC=true ;;
    esac
done

# ─── Root directory ───────────────────────────────────────────────────────────
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FABRIC_DIR="${PROJECT_ROOT}/fabric-samples/test-network"
BACKEND_DIR="${PROJECT_ROOT}/server-node-sdk"
CHAINCODE_PATH="../asset-transfer-basic/chaincode-javascript/"

# ──────────────────────────────────────────────────────────────────────────────
#  STARTUP
# ──────────────────────────────────────────────────────────────────────────────

echo ""
echo -e "${PURPLE}${BOLD}"
echo "  ███████╗ █████╗ ███╗   ██╗ ██████╗██╗  ██╗ █████╗ ██╗   ██╗"
echo "  ██╔════╝██╔══██╗████╗  ██║██╔════╝██║  ██║██╔══██╗╚██╗ ██╔╝"
echo "  ███████╗███████║██╔██╗ ██║██║     ███████║███████║ ╚████╔╝ "
echo "  ╚════██║██╔══██║██║╚██╗██║██║     ██╔══██║██╔══██║  ╚██╔╝  "
echo "  ███████║██║  ██║██║ ╚████║╚██████╗██║  ██║██║  ██║   ██║   "
echo "  ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   "
echo -e "${NC}"
echo -e "${BOLD}  Blockchain Healthcare Platform — Local Startup${NC}"
echo ""

if [ "$SKIP_FABRIC" = true ]; then
    warn "Skipping Fabric (--skip-fabric flag). Assuming network is already running."
    echo ""
fi

START_TIME=$(date +%s)

if [ "$SKIP_FABRIC" = false ]; then

# ══════════════════════════════════════════════════════════════════════════════
#  PHASE 1: FABRIC NETWORK
# ══════════════════════════════════════════════════════════════════════════════
header "PHASE 1 — Starting Hyperledger Fabric Network"

step "Navigating to test-network..."
cd "${FABRIC_DIR}"

# Bring down any existing network first (clean state)
step "Cleaning up any previous network..."
./network.sh down 2>/dev/null || true
success "Previous network cleaned"

# ── Critical: Clear stale wallet identities ──────────────────────────────────
# network.sh down destroys all Fabric CAs. Old wallet identities were signed
# by those CAs, so they're now cryptographically invalid. The new network will
# have new CAs, and we MUST re-enroll fresh identities.
step "Clearing stale wallet identities (old CA certs are now invalid)..."
if [ -d "${BACKEND_DIR}/wallet" ]; then
    rm -rf "${BACKEND_DIR}/wallet"
    success "Old wallet cleared"
else
    success "No existing wallet to clear"
fi

# Also clear SQLite databases (user records reference old identities)
if [ -d "${BACKEND_DIR}/db" ]; then
    rm -f "${BACKEND_DIR}/db/"*.db "${BACKEND_DIR}/db/"*.db-wal "${BACKEND_DIR}/db/"*.db-shm
    success "Old database cleared (source code preserved)"
fi

step "Starting Fabric network with CA + CouchDB..."
./network.sh up createChannel -ca -s couchdb

if [ $? -eq 0 ]; then
    success "Fabric network started + channel created"
else
    error "Fabric network startup failed!"
    exit 1
fi

# ══════════════════════════════════════════════════════════════════════════════
#  PHASE 2: DEPLOY CHAINCODE
# ══════════════════════════════════════════════════════════════════════════════
header "PHASE 2 — Deploying ehrChainCode"

step "Deploying chaincode to channel..."
./network.sh deployCC \
    -ccn ehrChainCode \
    -ccp "${CHAINCODE_PATH}" \
    -ccl javascript

if [ $? -eq 0 ]; then
    success "Chaincode deployed successfully"
else
    error "Chaincode deployment failed!"
    exit 1
fi

# ══════════════════════════════════════════════════════════════════════════════
#  PHASE 3: INSTALL BACKEND DEPENDENCIES
# ══════════════════════════════════════════════════════════════════════════════
header "PHASE 3 — Installing Backend Dependencies"

cd "${BACKEND_DIR}"

if [ ! -d "node_modules" ]; then
    step "Installing npm dependencies..."
    npm ci
    success "Dependencies installed"
else
    success "Dependencies already installed — skipping"
fi

# ══════════════════════════════════════════════════════════════════════════════
#  PHASE 4: ENROLL WALLET IDENTITIES
# ══════════════════════════════════════════════════════════════════════════════
header "PHASE 4 — Enrolling Fabric Wallet Identities"

info "Running enrollment scripts in dependency order..."
info "(These use asLocalhost=true and must run on the host, not in Docker)"
echo ""

# The admin bootstrap handles all enrollments automatically.
step "1/2  Enrolling CA admins (hospitalAdmin, insuranceAdmin)..."
step "2/2  Registering operational identities (Hospital01, insuranceCompany01)..."

# Run a quick bootstrap-only script
node -e "
    require('dotenv').config();
    const { bootstrapAdmins } = require('./services/adminBootstrap');
    bootstrapAdmins()
        .then(() => { console.log('[Bootstrap] All identities enrolled.'); process.exit(0); })
        .catch((err) => { console.error('[Bootstrap] Failed:', err.message); process.exit(1); });
"

if [ $? -eq 0 ]; then
    success "All wallet identities enrolled"
else
    error "Identity enrollment failed!"
    warn "Check that the Fabric network is running and CAs are accessible."
    exit 1
fi

# Show wallet contents
echo ""
info "Wallet contents:"
ls -la wallet/ 2>/dev/null || warn "Wallet directory not found"
echo ""

fi  # end SKIP_FABRIC

# ══════════════════════════════════════════════════════════════════════════════
#  PHASE 5: DOCKER COMPOSE (API + FRONTEND)
# ══════════════════════════════════════════════════════════════════════════════
header "PHASE 5 — Starting Docker Containers"

cd "${PROJECT_ROOT}"

# Validate docker-compose.yml before starting
step "Validating docker-compose.yml..."
if docker compose config --quiet 2>/dev/null; then
    success "Docker Compose config valid"
else
    error "docker-compose.yml has errors!"
    docker compose config 2>&1 | head -20
    exit 1
fi

# Verify fabric_test network exists
step "Checking fabric_test Docker network..."
if docker network inspect fabric_test >/dev/null 2>&1; then
    success "fabric_test network exists"
else
    error "fabric_test network not found!"
    warn "Start Fabric first: cd fabric-samples/test-network && ./network.sh up createChannel -ca -s couchdb"
    exit 1
fi

step "Building and starting API + Frontend containers..."
docker compose up -d --build

if [ $? -eq 0 ]; then
    success "Docker containers started"
else
    error "Docker compose failed!"
    docker compose logs --tail=30
    exit 1
fi

# Wait for health check
step "Waiting for API health check..."
RETRIES=0
MAX_RETRIES=60
until docker inspect --format='{{.State.Health.Status}}' sanchay-api 2>/dev/null | grep -q "healthy"; do
    RETRIES=$((RETRIES + 1))
    if [ $RETRIES -ge $MAX_RETRIES ]; then
        warn "API health check timed out (${MAX_RETRIES}s)"
        echo ""
        warn "API container logs (last 30 lines):"
        docker compose logs --tail=30 api
        break
    fi
    sleep 1
done

if docker inspect --format='{{.State.Health.Status}}' sanchay-api 2>/dev/null | grep -q "healthy"; then
    success "API is healthy"
fi

# Check frontend
step "Checking frontend container..."
if docker inspect --format='{{.State.Status}}' sanchay-frontend 2>/dev/null | grep -q "running"; then
    success "Frontend is running"
else
    warn "Frontend container not running yet"
    docker compose logs --tail=15 frontend
fi

# ══════════════════════════════════════════════════════════════════════════════
#  SUMMARY
# ══════════════════════════════════════════════════════════════════════════════
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo ""
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  ✔ SANCHAY PLATFORM STARTED SUCCESSFULLY${NC}"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BOLD}Frontend:${NC}    http://localhost:5173"
echo -e "  ${BOLD}Backend:${NC}     http://localhost:5000"
echo -e "  ${BOLD}Health:${NC}      http://localhost:5000/status"
echo ""
echo -e "  ${BOLD}Fabric:${NC}      Peers + Orderer + CAs + CouchDB"
echo -e "  ${BOLD}Channel:${NC}     mychannel"
echo -e "  ${BOLD}Chaincode:${NC}   ehrChainCode"
echo ""
echo -e "  ${BOLD}Time:${NC}        ${ELAPSED}s"
echo ""
echo -e "  ${CYAN}Docker status:${NC}"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || docker compose ps
echo ""
echo -e "  ${YELLOW}To stop:${NC}     docker compose down"
echo -e "  ${YELLOW}Full reset:${NC}  ./stop-local.sh"
echo -e "  ${YELLOW}Rebuild only:${NC} ./start-local.sh --skip-fabric"
echo ""
