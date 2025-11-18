# HealthChain: localStorage to SQLite Migration Summary

## 📋 项目概述

本项目成功将HealthChain从基于localStorage的用户认证系统迁移到完整的SQLite后端API服务。新的架构提供了更安全、更可靠的数据持久化解决方案。

## 🏗️ 架构变化

### 迁移前架构
```
前端 (React + Vite)
    ↓
localStorage (浏览器存储)
    - 用户凭据
    - 会话信息
    - 用户偏好
```

### 迁移后架构
```
前端 (React + Vite)
    ↓
后端API (Node.js + Express)
    ↓
SQLite数据库
    - users表 (用户信息)
    - sessions表 (会话管理)
    - user_preferences表 (用户偏好)
```

## 🚀 新功能特性

### 1. 用户认证系统
- ✅ **用户注册**: 支持用户名、邮箱、密码注册
- ✅ **多种登录方式**: 密码登录 + 钱包地址登录
- ✅ **JWT令牌认证**: 安全的会话管理
- ✅ **自动fallback**: 后端不可用时自动使用localStorage

### 2. 数据库设计
```sql
-- 用户表
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    wallet_address TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 会话表
CREATE TABLE sessions (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    wallet_address TEXT,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 用户偏好表
CREATE TABLE user_preferences (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    theme TEXT DEFAULT 'light',
    language TEXT DEFAULT 'en',
    notifications_enabled BOOLEAN DEFAULT true
);
```

### 3. API端点
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/user` - 获取用户信息
- `GET /api/user/preferences` - 获取用户偏好
- `PUT /api/user/preferences` - 更新用户偏好
- `GET /api/health` - 健康检查

## 🔧 技术实现

### 后端技术栈
- **Node.js + Express**: RESTful API服务器
- **SQLite3**: 轻量级数据库
- **bcryptjs**: 密码哈希加密
- **jsonwebtoken**: JWT令牌管理
- **CORS**: 跨域资源共享

### 前端集成
- **API服务层**: `src/utils/api.js`
- **自动检测**: 后端服务可用性检查
- **无缝切换**: backend不可用时自动fallback到localStorage
- **会话持久化**: JWT令牌存储

## 📁 新增文件结构

```
HealthChain/
├── backend/                    # 新增后端服务
│   ├── package.json           # 后端依赖配置
│   ├── server.js             # Express服务器主文件
│   └── README.md             # 后端使用说明
├── frontend/src/utils/
│   └── api.js                # 新增API服务层
├── start-dev.sh              # 一键启动脚本
└── MIGRATION_SUMMARY.md      # 本迁移文档
```

## 🛠️ 使用指南

### 快速启动
```bash
# 一键启动所有服务
./start-dev.sh

# 或手动启动
npm run install-all
npm run dev
```

### 开发流程
1. **启动后端**: `cd backend && npm run dev` (端口3001)
2. **启动区块链**: `npx hardhat node` (端口8545)
3. **启动前端**: `cd frontend && npm run dev` (端口5173)
4. **配置MetaMask**: 连接Hardhat Localhost网络

### API调用示例
```javascript
// 用户注册
await healthChainAPI.register({
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    walletAddress: '0x...'
});

// 用户登录
await healthChainAPI.login({
    username: 'testuser',
    password: 'password123'
});

// 钱包登录
await healthChainAPI.login({
    walletAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
});
```

## 🔒 安全特性

- **密码加密**: bcryptjs哈希算法
- **JWT安全**: 24小时过期时间
- **CORS保护**: 跨域请求限制
- **输入验证**: 服务器端数据验证
- **错误处理**: 优雅的错误响应

## 📈 性能优化

- **轻量级数据库**: SQLite零配置启动
- **连接池**: 数据库连接复用
- **自动清理**: 过期会话自动清理
- **缓存策略**: 前端API响应缓存

## 🐛 故障排除

### 常见问题
1. **端口占用**: 修改PORT环境变量
2. **数据库锁定**: 删除healthchain.db重新启动
3. **CORS错误**: 检查前端URL是否在白名单中
4. **JWT错误**: 检查令牌是否过期或无效

### 调试技巧
```bash
# 检查后端服务状态
curl http://localhost:3001/api/health

# 检查数据库文件
ls -la backend/healthchain.db

# 查看日志
cd backend && npm run dev
```

## 🎯 迁移成果

✅ **数据持久化**: 用户数据持久存储在SQLite中  
✅ **安全性提升**: JWT认证 + bcrypt密码加密  
✅ **用户体验**: 无缝的backend/localStorage切换  
✅ **开发效率**: 一键启动脚本简化开发流程  
✅ **可扩展性**: 模块化架构支持未来功能扩展  

## 📞 技术支持

如有问题请参考:
- `backend/README.md` - 后端服务详细文档
- `frontend/src/utils/api.js` - API服务层源码
- 项目根目录`README.md` - 完整使用指南

---

**迁移完成时间**: 2025-11-18  
**技术负责人**: AI Assistant  
**项目状态**: ✅ 生产就绪