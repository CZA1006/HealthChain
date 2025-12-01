const API_BASE_URL = 'http://localhost:3001/api';

// Check backend service availability
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
        console.warn('Backend not available, using localStorage fallback');
        return false;
    }
}

// localStorage fallback implementation
const localStorageFallback = {
    // User registration
    async register(userData) {
        const existingUsers = JSON.parse(localStorage.getItem('healthchain_users') || '[]');
        
        // Check if username or email exists
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
    
    // User login - fixed version
    async login(credentials) {
        const users = JSON.parse(localStorage.getItem('healthchain_users') || '[]');
        
        let user;
        if (credentials.walletAddress) {
            // Wallet login
            user = users.find(u => u.walletAddress === credentials.walletAddress);
        } else if (credentials.username) {
            // Fixed: match both username and email fields
            user = users.find(u =>
                u.username === credentials.username || 
                u.email === credentials.username
            );
        }
        
        if (!user) {
            throw new Error('Invalid credentials');
        }
        
        // Generate mock token
        const token = btoa(JSON.stringify({
            userId: user.id,
            username: user.username,
            exp: Date.now() + 24 * 60 * 60 * 1000
        }));
        
        // Save session
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
    
    // Get current user
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
        
        // Check token expiration
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
    
    // User logout
    async logout() {
        localStorage.removeItem('healthchain_session');
        localStorage.removeItem('healthchain_token');
        return { message: 'Logged out successfully' };
    },
    
    // Update user preferences
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
    
    // Get user preferences
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

// Main API service class
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
    
    // User registration
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
    
    // User login
    async login(credentials) {
        if (this.useBackend) {
            const result = await this.makeRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify(credentials)
            });
            
            // Save token to localStorage for compatibility
            if (result.token) {
                localStorage.setItem('healthchain_token', result.token);
            }
            
            return result;
        } else {
            return await localStorageFallback.login(credentials);
        }
    }
    
    // Get current user
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
    
    // User logout
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
        
        // Always clean localStorage
        const result = await localStorageFallback.logout();
        localStorage.removeItem('healthchain_token');
        
        return result;
    }
    
    // Update user preferences
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
    
    // Get user preferences
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
    
    // Check authentication status
    isAuthenticated() {
        const token = localStorage.getItem('healthchain_token');
        if (!token) return false;
        
        // Simple token existence check
        return true;
    }
    
    // Get auth token
    getToken() {
        return localStorage.getItem('healthchain_token');
    }
    
    // Store health data (offline storage, returns DataHash for on-chain)
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
            
            // Generate DataHash (simplified)
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
    
    // Retrieve health data by DataHash
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
    
    // Get all user health data (paginated)
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
            
            // Filter and paginate
            let filteredData = healthDataList;
            if (dataType) {
                filteredData = filteredData.filter(item => item.dataType === dataType);
            }
            
            // Sort by creation time
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
    
    // Verify DataHash and health data integrity
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
            // localStorage fallback - simplified verification
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
    
    // Delete health data
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

// Create global API instance
export const healthChainAPI = new HealthChainAPI();

export default healthChainAPI;
