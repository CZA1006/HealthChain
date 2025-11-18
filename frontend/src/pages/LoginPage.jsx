import React, { useState } from 'react';
import { ethers } from 'ethers';
import { healthChainAPI } from '../utils/api';

export default function LoginPage({ onLogin }) {
    const [mode, setMode] = useState('login'); // 'login' or 'register'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');

    async function handleRegister(e) {
        e.preventDefault();
        if (!email || !password) {
            setMessage('Please enter email and password');
            return;
        }

        try {
            await healthChainAPI.register({
                username: email.split('@')[0],
                email: email,
                password: password,
                walletAddress: null
            });
            
            setMessage('Registration successful, you can now log in');
            setMode('login');
            setPassword('');
        } catch (error) {
            setMessage(error.message || 'Registration failed');
        }
    }

    async function handleLogin(e) {
        e.preventDefault();
        if (!email || !password) {
            setMessage('Please enter email and password');
            return;
        }

        try {
            const result = await healthChainAPI.login({
                username: email,
                password: password
            });
            
            setMessage('Login successful');
            setPassword('');
            if (onLogin) onLogin(result.user);
        } catch (error) {
            setMessage(error.message || 'Login failed');
        }
    }

    async function handleWalletLogin() {
        setMessage('');
        try {
            if (!window.ethereum) {
                setMessage('No Ethereum wallet detected (e.g., MetaMask)');
                return;
            }
            
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            await provider.send('eth_requestAccounts', []);
            const signer = provider.getSigner();
            const address = await signer.getAddress();

            // 使用钱包地址直接登录
            const result = await healthChainAPI.login({
                walletAddress: address
            });
            
            setMessage(`Wallet login successful: ${address}`);
            if (onLogin) onLogin(result.user);
        } catch (err) {
            console.error(err);
            setMessage('Wallet login failed: ' + (err.message || err));
        }
    }

    return (
        <div style={{ maxWidth: 420, margin: '2rem auto', fontFamily: 'sans-serif' }}>
            <h2>Login</h2>

            <div style={{ marginBottom: 12 }}>
                <button onClick={() => setMode('login')} disabled={mode === 'login'}>Password Login</button>
                <button onClick={() => setMode('register')} disabled={mode === 'register'} style={{ marginLeft: 8 }}>Register</button>
                <button onClick={handleWalletLogin} style={{ marginLeft: 16 }}>Login with Wallet</button>
            </div>

            {mode !== 'register' ? (
                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: 8 }}>
                        <label>Email</label><br />
                        <input value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                        <label>Password</label><br />
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
                    </div>
                    <button type="submit">Login</button>
                </form>
            ) : (
                <form onSubmit={handleRegister}>
                    <div style={{ marginBottom: 8 }}>
                        <label>Email</label><br />
                        <input value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                        <label>Password</label><br />
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
                    </div>
                    <button type="submit">Register</button>
                </form>
            )}

            {message && <p style={{ marginTop: 12 }}>{message}</p>}
        </div>
    );
}
