import React, { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import LoginPage from './pages/LoginPage.jsx'

function Root() {
    const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('session'))
    const [sessionInfo, setSessionInfo] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('session') || 'null')
        } catch {
            return null
        }
    })

    useEffect(() => {
        function onStorage(e) {
            if (e.key === 'session') {
                setLoggedIn(!!e.newValue)
                try {
                    setSessionInfo(e.newValue ? JSON.parse(e.newValue) : null)
                } catch {
                    setSessionInfo(null)
                }
            }
        }
        window.addEventListener('storage', onStorage)
        return () => window.removeEventListener('storage', onStorage)
    }, [])

    function handleLogin() {
        // called by LoginPage when login succeeds
        const s = localStorage.getItem('session')
        setLoggedIn(!!s)
        try { setSessionInfo(s ? JSON.parse(s) : null) } catch { setSessionInfo(null) }
    }

    function handleLogout() {
        // remove session and update state
        localStorage.removeItem('session')
        setLoggedIn(false)
        setSessionInfo(null)
        // notify other tabs (best-effort)
        try {
            const storageEvent = new StorageEvent('storage', {
                key: 'session',
                oldValue: null,
                newValue: null,
                url: location.href,
            })
            window.dispatchEvent(storageEvent)
        } catch {
            // ignore if StorageEvent construction is restricted
        }
    }

    if (!loggedIn) {
        return <LoginPage onLogin={handleLogin} />
    }

    return (
        <div>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1rem', borderBottom: '1px solid #eee' }}>
                <div style={{ fontFamily: 'sans-serif' }}>
                    <strong>App</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {sessionInfo && sessionInfo.email && <span style={{ fontSize: 14 }}>Signed in as {sessionInfo.email}</span>}
                    {sessionInfo && sessionInfo.address && <span style={{ fontSize: 14 }}>Wallet: {sessionInfo.address}</span>}
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