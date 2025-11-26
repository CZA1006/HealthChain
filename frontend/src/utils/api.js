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
    
    // 🆕 存储健康数据（离线存储实际数据，返回DataHash用于链上存储）
    async storeHealthData(healthData) {
        if (this.useBackend) {
            const token = this.getToken();
            if (!token) {
                throw new Error('No active session');
            }
            
            return await this.makeRequest('/health-data/store', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(healthData)
            });
        } else {
            // localStorage fallback
            const healthDataList = JSON.parse(localStorage.getItem('healthchain_health_data') || '[]');
            
            // 生成DataHash（简化版本）
            const dataHash = btoa(JSON.stringify({
                ...healthData,
                timestamp: Date.now()
            })).substring(0, 64);
            
            const newHealthData = {
                id: Date.now(),
                dataHash: dataHash,
                ...healthData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            healthDataList.push(newHealthData);
            localStorage.setItem('healthchain_health_data', JSON.stringify(healthDataList));
            
            return {
                message: 'Health data stored successfully',
                dataHash: dataHash,
                dataId: newHealthData.id
            };
        }
    }
    
    // 🆕 根据DataHash检索健康数据
    async getHealthDataByHash(dataHash) {
        if (this.useBackend) {
            const token = this.getToken();
            if (!token) {
                throw new Error('No active session');
            }
            
            return await this.makeRequest(`/health-data/${dataHash}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } else {
            // localStorage fallback
            const healthDataList = JSON.parse(localStorage.getItem('healthchain_health_data') || '[]');
            const healthData = healthDataList.find(item => item.dataHash === dataHash);
            
            if (!healthData) {
                throw new Error('Health data not found');
            }
            
            return {
                ...healthData,
                integrityValid: true,
                walletAddress: 'local-storage'
            };
        }
    }
    
    // 🆕 获取用户的所有健康数据（分页）
    async getHealthDataList(options = {}) {
        const { page = 1, limit = 20, dataType } = options;
        
        if (this.useBackend) {
            const token = this.getToken();
            if (!token) {
                throw new Error('No active session');
            }
            
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString()
            });
            
            if (dataType) {
                params.append('dataType', dataType);
            }
            
            return await this.makeRequest(`/health-data?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } else {
            // localStorage fallback
            const healthDataList = JSON.parse(localStorage.getItem('healthchain_health_data') || '[]');
            
            // 过滤和分页
            let filteredData = healthDataList;
            if (dataType) {
                filteredData = filteredData.filter(item => item.dataType === dataType);
            }
            
            // 按创建时间排序
            filteredData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedData = filteredData.slice(startIndex, endIndex);
            
            return {
                data: paginatedData,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: filteredData.length,
                    totalPages: Math.ceil(filteredData.length / parseInt(limit))
                }
            };
        }
    }
    
    // 🆕 验证DataHash与健康数据的完整性
    async verifyHealthDataIntegrity(verificationData) {
        if (this.useBackend) {
            const token = this.getToken();
            if (!token) {
                throw new Error('No active session');
            }
            
            return await this.makeRequest('/health-data/verify', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(verificationData)
            });
        } else {
            // localStorage fallback - 简化验证
            const healthDataList = JSON.parse(localStorage.getItem('healthchain_health_data') || '[]');
            const healthData = healthDataList.find(item => item.dataHash === verificationData.dataHash);
            
            const existsInDatabase = !!healthData;
            const integrityValid = existsInDatabase && 
                healthData.dataType === verificationData.dataType &&
                JSON.stringify(healthData.actualData) === JSON.stringify(verificationData.actualData);
            
            return {
                integrityValid: integrityValid,
                existsInDatabase: existsInDatabase,
                calculatedHash: verificationData.dataHash,
                providedHash: verificationData.dataHash
            };
        }
    }
    
    // 🆕 删除健康数据
    async deleteHealthData(dataHash) {
        if (this.useBackend) {
            const token = this.getToken();
            if (!token) {
                throw new Error('No active session');
            }
            
            return await this.makeRequest(`/health-data/${dataHash}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } else {
            // localStorage fallback
            const healthDataList = JSON.parse(localStorage.getItem('healthchain_health_data') || '[]');
            const filteredData = healthDataList.filter(item => item.dataHash !== dataHash);
            
            if (filteredData.length === healthDataList.length) {
                throw new Error('Health data not found');
            }
            
            localStorage.setItem('healthchain_health_data', JSON.stringify(filteredData));
            
            return { message: 'Health data deleted successfully' };
        }
    }
}

// 创建全局API实例
export const healthChainAPI = new HealthChainAPI();

export default healthChainAPI;
