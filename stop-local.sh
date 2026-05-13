#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
#  Sanchay — Local Development Shutdown Script
# ──────────────────────────────────────────────────────────────────────────────
#  Stops everything: Docker containers + Fabric network
#
#  Usage:
#    ./stop-local.sh          # Stop containers + Fabric
#    ./stop-local.sh --keep   # Stop containers, keep Fabric running
# ──────────────────────────────────────────────────────────────────────────────

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo -e "${CYAN}${BOLD}  Sanchay — Shutting down...${NC}"
echo ""

# Stop Docker containers
echo -e "${YELLOW}→${NC} Stopping Docker containers..."
cd "${PROJECT_ROOT}"
docker compose down 2>/dev/null || true
echo -e "${GREEN}✔${NC} Containers stopped"

# Stop Fabric (unless --keep flag)
if [ "$1" != "--keep" ]; then
    echo -e "${YELLOW}→${NC} Stopping Fabric network..."
    cd "${PROJECT_ROOT}/fabric-samples/test-network"
    ./network.sh down 2>/dev/null || true
    echo -e "${GREEN}✔${NC} Fabric network stopped"
else
    echo -e "${YELLOW}⚠${NC} Fabric network kept running (--keep flag)"
fi

echo ""
echo -e "${GREEN}${BOLD}  ✔ Sanchay platform stopped${NC}"
echo ""
