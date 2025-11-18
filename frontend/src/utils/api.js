const API_BASE_URL = 'http://localhost:3001/api';

// 检查后端服务是否可用
async function checkBackendAvailability() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 3000
        });
        return response.ok;
    } catch (error) {
        console.warn('Backend service not available, falling back to localStorage');
        return false;
    }
}

// localStorage fallback 实现
const localStorageFallback = {
    // 用户注册
    async register(userData) {
        const existingUsers = JSON.parse(localStorage.getItem('healthchain_users') || '[]');
        
        // 检查用户名和邮箱是否已存在
        const existingUser = existingUsers.find(user => 
            user.username === userData.username || user.email === userData.email
        );
        
        if (existingUser) {
            throw new Error('Username or email already exists');
        }
        
        const newUser = {
            id: Date.now(),
            username: userData.username,
            email: userData.email,
            walletAddress: userData.walletAddress,
            createdAt: new Date().toISOString()
        };
        
        existingUsers.push(newUser);
        localStorage.setItem('healthchain_users', JSON.stringify(existingUsers));
        
        return { message: 'User registered successfully', userId: newUser.id };
    },
    
    // 用户登录 - 修复版
    async login(credentials) {
        const users = JSON.parse(localStorage.getItem('healthchain_users') || '[]');
        
        let user;
        if (credentials.walletAddress) {
            // 钱包登录
            user = users.find(u => u.walletAddress === credentials.walletAddress);
        } else if (credentials.username) {
            // ✅ 修复：同时匹配 username 和 email 字段
            user = users.find(u => 
                u.username === credentials.username || 
                u.email === credentials.username
            );
        }
        
        if (!user) {
            throw new Error('Invalid credentials');
        }
        
        // 生成模拟token
        const token = btoa(JSON.stringify({
            userId: user.id,
            username: user.username,
            exp: Date.now() + 24 * 60 * 60 * 1000
        }));
        
        // 保存会话
        const session = {
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                walletAddress: user.walletAddress
            },
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };
        
        localStorage.setItem('healthchain_session', JSON.stringify(session));
        localStorage.setItem('healthchain_token', token);
        
        return session;
    },
    
    // 获取当前用户
    async getCurrentUser() {
        const sessionStr = localStorage.getItem('healthchain_session');
        if (!sessionStr) {
            throw new Error('No active session');
        }
        
        const session = JSON.parse(sessionStr);
        const token = localStorage.getItem('healthchain_token');
        
        if (!token || token !== session.token) {
            this.logout();
            throw new Error('Invalid session');
        }
        
        // 检查token是否过期
        try {
            const tokenData = JSON.parse(atob(token));
            if (tokenData.exp < Date.now()) {
                this.logout();
                throw new Error('Session expired');
            }
        } catch (error) {
            this.logout();
            throw new Error('Invalid token');
        }
        
        return session.user;
    },
    
    // 用户登出
    async logout() {
        localStorage.removeItem('healthchain_session');
        localStorage.removeItem('healthchain_token');
        return { message: 'Logged out successfully' };
    },
    
    // 更新用户偏好设置
    async updatePreferences(preferences) {
        const sessionStr = localStorage.getItem('healthchain_session');
        if (!sessionStr) {
            throw new Error('No active session');
        }
        
        const session = JSON.parse(sessionStr);
        const userPreferences = JSON.parse(localStorage.getItem('healthchain_preferences') || '{}');
        
        userPreferences[session.user.id] = {
            ...userPreferences[session.user.id],
            ...preferences,
            updatedAt: new Date().toISOString()
        };
        
        localStorage.setItem('healthchain_preferences', JSON.stringify(userPreferences));
        
        return { message: 'Preferences updated successfully' };
    },
    
    // 获取用户偏好设置
    async getPreferences() {
        const sessionStr = localStorage.getItem('healthchain_session');
        if (!sessionStr) {
            throw new Error('No active session');
        }
        
        const session = JSON.parse(sessionStr);
        const userPreferences = JSON.parse(localStorage.getItem('healthchain_preferences') || '{}');
        
        const preferences = userPreferences[session.user.id] || {
            theme: 'light',
            language: 'en',
            notificationsEnabled: true
        };
        
        return { preferences };
    }
};

// API服务主类
export class HealthChainAPI {
    constructor() {
        this.useBackend = true;
        this.checkAvailability();
    }
    
    async checkAvailability() {
        this.useBackend = await checkBackendAvailability();
        console.log(`Using ${this.useBackend ? 'backend API' : 'localStorage fallback'}`);
    }
    
    async makeRequest(endpoint, options = {}) {
        if (!this.useBackend) {
            throw new Error('Backend service not available');
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }
    
    // 用户注册
    async register(userData) {
        if (this.useBackend) {
            return await this.makeRequest('/auth/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });
        } else {
            return await localStorageFallback.register(userData);
        }
    }
    
    // 用户登录
    async login(credentials) {
        if (this.useBackend) {
            const result = await this.makeRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify(credentials)
            });
            
            // 保存token到localStorage用于兼容性
            if (result.token) {
                localStorage.setItem('healthchain_token', result.token);
            }
            
            return result;
        } else {
            return await localStorageFallback.login(credentials);
        }
    }
    
    // 获取当前用户
    async getCurrentUser() {
        if (this.useBackend) {
            const token = localStorage.getItem('healthchain_token');
            if (!token) {
                throw new Error('No active session');
            }
            
            return await this.makeRequest('/user', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } else {
            return await localStorageFallback.getCurrentUser();
        }
    }
    
    // 用户登出
    async logout() {
        if (this.useBackend) {
            const token = localStorage.getItem('healthchain_token');
            if (token) {
                await this.makeRequest('/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            }
        }
        
        // 总是清理localStorage
        const result = await localStorageFallback.logout();
        localStorage.removeItem('healthchain_token');
        
        return result;
    }
    
    // 更新用户偏好设置
    async updatePreferences(preferences) {
        if (this.useBackend) {
            const token = localStorage.getItem('healthchain_token');
            if (!token) {
                throw new Error('No active session');
            }
            
            return await this.makeRequest('/user/preferences', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(preferences)
            });
        } else {
            return await localStorageFallback.updatePreferences(preferences);
        }
    }
    
    // 获取用户偏好设置
    async getPreferences() {
        if (this.useBackend) {
            const token = localStorage.getItem('healthchain_token');
            if (!token) {
                throw new Error('No active session');
            }
            
            return await this.makeRequest('/user/preferences', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } else {
            return await localStorageFallback.getPreferences();
        }
    }
    
    // 检查认证状态
    isAuthenticated() {
        const token = localStorage.getItem('healthchain_token');
        if (!token) return false;
        
        // 简单的token存在性检查
        return true;
    }
    
    // 获取认证token
    getToken() {
        return localStorage.getItem('healthchain_token');
    }
}

// 创建全局API实例
export const healthChainAPI = new HealthChainAPI();

export default healthChainAPI;
