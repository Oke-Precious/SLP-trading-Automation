'use client';
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, TrendingUp, X } from 'lucide-react';
import { apiClient } from '../../lib/api/client';
import { useAuthStore } from '../../store/useAuthStore';
import toast from 'react-hot-toast';
import { motion } from 'motion/react';

function getAuthErrorMessage(errorCode: string, errorMsg?: string): string {
  let code = errorCode;
  const msgLower = (errorMsg || '').toLowerCase();
  
  if (code === 'unknown' || !code) {
    if (msgLower.includes('invalid-credential') || msgLower.includes('invalid_credential')) {
      code = 'auth/invalid-credential';
    } else if (msgLower.includes('user-not-found')) {
      code = 'auth/user-not-found';
    } else if (msgLower.includes('wrong-password')) {
      code = 'auth/wrong-password';
    } else if (msgLower.includes('email-already-in-use')) {
      code = 'auth/email-already-in-use';
    } else if (msgLower.includes('weak-password')) {
      code = 'auth/weak-password';
    } else if (msgLower.includes('password-does-not-meet-requirements')) {
      code = 'auth/password-does-not-meet-requirements';
    } else if (msgLower.includes('invalid-email')) {
      code = 'auth/invalid-email';
    } else if (msgLower.includes('too-many-requests')) {
      code = 'auth/too-many-requests';
    } else if (msgLower.includes('network-request-failed')) {
      code = 'auth/network-request-failed';
    } else if (msgLower.includes('popup-closed-by-user')) {
      code = 'auth/popup-closed-by-user';
    } else if (msgLower.includes('cancelled-popup-request')) {
      code = 'auth/cancelled-popup-request';
    }
  }

  const messages: Record<string, string> = {
    'auth/user-not-found': 'No account found with this email. Please check your email or create an account.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/email-already-in-use': 'An account with this email already exists. Try signing in instead.',
    'auth/weak-password': 'Your password must be at least 8 characters.',
    'auth/password-does-not-meet-requirements': 'Your password does not meet the complexity requirements. Please include an uppercase letter, a numeric character, and a special character.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/too-many-requests': 'Too many failed attempts. Please wait a few minutes before trying again.',
    'auth/network-request-failed': 'Connection error. Please check your internet and try again.',
    'auth/popup-closed-by-user': 'Sign-in was cancelled. Please try again.',
    'auth/cancelled-popup-request': 'Sign-in was cancelled. Please try again.',
    'auth/invalid-credential': 'Your email or password is incorrect. Please try again.',
  };
  return messages[code] || 'Something went wrong. Please try again.';
}

