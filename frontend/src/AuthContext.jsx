import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    useEffect(() => {
        // Handle OAuth redirect: GitHub callback puts #token=...&name=... in the URL hash
        const hash = window.location.hash;
        if (hash.startsWith('#token=') || hash.includes('&token=') || hash.includes('token=')) {
            const params = new URLSearchParams(hash.slice(1));
            const hashToken = params.get('token');
            const hashName = params.get('name');
            const hashError = params.get('error');

            if (hashError) {
                console.error('OAuth error:', hashError);
            } else if (hashToken) {
                const userData = { name: decodeURIComponent(hashName || 'User') };
                localStorage.setItem('auth_token', hashToken);
                localStorage.setItem('auth_user', JSON.stringify(userData));
                setToken(hashToken);
                setUser(userData);
            }
            // Clear the hash from the URL without reloading
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
            setAuthLoading(false);
            return;
        }

        // Restore session from localStorage on page load
        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('auth_user');
        if (storedToken && storedUser) {
            try {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
            } catch {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('auth_user');
            }
        }
        setAuthLoading(false);
    }, []);

    const login = (tokenValue, userData) => {
        localStorage.setItem('auth_token', tokenValue);
        localStorage.setItem('auth_user', JSON.stringify(userData));
        setToken(tokenValue);
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, authLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
