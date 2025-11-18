#!/bin/bash

echo "🚀 Starting HealthChain Development Environment"
echo "=============================================="

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# 安装依赖（如果尚未安装）
echo "📦 Installing dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
fi

if [ ! -d "backend/node_modules" ]; then
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    cd frontend && npm install && cd ..
fi

echo "✅ Dependencies installed"

# 启动区块链节点
echo "⛓️  Starting Hardhat blockchain node..."
cd /Users/edwardye/HealthChain
npx hardhat node &
BLOCKCHAIN_PID=$!

# 等待区块链节点启动
sleep 5

# 部署智能合约
echo "📄 Deploying smart contracts..."
npx hardhat run scripts/deploy_with_marketplace.js --network localhost

echo "✅ Smart contracts deployed"

# 启动后端API服务
echo "🔧 Starting backend API server..."
cd backend
npm run dev &
BACKEND_PID=$!

# 等待后端服务启动
sleep 3

# 启动前端开发服务器
echo "🌐 Starting frontend development server..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "🎉 HealthChain development environment is ready!"
echo ""
echo "📋 Services running:"
echo "   • Blockchain: http://localhost:8545"
echo "   • Backend API: http://localhost:3001"
echo "   • Frontend: http://localhost:5173"
echo ""
echo "🔧 Setup MetaMask:"
echo "   • Network: Hardhat Localhost"
echo "   • RPC URL: http://localhost:8545"
echo "   • Chain ID: 31337"
echo ""
echo "💡 To stop all services, press Ctrl+C"

# 等待用户中断
trap "echo ''; echo '🛑 Stopping all services...'; kill $BLOCKCHAIN_PID $BACKEND_PID $FRONTEND_PID; exit" INT

# 保持脚本运行
wait