'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const [tab, setTab] = useState<'login' | 'signup'>('login');

  // Login state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Signup state
  const [signupFullName, setSignupFullName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [signupError, setSignupError] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);

  const { login, register } = useAuth();

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      await login(loginUsername, loginPassword);
    } catch (err: any) {
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.error?.detail ||
        'Invalid username or password.';
      setLoginError(detail);
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    setSignupError('');
    if (signupPassword !== signupConfirm) {
      setSignupError('Passwords do not match.');
      return;
    }
    setSignupLoading(true);
    try {
      await register({
        full_name: signupFullName,
        username: signupUsername,
        email: signupEmail,
        password: signupPassword,
        confirm_password: signupConfirm,
      });
    } catch (err: any) {
      const detail = err.response?.data?.error?.detail;
      if (detail && typeof detail === 'object') {
        const firstErrorKey = Object.keys(detail)[0];
        const firstErrorMessage = detail[firstErrorKey];
        setSignupError(
          Array.isArray(firstErrorMessage) ? firstErrorMessage[0] : String(firstErrorMessage)
        );
      } else if (typeof detail === 'string') {
        setSignupError(detail);
      } else {
        setSignupError('Registration failed. Please try again.');
      }
    } finally {
      setSignupLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F8F9FA' }}>

      {/* ── Left Panel: IOCL Branding ── */}
      <div
        className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden"
        style={{ backgroundColor: '#2C3482' }}
      >
        {/* Dot-grid background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* Decorative orange circles */}
        <div
          className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full opacity-20"
          style={{ backgroundColor: '#F37021' }}
        />
        <div
          className="absolute -top-16 -left-16 w-64 h-64 rounded-full opacity-10"
          style={{ backgroundColor: '#F37021' }}
        />

        <div className="relative z-10 flex flex-col items-center px-12 text-center text-white">
          {/* Logo container */}
          <div
            className="flex items-center justify-center w-52 h-52 rounded-2xl mb-6 shadow-2xl"
            style={{ backgroundColor: 'white', padding: '6px' }}
          >
            <img
              src="/indianoil.png"
              alt="IndianOil"
              className="w-full h-full object-contain"
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                el.style.display = 'none';
                el.parentElement!.innerHTML =
                  '<div style="width:100%;height:100%;border-radius:50%;background:#F37021;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:13px;text-align:center;line-height:1.4">इंडियन<br/>ऑयल</div>';
              }}
            />
          </div>

          {/* PRPC heading */}
          <div className="mb-2">
            <h2
              className="text-2xl font-bold tracking-[0.18em] uppercase"
              style={{ color: '#F37021' }}
            >
              PRPC
            </h2>
          </div>

          <div
            className="w-12 h-1 rounded-full mb-6"
            style={{ backgroundColor: '#F37021' }}
          />

          <h1 className="text-4xl font-bold tracking-tight mb-4 leading-tight">
            Quality Control<br />Management System
          </h1>
          <p
            className="text-lg max-w-sm leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.75)' }}
          >
            Advanced calibration tracking and alert management for enterprise instrumentation.
          </p>

          {/* Stats strip */}
          <div className="flex gap-8 mt-12 pt-8 border-t border-white/20 w-full justify-center">
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: '#F37021' }}>3-Tier</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Alert System</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: '#F37021' }}>24/7</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Monitoring</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: '#F37021' }}>100%</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Secure</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Panel: Auth Forms ── */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-24">
        <div className="w-full max-w-md mx-auto">

          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center mb-3 shadow-lg"
              style={{ backgroundColor: '#2C3482', padding: '8px' }}
            >
              <img
                src="/indianoil.png"
                alt="IndianOil"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            <h2
              className="text-lg font-bold tracking-widest uppercase"
              style={{ color: '#F37021' }}
            >
              PRPC
            </h2>
            <h1 className="text-base font-semibold text-center mt-1" style={{ color: '#2C3482' }}>
              Industrial Integrity System
            </h1>
          </div>

          {/* Tab Switcher */}
          <div
            className="flex rounded-xl p-1 mb-8"
            style={{ backgroundColor: '#E9ECEF' }}
          >
            <button
              type="button"
              onClick={() => { setTab('login'); setLoginError(''); }}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
              style={
                tab === 'login'
                  ? { backgroundColor: 'white', color: '#2C3482', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }
                  : { color: '#6B7280', backgroundColor: 'transparent' }
              }
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setTab('signup'); setSignupError(''); }}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
              style={
                tab === 'signup'
                  ? { backgroundColor: 'white', color: '#2C3482', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }
                  : { color: '#6B7280', backgroundColor: 'transparent' }
              }
            >
              Create Account
            </button>
          </div>

          {/* ── LOGIN FORM ── */}
          {tab === 'login' && (
            <div>
              <div className="mb-7">
                <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
                <p className="text-gray-500 text-sm mt-1">Sign in to access your dashboard.</p>
              </div>

              {loginError && (
                <div
                  className="mb-5 p-3.5 rounded-lg border-l-4 text-sm font-medium"
                  style={{ backgroundColor: '#FEF2F2', borderColor: '#EF4444', color: '#B91C1C' }}
                >
                  {loginError}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                  <input
                    type="text"
                    placeholder="Enter your username"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm outline-none text-gray-900 bg-white"
                    style={{ fontFamily: 'inherit' }}
                    onFocus={(e) => (e.target.style.borderColor = '#2C3482')}
                    onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm outline-none text-gray-900 bg-white"
                    style={{ fontFamily: 'inherit' }}
                    onFocus={(e) => (e.target.style.borderColor = '#2C3482')}
                    onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-2.5 rounded-lg text-white text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: loginLoading ? '#6B7280' : '#2C3482',
                    cursor: loginLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loginLoading ? 'Signing in…' : 'Sign In →'}
                </button>
              </form>

              <p className="text-center text-xs text-gray-400 mt-6">
                Protected system · Authorized personnel only
              </p>
            </div>
          )}

          {/* ── SIGNUP FORM ── */}
          {tab === 'signup' && (
            <div>
              <div className="mb-7">
                <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
                <p className="text-gray-500 text-sm mt-1">Join as a User to view instrument data.</p>
              </div>

              {signupError && (
                <div
                  className="mb-5 p-3.5 rounded-lg border-l-4 text-sm font-medium"
                  style={{ backgroundColor: '#FEF2F2', borderColor: '#EF4444', color: '#B91C1C' }}
                >
                  {signupError}
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    placeholder="Your full name"
                    value={signupFullName}
                    onChange={(e) => setSignupFullName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm outline-none text-gray-900 bg-white"
                    style={{ fontFamily: 'inherit' }}
                    onFocus={(e) => (e.target.style.borderColor = '#2C3482')}
                    onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                  <input
                    type="text"
                    placeholder="Choose a username"
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm outline-none text-gray-900 bg-white"
                    style={{ fontFamily: 'inherit' }}
                    onFocus={(e) => (e.target.style.borderColor = '#2C3482')}
                    onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm outline-none text-gray-900 bg-white"
                    style={{ fontFamily: 'inherit' }}
                    onFocus={(e) => (e.target.style.borderColor = '#2C3482')}
                    onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                    <input
                      type="password"
                      placeholder="Min 8 chars"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      minLength={8}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm outline-none text-gray-900 bg-white"
                      style={{ fontFamily: 'inherit' }}
                      onFocus={(e) => (e.target.style.borderColor = '#2C3482')}
                      onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm</label>
                    <input
                      type="password"
                      placeholder="Repeat password"
                      value={signupConfirm}
                      onChange={(e) => setSignupConfirm(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm outline-none text-gray-900 bg-white"
                      style={{ fontFamily: 'inherit' }}
                      onFocus={(e) => (e.target.style.borderColor = '#2C3482')}
                      onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={signupLoading}
                  className="w-full py-2.5 rounded-lg text-white text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: signupLoading ? '#6B7280' : '#F37021',
                    cursor: signupLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {signupLoading ? 'Creating account…' : 'Create Account →'}
                </button>
              </form>

              <p className="text-center text-xs text-gray-400 mt-5">
                You will be registered as a <strong>User</strong>. For Admin access, contact the system administrator.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
