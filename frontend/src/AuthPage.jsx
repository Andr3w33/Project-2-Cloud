import React, { useState } from 'react';
import { useAuth } from './AuthContext';

const REGISTER_URL = import.meta.env.VITE_AUTH_REGISTER_URL;
const LOGIN_URL = import.meta.env.VITE_AUTH_LOGIN_URL;
const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;
const OAUTH_CALLBACK_URL = import.meta.env.VITE_OAUTH_CALLBACK_URL;

function AuthPage() {
    const { login } = useAuth();
    const [tab, setTab] = useState('login'); // 'login' | 'register'
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGitHubOAuth = () => {
        const oauthUrl =
            `https://github.com/login/oauth/authorize` +
            `?client_id=${GITHUB_CLIENT_ID}` +
            `&redirect_uri=${encodeURIComponent(OAUTH_CALLBACK_URL)}` +
            `&scope=user:email`;
        window.location.href = oauthUrl;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const url = tab === 'login' ? LOGIN_URL : REGISTER_URL;
        const body = tab === 'login'
            ? { email, password }
            : { name, email, password };

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Something went wrong');
                return;
            }

            login(data.token, data.user);
        } catch (err) {
            setError('Network error — please try again');
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        width: '100%',
        padding: '10px 14px',
        borderRadius: '8px',
        border: '1px solid #FF5A5A',
        backgroundColor: '#3a2020',
        color: '#f5e6e0',
        fontSize: '14px',
        outline: 'none'
    };

    const btnPrimary = {
        width: '100%',
        padding: '11px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: '#FF5A5A',
        color: '#fff',
        fontWeight: '600',
        fontSize: '15px',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1
    };

    const btnGitHub = {
        width: '100%',
        padding: '11px',
        borderRadius: '8px',
        border: '1px solid #6e7681',
        backgroundColor: '#24292e',
        color: '#fff',
        fontWeight: '600',
        fontSize: '15px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{ backgroundColor: '#1a0f0f' }}
        >
            <div
                className="w-full max-w-sm p-8 rounded-2xl"
                style={{
                    backgroundColor: '#2a1515',
                    boxShadow: '0 0 40px rgba(255, 90, 90, 0.15)'
                }}
            >
                {/* Logo / title */}
                <h1
                    className="text-2xl font-bold text-center mb-1"
                    style={{ color: '#FFA95A' }}
                >
                    Nutritional Insights
                </h1>
                <p className="text-center text-sm mb-6" style={{ color: '#FF8B5A' }}>
                    Sign in to access the dashboard
                </p>

                {/* Tab switcher */}
                <div className="flex rounded-lg overflow-hidden mb-6" style={{ border: '1px solid #5c2020' }}>
                    {['login', 'register'].map(t => (
                        <button
                            key={t}
                            onClick={() => { setTab(t); setError(''); }}
                            style={{
                                flex: 1,
                                padding: '8px',
                                backgroundColor: tab === t ? '#FF5A5A' : 'transparent',
                                color: tab === t ? '#fff' : '#f5e6e0',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: tab === t ? '600' : '400',
                                fontSize: '14px',
                                textTransform: 'capitalize'
                            }}
                        >
                            {t === 'login' ? 'Sign In' : 'Register'}
                        </button>
                    ))}
                </div>

                {/* Error message */}
                {error && (
                    <div
                        className="mb-4 p-3 rounded-lg text-sm"
                        style={{ backgroundColor: 'rgba(255,90,90,0.15)', color: '#FF5A5A', border: '1px solid #FF5A5A' }}
                    >
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    {tab === 'register' && (
                        <input
                            type="text"
                            placeholder="Full name"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                            style={inputStyle}
                        />
                    )}
                    <input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        style={inputStyle}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        minLength={6}
                        style={inputStyle}
                    />
                    <button type="submit" style={btnPrimary} disabled={loading}>
                        {loading ? 'Please wait...' : tab === 'login' ? 'Sign In' : 'Create Account'}
                    </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-3 my-4">
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#5c2020' }} />
                    <span style={{ color: '#8a5050', fontSize: '12px' }}>or continue with</span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#5c2020' }} />
                </div>

                {/* GitHub OAuth */}
                <button onClick={handleGitHubOAuth} style={btnGitHub}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                    </svg>
                    Continue with GitHub
                </button>
            </div>
        </div>
    );
}

export default AuthPage;
