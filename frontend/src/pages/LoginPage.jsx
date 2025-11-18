// src/pages/LoginPage.jsx - 更新版本
import React, { useState } from 'react';
import { ethers } from 'ethers';
import { healthChainAPI } from '../utils/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';

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
    );
}
