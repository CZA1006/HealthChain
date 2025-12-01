import './styles/theme.css'
import React, { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import LoginPage from './pages/LoginPage.jsx'
import { healthChainAPI } from './utils/api'


function Root() {
    const [loggedIn, setLoggedIn] = useState(healthChainAPI.isAuthenticated())
    const [sessionInfo, setSessionInfo] = useState(null)
    const [userInfo, setUserInfo] = useState(null)

    useEffect(() => {
        // Check authentication status and get user info
        const checkAuthStatus = async () => {
            if (healthChainAPI.isAuthenticated()) {
                try {
                    const userData = await healthChainAPI.getCurrentUser()
                    setUserInfo(userData.user)
                    setSessionInfo({
                        type: 'api',
                        email: userData.user.email,
                        address: userData.user.walletAddress,
                        ts: Date.now()
                    })
                    setLoggedIn(true)
                } catch (error) {
                    console.error('Failed to get user info:', error)
                    // Auth failed, clean session
                    await healthChainAPI.logout()
                    setLoggedIn(false)
                    setSessionInfo(null)
                    setUserInfo(null)
                }
            }
        }

        checkAuthStatus()
    }, [])

    async function handleLogin(user) {
        // called by LoginPage when login succeeds
        setUserInfo(user)
        setSessionInfo({
            type: 'api',
            email: user.email,
            address: user.walletAddress,
            ts: Date.now()
        })
        setLoggedIn(true)
    }

    async function handleLogout() {
        try {
            await healthChainAPI.logout()
        } catch (error) {
            console.error('Logout error:', error)
        }
        
        setLoggedIn(false)
        setSessionInfo(null)
        setUserInfo(null)
    }

    if (!loggedIn) {
        return <LoginPage onLogin={handleLogin} />
    }

    return (
        <div>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1rem', borderBottom: '1px solid #eee' }}>
                <div style={{ fontFamily: 'sans-serif' }}>
                    
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {userInfo && userInfo.email && <span style={{ fontSize: 14 }}>Signed in as {userInfo.email}</span>}
                    {userInfo && userInfo.walletAddress && <span style={{ fontSize: 14 }}>Wallet: {userInfo.walletAddress}</span>}
                    <button onClick={handleLogout}>Logout</button>
                </div>
            </header>

            <main style={{ padding: '1rem' }}>
                <App />
            </main>
        </div>
    )
}

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <Root />
    </StrictMode>,
)