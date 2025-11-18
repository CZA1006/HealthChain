# HealthChain Backend API

基于SQLite的HealthChain后端服务，提供用户认证、会话管理和数据持久化功能。

## 功能特性

- ✅ 用户注册和登录（支持密码和钱包登录）
- ✅ JWT令牌认证
- ✅ SQLite数据库持久化
- ✅ 用户偏好设置管理
- ✅ 自动fallback到localStorage机制
- ✅ CORS支持
- ✅ RESTful API设计

## 快速开始

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 启动服务

```bash
# 开发模式
npm run dev

# 或者从项目根目录同时启动前后端
npm run dev
```

服务将在 http://localhost:3001 启动

## API端点

### 认证相关

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出

### 用户管理

- `GET /api/user` - 获取当前用户信息
- `GET /api/user/preferences` - 获取用户偏好设置
- `PUT /api/user/preferences` - 更新用户偏好设置

### 系统状态

- `GET /api/health` - 健康检查

## 数据库结构

### users表
- `id` - 用户ID (主键)
- `username` - 用户名 (唯一)
- `email` - 邮箱地址 (唯一)
- `password_hash` - 密码哈希
- `wallet_address` - 钱包地址 (唯一)
- `created_at` - 创建时间

### sessions表
- `id` - 会话ID (主键)
- `user_id` - 用户ID (外键)
- `token` - JWT令牌 (唯一)
- `wallet_address` - 钱包地址
- `expires_at` - 过期时间
- `created_at` - 创建时间

### user_preferences表
- `id` - 偏好设置ID (主键)
- `user_id` - 用户ID (外键)
- `theme` - 主题设置
- `language` - 语言设置
- `notifications_enabled` - 通知开关

## 环境变量

```bash
PORT=3001                    # 服务端口
JWT_SECRET=your-secret-key   # JWT密钥
```

## 开发说明

### 数据库文件
SQLite数据库文件位于 `healthchain.db`，首次启动时会自动创建。

### 前端集成
前端会自动检测后端服务是否可用，如果后端不可用，会自动fallback到localStorage模式。

### 安全特性
- 密码使用bcryptjs进行哈希处理
- JWT令牌过期时间为24小时
- CORS配置允许前端跨域访问

## 故障排除

### 端口占用
如果3001端口被占用，可以通过环境变量修改端口：

```bash
PORT=3002 npm run dev
```

### 数据库问题
如果数据库文件损坏，可以删除 `healthchain.db` 文件后重启服务。

### 前端连接失败
确保后端服务正在运行，并检查浏览器控制台的网络请求。