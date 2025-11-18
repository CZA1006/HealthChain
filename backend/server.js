import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'healthchain-secret-key';

// 中间件
app.use(cors());
app.use(express.json());

// SQLite数据库初始化
const db = new sqlite3.Database(join(__dirname, 'healthchain.db'), (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// 初始化数据库表
function initializeDatabase() {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            wallet_address TEXT UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            wallet_address TEXT,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS user_preferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            theme TEXT DEFAULT 'light',
            language TEXT DEFAULT 'en',
            notifications_enabled BOOLEAN DEFAULT true,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    `);
}

// 用户注册
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password, walletAddress } = req.body;

    try {
        const passwordHash = await bcrypt.hash(password, 12);
        
        db.run(
            'INSERT INTO users (username, email, password_hash, wallet_address) VALUES (?, ?, ?, ?)',
            [username, email, passwordHash, walletAddress],
            function(err) {
                if (err) {
                    console.error('Register error:', err);
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ error: 'Username or email already exists' });
                    }
                    return res.status(500).json({ error: 'Database error' });
                }
                
                res.status(201).json({ 
                    message: 'User registered successfully',
                    userId: this.lastID 
                });
            }
        );
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// 用户登录 - 修复版
app.post('/api/auth/login', async (req, res) => {
    const { username, password, walletAddress } = req.body;

    try {
        // 构建动态查询条件
        let query = 'SELECT * FROM users WHERE ';
        let params = [];
        
        if (walletAddress) {
            // 钱包登录
            query += 'wallet_address = ?';
            params.push(walletAddress);
        } else if (username) {
            // 用户名/邮箱登录 - 同时匹配两个字段
            query += '(username = ? OR email = ?)';
            params.push(username, username);
        } else {
            return res.status(400).json({ error: 'Username or wallet address required' });
        }
        
        db.get(query, params, async (err, user) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // 钱包登录验证
            if (walletAddress && user.wallet_address === walletAddress) {
                const token = jwt.sign(
                    { userId: user.id, username: user.username },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );

                // 保存会话
                const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
                db.run(
                    'INSERT INTO sessions (user_id, token, wallet_address, expires_at) VALUES (?, ?, ?, ?)',
                    [user.id, token, walletAddress, expiresAt.toISOString()],
                    (err) => {
                        if (err) {
                            console.error('Session save error:', err);
                        }
                    }
                );

                return res.json({
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        walletAddress: user.wallet_address
                    }
                });
            }

            // 密码登录验证
            if (password) {
                const isValidPassword = await bcrypt.compare(password, user.password_hash);
                if (!isValidPassword) {
                    return res.status(401).json({ error: 'Invalid credentials' });
                }

                const token = jwt.sign(
                    { userId: user.id, username: user.username },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );

                const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
                db.run(
                    'INSERT INTO sessions (user_id, token, wallet_address, expires_at) VALUES (?, ?, ?, ?)',
                    [user.id, token, user.wallet_address, expiresAt.toISOString()],
                    (err) => {
                        if (err) {
                            console.error('Session save error:', err);
                        }
                    }
                );

                return res.json({
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        walletAddress: user.wallet_address
                    }
                });
            }

            res.status(401).json({ error: 'Invalid credentials' });
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// 获取用户信息
app.get('/api/user', authenticateToken, (req, res) => {
    db.get(
        'SELECT id, username, email, wallet_address FROM users WHERE id = ?',
        [req.user.userId],
        (err, user) => {
            if (err) {
                console.error('Get user error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json({ user });
        }
    );
});

// 更新用户偏好设置
app.put('/api/user/preferences', authenticateToken, (req, res) => {
    const { theme, language, notificationsEnabled } = req.body;

    db.run(
        `INSERT OR REPLACE INTO user_preferences (user_id, theme, language, notifications_enabled) 
         VALUES (?, ?, ?, ?)`,
        [req.user.userId, theme, language, notificationsEnabled],
        function(err) {
            if (err) {
                console.error('Update preferences error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            res.json({ message: 'Preferences updated successfully' });
        }
    );
});

// 获取用户偏好设置
app.get('/api/user/preferences', authenticateToken, (req, res) => {
    db.get(
        'SELECT theme, language, notifications_enabled FROM user_preferences WHERE user_id = ?',
        [req.user.userId],
        (err, preferences) => {
            if (err) {
                console.error('Get preferences error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            res.json({ 
                preferences: preferences || { 
                    theme: 'light', 
                    language: 'en', 
                    notificationsEnabled: true 
                } 
            });
        }
    );
});

// 用户登出
app.post('/api/auth/logout', authenticateToken, (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    db.run(
        'DELETE FROM sessions WHERE token = ?',
        [token],
        function(err) {
            if (err) {
                console.error('Logout error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            res.json({ message: 'Logged out successfully' });
        }
    );
});

// JWT认证中间件
function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('Token verification error:', err);
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
}

// 健康检查端点
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`HealthChain Backend API running on port ${PORT}`);
});

// 关闭
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed');
        }
        process.exit(0);
    });
});
