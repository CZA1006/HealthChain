import React, { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import LoginPage from './pages/LoginPage.jsx'

function Root() {
    const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('session'))

    useEffect(() => {
        function onStorage(e) {
            if (e.key === 'session') {
                setLoggedIn(!!e.newValue)
            }
        }
        window.addEventListener('storage', onStorage)
        return () => window.removeEventListener('storage', onStorage)
    }, [])

    return loggedIn ? <App /> : <LoginPage onLogin={() => setLoggedIn(true)} />
}

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <Root />
    </StrictMode>,
)