import React, { useState } from 'react';
import { hashPassword, generateSalt, verifyPassword } from '../utils/crypto';
import { ethers } from 'ethers';

export default function LoginPage({ onLogin }) {
    const [mode, setMode] = useState('login'); // 'login' or 'register'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');

    function saveUser(email, salt, hash) {
        const users = JSON.parse(localStorage.getItem('users') || '{}');
        users[email] = { salt, hash };
        localStorage.setItem('users', JSON.stringify(users));
    }

    function getUser(email) {
        const users = JSON.parse(localStorage.getItem('users') || '{}');
        return users[email];
    }

    async function handleRegister(e) {
        e.preventDefault();
        if (!email || !password) {
            setMessage('Please enter email and password');
            return;
        }
        const existing = getUser(email);
        if (existing) {
            setMessage('User already exists, please log in');
            return;
        }
        const salt = await generateSalt();
        const hash = await hashPassword(password, salt);
        saveUser(email, salt, hash);
        setMessage('Registration successful (demo), you can now log in');
        setMode('login');
        setPassword('');
    }

    async function handleLogin(e) {
        e.preventDefault();
        if (!email || !password) {
            setMessage('Please enter email and password');
            return;
        }
        const user = getUser(email);
        if (!user) {
            setMessage('User not found, please register first');
            return;
        }
        const ok = await verifyPassword(password, user.salt, user.hash);
        if (ok) {
            localStorage.setItem('session', JSON.stringify({ type: 'password', email, ts: Date.now() }));
            setMessage('Login successful (demo)');
            setPassword('');
            if (onLogin) onLogin();
        } else {
            setMessage('Incorrect password');
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

            const nonce = Math.floor(Math.random() * 1e9).toString();
            localStorage.setItem(`nonce:${address}`, nonce);

            const signature = await signer.signMessage(`Login nonce: ${nonce}`);
            localStorage.setItem('session', JSON.stringify({ type: 'wallet', address, signature, ts: Date.now() }));

            setMessage(`Wallet login successful: ${address}`);
            if (onLogin) onLogin();
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