export default function LoginPage() {
  const router  = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<boolean>(false);
  const [authError, setAuthError] = useState<{ code: string; message: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setErrorMessage(null);

    // Clean client-side pre-validation to avoid hitting backend if details are incorrectly structured
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      const errorMsg = 'Please enter a valid email address format.';
      setAuthError({ code: 'client/invalid-email', message: errorMsg });
      setErrorMessage(errorMsg);
      setShakeKey(prev => prev + 1);
      return;
    }

    if (!password || password.length < 6) {
      const errorMsg = 'Password must be at least 6 characters.';
      setAuthError({ code: 'client/invalid-password', message: errorMsg });
      setErrorMessage(errorMsg);
      setShakeKey(prev => prev + 1);
      return;
    }

    setLoading(true);
    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const { auth, db, getDocWithTimeout } = await import('../../lib/firebase/firebase');
      const { doc } = await import('firebase/firestore');

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;

      let userData: any = {
        id: fbUser.uid,
        email: fbUser.email,
        username: fbUser.displayName || fbUser.email?.split('@')[0] || 'Trader',
        plan: 'FREE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userSnap = await getDocWithTimeout(userDocRef);
        if (userSnap && userSnap.exists()) {
          userData = userSnap.data();

          // Password Synchronization
          if (userData.password && userData.password !== password) {
            try {
              const { setDoc, doc } = await import('firebase/firestore');
              await setDoc(doc(db, 'users', fbUser.uid), { password }, { merge: true });
              userData.password = password;
              console.log('🔑 [AutoSLP Auth] Restored/reset password synchronized successfully.');
            } catch (syncErr) {
              console.warn('[AutoSLP Auth] Local password synchronization failed:', syncErr);
            }
          }
        }
      } catch (dbErr) {
        console.warn("⚠️ [Firebase] Could not access Firestore user document on credential login. Proceeding with Auth fallback:", dbErr);
      }

      const idToken = await fbUser.getIdToken();

      // Save in global state
      setAuth(userData, idToken);

      toast.success(`Welcome back, ${userData.username}!`);
      router('/dashboard');
    } catch (err: any) {
      console.error('Firebase Login Error:', err);
      const errorCode = err.code || 'unknown';
      const errorMsg = err.message || '';
      setShakeKey(prev => prev + 1); // Animate and shake on any backend error too!
      
      const isPopupError = 
        errorCode.toLowerCase().includes('popup') || 
        errorMsg.toLowerCase().includes('popup') || 
        errorCode === 'auth/cancelled-popup-request' || 
        errorMsg.toLowerCase().includes('cancelled-popup-request');

      if (isPopupError) {
        setErrorMessage(null);
        setAuthError(null);
      } else {
        const friendlyMsg = getAuthErrorMessage(errorCode, errorMsg);
        setErrorMessage(friendlyMsg);
        setAuthError({ code: errorCode, message: friendlyMsg });
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(false);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!resetEmail || !emailRegex.test(resetEmail)) {
      setResetError('Please enter a valid email address format.');
      toast.error('Please enter a valid email address.');
      return;
    }

    setResetLoading(true);
    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      const { auth } = await import('../../lib/firebase/firebase');
      await sendPasswordResetEmail(auth, resetEmail);
      toast.success('Password reset email sent! Please check your inbox.');
      setResetSuccess(true);
    } catch (err: any) {
      console.error('Password reset error:', err);
      let errorMsg = err.message || 'Failed to send password reset email.';
      if (err.code === 'auth/user-not-found') {
        errorMsg = 'No registered user was found with this email address.';
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = 'Invalid email address format.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMsg = 'Too many password reset requests. Please wait a moment and try again.';
      }
      setResetError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setResetLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setAuthError(null);
    setErrorMessage(null);
    try {
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const { auth, db, getDocWithTimeout } = await import('../../lib/firebase/firebase');
      const { doc, setDoc } = await import('firebase/firestore');

      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const fbUser = userCredential.user;

      let userData: any = {
        id: fbUser.uid,
        email: fbUser.email,
        username: fbUser.displayName || fbUser.email?.split('@')[0] || 'Trader',
        plan: 'FREE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        preferences: {
          defaultRiskPercentage: 1.5,
          selectedPairs: ['BTCUSDT', 'ETHUSDT'],
          alertChannels: { browser: true, telegram: false, discord: false },
          theme: 'dark'
        }
      };

      try {
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userSnap = await getDocWithTimeout(userDocRef);
        if (userSnap && userSnap.exists()) {
          userData = userSnap.data();
        } else {
          await setDoc(userDocRef, userData);
        }
      } catch (dbErr) {
        console.warn("⚠️ [Firebase] Could not access Firestore user document on Google Sign-in. Proceeding with Auth fallback:", dbErr);
      }

      const idToken = await fbUser.getIdToken();

      // Save in global state
      setAuth(userData, idToken);

      toast.success(`Welcome, ${userData.username}!`);
      router('/dashboard');
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      const errorCode = err.code || 'unknown';
      const errorMsg = err.message || '';
      const isPopupError = 
        errorCode.toLowerCase().includes('popup') || 
        errorMsg.toLowerCase().includes('popup') || 
        errorCode === 'auth/cancelled-popup-request' || 
        errorMsg.toLowerCase().includes('cancelled-popup-request');

      if (isPopupError) {
        setErrorMessage(null);
        setAuthError(null);
      } else {
        const friendlyMsg = getAuthErrorMessage(errorCode, errorMsg);
        setErrorMessage(friendlyMsg);
        setAuthError({ code: errorCode, message: friendlyMsg });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#131722] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-fadeIn">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="w-8 h-8 text-[#CAAA98]" />
            <span className="text-2xl font-bold text-white tracking-tight">AutoSLP</span>
          </div>
          <p className="text-xs text-[#CAAA98] tracking-widest uppercase">Directional Bias System</p>
        </div>

        {/* Card */}
        <div className="bg-[#1E2433] border border-[#2A2E39] rounded-xl p-8 shadow-2xl">
          <h1 className="text-xl font-semibold text-white mb-6 font-display">Sign In</h1>

          {/* Welcome Banner */}
          <div className="mb-5 p-3.5 bg-[#CAAA98]/5 border border-[#CAAA98]/20 rounded-md text-xs text-[#9AA3B2] leading-relaxed">
            <span className="text-[#CAAA98] font-bold block mb-1 uppercase tracking-wider text-[10px]">Welcome Back</span>
            Sign in to access your SLP dashboard, live detections, and directional bias analysis.
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-[#9AA3B2] uppercase tracking-wider mb-2">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full bg-[#131722] border border-[#2A2E39] rounded-md px-4 py-2.5
                           text-white text-sm placeholder-[#4A5568] focus:outline-none
                           focus:border-[#CAAA98] transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs text-[#9AA3B2] uppercase tracking-wider">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setShowResetModal(true);
                  }}
                  className="text-xs text-[#CAAA98] hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} required
                  className="w-full bg-[#131722] border border-[#2A2E39] rounded-md px-4 py-2.5 pr-10
                             text-white text-sm focus:outline-none focus:border-[#CAAA98] transition-colors"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9AA3B2] hover:text-white transition-colors cursor-pointer">
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-400 text-xs mb-4">
                {errorMessage}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-[#CAAA98] hover:bg-[#b89a88] text-[#202940] font-bold uppercase tracking-wider
                         py-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-2 text-xs">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-[#2A2E39]"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#1E2433] px-2 text-[#9AA3B2]">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-[#131722] hover:bg-[#1c2130] text-white border border-[#2A2E39] font-semibold
                       py-3 px-4 rounded-md transition-all flex items-center justify-center gap-2.5 cursor-pointer text-xs uppercase tracking-wider
                       disabled:opacity-50 hover:border-[#CAAA98]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M12 5.04c1.67 0 3.2.58 4.4 1.71l3.24-3.24C17.65 1.57 14.99 1 12 1 7.37 1 3.42 3.65 1.5 7.5l3.86 3.01C6.27 7.51 8.9 5.04 12 5.04z"
              />
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.46c-.28 1.48-1.12 2.74-2.38 3.58l3.68 2.87c2.16-1.99 3.43-4.92 3.43-8.55z"
              />
              <path
                fill="#FBBC05"
                d="M5.36 14.49c-.27-.81-.42-1.68-.42-2.58s.16-1.77.42-2.58L1.5 6.32C.54 8.24 0 10.37 0 12.5s.54 4.26 1.5 6.18l3.86-3.01c-.27-.81-.42-1.68-.42-2.58z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53L1.5 15.96C3.33 19.8 7.35 23 12 23z"
              />
            </svg>
            Google Account
          </button>

          <p className="mt-6 text-center text-xs text-[#9AA3B2]">
            No account?{' '}
            <Link to="/register" className="text-[#CAAA98] hover:underline font-semibold ml-1">Create one</Link>
          </p>
        </div>
      </div>

      {showResetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#1E2433] border border-[#2A2E39] rounded-xl p-6 shadow-2xl w-full max-w-md relative">
            <button
              onClick={() => {
                setShowResetModal(false);
                setResetError(null);
                setResetSuccess(false);
              }}
              className="absolute right-4 top-4 text-[#9AA3B2] hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
            <h2 className="text-lg font-semibold text-white mb-2 font-display">Reset Password</h2>
            
            {resetSuccess ? (
              <div className="space-y-4 py-2">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs leading-relaxed text-emerald-200">
                  <span className="text-emerald-400 font-bold block mb-1 uppercase tracking-wider text-[10px]">
                    ✓ Email Despatched Successfully
                  </span>
                  We have sent a secure password reset link to <strong className="text-white">{resetEmail}</strong>. Please check your inbox and follow instructions to reset your password.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(false);
                    setResetSuccess(false);
                    setResetError(null);
                  }}
                  className="w-full bg-[#CAAA98] hover:bg-[#b89a88] text-[#202940] font-bold uppercase tracking-wider py-2.5 rounded-md transition-colors text-xs cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs text-[#9AA3B2] mb-5 leading-normal">
                  Enter your email address below, and we'll send you a link to reset your password and regain access to your account.
                </p>

                {resetError && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs leading-relaxed text-red-200 animate-fadeIn">
                    <span className="text-red-400 font-bold block mb-1 uppercase tracking-wider text-[9px]">
                      ⚠️ Reset Error
                    </span>
                    {resetError}
                  </div>
                )}

                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-[#9AA3B2] uppercase tracking-wider mb-2">Email Address</label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      required
                      className="w-full bg-[#131722] border border-[#2A2E39] rounded-md px-4 py-2.5
                                 text-white text-sm placeholder-[#4A5568] focus:outline-none
                                 focus:border-[#CAAA98] transition-colors"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowResetModal(false);
                        setResetError(null);
                        setResetSuccess(false);
                      }}
                      className="flex-1 bg-[#131722] hover:bg-[#1c2130] text-white border border-[#2A2E39] font-semibold
                                 py-2.5 rounded-md transition-colors text-xs uppercase tracking-wider cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="flex-1 bg-[#CAAA98] hover:bg-[#b89a88] text-[#202940] font-bold uppercase tracking-wider
                                 py-2.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-xs"
                    >
                      {resetLoading ? 'Sending...' : 'Send Link'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
