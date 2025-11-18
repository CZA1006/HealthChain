// src/pages/LoginPage.jsx - 简化版本
import React, { useState } from 'react';
import { ethers } from 'ethers';
import { healthChainAPI } from '../utils/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import './LoginPage.css';

export default function LoginPage({ onLogin }) {
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleRegister(e) {
        e.preventDefault();
        if (!email || !password) {
            setMessage('Please enter email and password');
            return;
        }

        setLoading(true);
        try {
            await healthChainAPI.register({
                username: email.split('@')[0],
                email: email,
                password: password,
                walletAddress: null
            });
            
            setMessage('✅ Registration successful, you can now log in');
            setMode('login');
            setPassword('');
        } catch (error) {
            setMessage('❌ ' + (error.message || 'Registration failed'));
        } finally {
            setLoading(false);
        }
    }

    async function handleLogin(e) {
        e.preventDefault();
        if (!email || !password) {
            setMessage('Please enter email and password');
            return;
        }

        setLoading(true);
        try {
            const result = await healthChainAPI.login({
                username: email,
                password: password
            });
            
            setMessage('✅ Login successful');
            setPassword('');
            if (onLogin) onLogin(result.user);
        } catch (error) {
            setMessage('❌ ' + (error.message || 'Login failed'));
        } finally {
            setLoading(false);
        }
    }

    async function handleWalletLogin() {
        setMessage('');
        setLoading(true);
        try {
            if (!window.ethereum) {
                setMessage('❌ No Ethereum wallet detected (e.g., MetaMask)');
                return;
            }
            
            const provider = new ethers.BrowserProvider(window.ethereum);
            await provider.send('eth_requestAccounts', []);
            const signer = await provider.getSigner();
            const address = await signer.getAddress();

            const result = await healthChainAPI.login({
                walletAddress: address
            });
            
            setMessage(`✅ Wallet login successful: ${address}`);
            if (onLogin) onLogin(result.user);
        } catch (err) {
            console.error(err);
            setMessage('❌ Wallet login failed: ' + (err.message || err));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-page">
            {/* 左侧：登录注册表单 */}
            <div className="login-section">
                <div className="container" style={{ maxWidth: 480, paddingTop: '3rem' }}>
                    <Card 
                        title="Welcome to HealthChain" 
                        subtitle="Secure health data marketplace"
                        variant="elevated"
                    >
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                            <Button 
                                variant={mode === 'login' ? 'primary' : 'ghost'}
                                onClick={() => setMode('login')}
                                fullWidth
                            >
                                Password Login
                            </Button>
                            <Button 
                                variant={mode === 'register' ? 'primary' : 'ghost'}
                                onClick={() => setMode('register')}
                                fullWidth
                            >
                                Register
                            </Button>
                        </div>

                        <Button 
                            variant="outline" 
                            onClick={handleWalletLogin}
                            loading={loading && !email}
                            fullWidth
                            style={{ marginBottom: '1.5rem' }}
                        >
                            🦊 Login with Wallet
                        </Button>

                        <div style={{ 
                            borderTop: '1px solid var(--border-color)', 
                            paddingTop: '1.5rem',
                            marginTop: '1rem'
                        }}>
                            {mode === 'login' ? (
                                <form onSubmit={handleLogin}>
                                    <Input
                                        label="Email"
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        fullWidth
                                        required
                                    />
                                    <Input
                                        label="Password"
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        fullWidth
                                        required
                                    />
                                    <Button 
                                        type="submit" 
                                        variant="primary"
                                        loading={loading && email}
                                        fullWidth
                                    >
                                        Login
                                    </Button>
                                </form>
                            ) : (
                                <form onSubmit={handleRegister}>
                                    <Input
                                        label="Email"
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        fullWidth
                                        required
                                    />
                                    <Input
                                        label="Password"
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        helperText="Minimum 6 characters"
                                        fullWidth
                                        required
                                    />
                                    <Button 
                                        type="submit" 
                                        variant="secondary"
                                        loading={loading && email}
                                        fullWidth
                                    >
                                        Register
                                    </Button>
                                </form>
                            )}
                        </div>

                        {message && (
                            <div style={{ 
                                marginTop: '1rem',
                                padding: '0.75rem',
                                borderRadius: 'var(--border-radius-md)',
                                background: message.includes('✅') ? 'var(--color-success-light)' : 'var(--color-error-light)',
                                color: message.includes('✅') ? 'var(--color-success)' : 'var(--color-error)',
                                fontSize: 'var(--font-size-sm)'
                            }}>
                                {message}
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {/* 右侧：紫色渐变展示区 */}
            <div className="hero-section">
                <div className="hero-content">
                    <h1 className="hero-title">Decentralized Health Data</h1>
                    <p className="hero-description">
                        Secure, private, and transparent health data marketplace powered by blockchain technology.
                    </p>
                    
                    <div className="feature-cards">
                        <div className="feature-card">
                            <div className="feature-icon">🔒</div>
                            <div>
                                <h3>Secure & Private</h3>
                                <p>End-to-end encryption</p>
                            </div>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">⛓️</div>
                            <div>
                                <h3>Blockchain Powered</h3>
                                <p>Immutable health records</p>
                            </div>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">💎</div>
                            <div>
                                <h3>Tokenized Economy</h3>
                                <p>Earn HTC tokens for data</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 浮动装饰 */}
                <div className="floating-elements">
                    <div className="float-block block-1"></div>
                    <div className="float-block block-2"></div>
                    <div className="float-block block-3"></div>
                    <div className="float-block block-4"></div>
                    <div className="float-block block-5"></div>
                    <div className="float-block block-6"></div>
                </div>
            </div>
        </div>
    );
}
