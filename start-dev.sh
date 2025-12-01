#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

LOG_DIR="$SCRIPT_DIR/logs"
mkdir -p "$LOG_DIR"

echo "🚀 Starting HealthChain Development Environment"
echo "=============================================="

if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed. Please install Node.js 18+ first."
  exit 1
fi
NODE_MAJOR=$(node -v | sed -E 's/v([0-9]+).*/\1/')
if [ "${NODE_MAJOR:-0}" -lt 18 ]; then
  echo "❌ Node.js >= 18 is required. Found $(node -v)."
  exit 1
fi

for cmd in npm npx; do
  if ! command -v "$cmd" &> /dev/null; then
    echo "❌ $cmd is not installed. Please install it."
    exit 1
  fi
done

echo "✅ Node.js and npm/npx are available"

echo "📦 Installing dependencies..."
if [ ! -d "node_modules" ]; then
  npm ci
fi
if [ ! -d "backend/node_modules" ]; then
  npm --prefix backend ci || npm --prefix backend install
fi
if [ ! -d "frontend/node_modules" ]; then
  npm --prefix frontend ci || npm --prefix frontend install
fi
echo "✅ Dependencies installed"

declare -a PIDS=()

cleanup() {
  echo ""
  echo "🛑 Stopping all services..."
  if [ "${#PIDS[@]}" -gt 0 ]; then
    for pid in "${PIDS[@]}"; do
      if kill -0 "$pid" &> /dev/null; then
        kill "$pid" || true
      fi
    done
    wait || true
  fi
  exit 0
}
trap cleanup INT TERM EXIT

echo "⛓️  Starting Hardhat blockchain node..."
npx hardhat node > "$LOG_DIR/hardhat.log" 2>&1 &
PIDS+=("$!")
last_index=$(( ${#PIDS[@]} - 1 ))
echo "   • Hardhat PID: ${PIDS[$last_index]}"

echo -n "🔎 Waiting for blockchain RPC on port 8545..."
for i in {1..30}; do
  if curl --silent --max-time 1 http://127.0.0.1:8545 >/dev/null 2>&1; then
    echo " ready"
    break
  fi
  sleep 1
  echo -n "."
  if [ "$i" -eq 30 ]; then
    echo ""
    echo "❌ Timeout waiting for blockchain RPC."
    cleanup
  fi
done

echo "📄 Deploying smart contracts..."
npx hardhat run scripts/deploy_with_marketplace.js --network localhost >> "$LOG_DIR/deploy.log" 2>&1 || {
  echo "❌ Contract deployment failed. See $LOG_DIR/deploy.log"
  cleanup
}
echo "✅ Smart contracts deployed"


echo "🔧 Starting backend API server..."
npm --prefix backend run dev > "$LOG_DIR/backend.log" 2>&1 &
PIDS+=("$!")

last_index=$(( ${#PIDS[@]} - 1 ))
BACKEND_PID=${PIDS[$last_index]}


echo -n "🔎 Waiting for backend on port 3001..."
for i in {1..20}; do
  if curl --silent --max-time 1 http://127.0.0.1:3001 >/dev/null 2>&1; then
    echo " ready"
    break
  fi
  sleep 1
  echo -n "."
  if [ "$i" -eq 20 ]; then
    echo ""
    echo "❌ Timeout waiting for backend."
    cleanup
  fi
done

echo "🌐 Starting frontend development server..."
npm --prefix frontend run dev > "$LOG_DIR/frontend.log" 2>&1 &
PIDS+=("$!")

echo ""
echo "🎉 HealthChain development environment is ready!"
echo ""
echo "📋 Services running:"
echo "   • Blockchain: http://127.0.0.1:8545"
echo "   • Backend API: http://127.0.0.1:3001"
echo "   • Frontend: http://127.0.0.1:5173"
echo ""
echo "🔧 Setup MetaMask:"
echo "   • Network: Hardhat Localhost"
echo "   • RPC URL: http://127.0.0.1:8545"
echo "   • Chain ID: 31337"
echo ""
echo "💡 To stop all services, press Ctrl+C"
echo ""

wait
