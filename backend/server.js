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

// Middleware
app.use(cors());
app.use(express.json());

// Init SQLite
const db = new sqlite3.Database(join(__dirname, 'healthchain.db'), (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

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

    // Health data storage table - offline storage for actual health data
    db.run(`
        CREATE TABLE IF NOT EXISTS health_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            data_hash TEXT UNIQUE NOT NULL,
            data_type TEXT NOT NULL,                 -- Available Types: steps, heart_rate, sleep等
            actual_data TEXT NOT NULL,               -- JSON-format
            metadata TEXT,                           -- JSON-format
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_health_data_user ON health_data(user_id);
        CREATE INDEX IF NOT EXISTS idx_health_data_hash ON health_data(data_hash);
        CREATE INDEX IF NOT EXISTS idx_health_data_type ON health_data(data_type);
        CREATE INDEX IF NOT EXISTS idx_health_data_created ON health_data(created_at);
    `);

    // Create indexes for query performance
    // db.run('CREATE INDEX IF NOT EXISTS idx_health_data_user_id ON health_data(user_id)');
    // db.run('CREATE INDEX IF NOT EXISTS idx_health_data_hash ON health_data(data_hash)');
    // db.run('CREATE INDEX IF NOT EXISTS idx_health_data_type ON health_data(data_type)');
    // db.run('CREATE INDEX IF NOT EXISTS idx_health_data_created ON health_data(created_at)');
}


// User registration
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

// User login - fixed version
app.post('/api/auth/login', async (req, res) => {
    const { username, password, walletAddress } = req.body;

    try {
        // Build dynamic query conditions
        let query = 'SELECT * FROM users WHERE ';
        let params = [];
        
        if (walletAddress) {
            // Wallet login
            query += 'wallet_address = ?';
            params.push(walletAddress);
        } else if (username) {
            // Username/email login - match both fields
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

            // Wallet login verification
            if (walletAddress && user.wallet_address === walletAddress) {
                const token = jwt.sign(
                    { userId: user.id, username: user.username },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );

                // Save session
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

            // Password login verification
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

// Get current user
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

// Update user preferences
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

// Get user preferences
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

// User logout
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

// JWT authentication middleware
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

// Store health data (offline storage, returns DataHash for on-chain)
app.post('/api/health-data/store', authenticateToken, (req, res) => {
    const { dataType, actualData, metadata } = req.body;
    
    if (!dataType || !actualData) {
        return res.status(400).json({ error: 'dataType and actualData are required' });
    }
    
    try {
        // Generate DataHash (consistent with on-chain)
        const dataHash = require('crypto').createHash('sha256')
            .update(JSON.stringify({
                userId: req.user.userId,
                dataType,
                actualData,
                timestamp: Date.now()
            }))
            .digest('hex');
        
        // Save to database
        db.run(
            `INSERT INTO health_data (user_id, data_hash, data_type, actual_data, metadata, updated_at) 
             VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [req.user.userId, dataHash, dataType, JSON.stringify(actualData), JSON.stringify(metadata || {})],
            function(err) {
                if (err) {
                    console.error('Store health data error:', err);
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(409).json({ error: 'Data already exists' });
                    }
                    return res.status(500).json({ error: 'Database error' });
                }
                
                res.status(201).json({
                    message: 'Health data stored successfully',
                    dataHash: dataHash,
                    dataId: this.lastID
                });
            }
        );
    } catch (error) {
        console.error('Store health data error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Search health data by DataHash
app.get('/api/health-data/:dataHash', authenticateToken, (req, res) => {
    const { dataHash } = req.params;
    
    db.get(
        `SELECT hd.*, u.wallet_address 
         FROM health_data hd 
         JOIN users u ON hd.user_id = u.id 
         WHERE hd.data_hash = ? AND hd.user_id = ?`,
        [dataHash, req.user.userId],
        (err, row) => {
            if (err) {
                console.error('Retrieve health data error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (!row) {
                return res.status(404).json({ error: 'Health data not found' });
            }
            
            // Validate integrity
            const calculatedHash = require('crypto').createHash('sha256')
                .update(JSON.stringify({
                    userId: req.user.userId,
                    dataType: row.data_type,
                    actualData: JSON.parse(row.actual_data),
                    timestamp: new Date(row.created_at).getTime()
                }))
                .digest('hex');
            
            const isIntegrityValid = calculatedHash === dataHash;
            
            res.json({
                dataHash: row.data_hash,
                dataType: row.data_type,
                actualData: JSON.parse(row.actual_data),
                metadata: row.metadata ? JSON.parse(row.metadata) : {},
                walletAddress: row.wallet_address,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                integrityValid: isIntegrityValid
            });
        }
    );
});

// Get all user health data (paginated)
app.get('/api/health-data', authenticateToken, (req, res) => {
    const { page = 1, limit = 20, dataType } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = `SELECT hd.*, u.wallet_address 
                 FROM health_data hd 
                 JOIN users u ON hd.user_id = u.id 
                 WHERE hd.user_id = ?`;
    let params = [req.user.userId];
    
    if (dataType) {
        query += ' AND hd.data_type = ?';
        params.push(dataType);
    }
    
    query += ' ORDER BY hd.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM health_data WHERE user_id = ?';
    let countParams = [req.user.userId];
    
    if (dataType) {
        countQuery += ' AND data_type = ?';
        countParams.push(dataType);
    }
    
    db.get(countQuery, countParams, (err, countResult) => {
        if (err) {
            console.error('Count health data error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Retrieve health data list error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            const healthData = rows.map(row => ({
                dataHash: row.data_hash,
                dataType: row.data_type,
                actualData: JSON.parse(row.actual_data),
                metadata: row.metadata ? JSON.parse(row.metadata) : {},
                walletAddress: row.wallet_address,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            }));
            
            res.json({
                data: healthData,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: countResult.total,
                    totalPages: Math.ceil(countResult.total / parseInt(limit))
                }
            });
        });
    });
});

// Validate integrity of health data
app.post('/api/health-data/verify', authenticateToken, (req, res) => {
    const { dataHash, dataType, actualData, timestamp } = req.body;
    
    if (!dataHash || !dataType || !actualData) {
        return res.status(400).json({ error: 'dataHash, dataType, and actualData are required' });
    }
    
    try {
        // Recalculate the hash of the data
        const calculatedHash = require('crypto').createHash('sha256')
            .update(JSON.stringify({
                userId: req.user.userId,
                dataType,
                actualData,
                timestamp: timestamp || Date.now()
            }))
            .digest('hex');
        
        const isIntegrityValid = calculatedHash === dataHash;
        
        // Check if the data exists in the database
        db.get(
            'SELECT * FROM health_data WHERE data_hash = ? AND user_id = ?',
            [dataHash, req.user.userId],
            (err, row) => {
                if (err) {
                    console.error('Verify health data error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                
                res.json({
                    integrityValid: isIntegrityValid,
                    existsInDatabase: !!row,
                    calculatedHash: calculatedHash,
                    providedHash: dataHash
                });
            }
        );
    } catch (error) {
        console.error('Verify health data error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete health data
app.delete('/api/health-data/:dataHash', authenticateToken, (req, res) => {
    const { dataHash } = req.params;
    
    db.run(
        'DELETE FROM health_data WHERE data_hash = ? AND user_id = ?',
        [dataHash, req.user.userId],
        function(err) {
            if (err) {
                console.error('Delete health data error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Health data not found' });
            }
            
            res.json({ message: 'Health data deleted successfully' });
        }
    );
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`HealthChain Backend API running on port ${PORT}`);
});

// Handle database connection close on shutdown
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
