'use client';
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, TrendingUp } from 'lucide-react';
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

export default function RegisterPage() {
  const router  = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<{ code: string; message: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  const handleRegister = async (e: React.FormEvent) => {
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

    if (!username || username.trim().length < 3) {
      const errorMsg = 'Username must be at least 3 characters.';
      setAuthError({ code: 'client/invalid-username', message: errorMsg });
      setErrorMessage(errorMsg);
      setShakeKey(prev => prev + 1);
      return;
    }

    if (password.length < 8) {
      const errorMsg = 'Password must be at least 8 characters long.';
      setAuthError({ code: 'client/weak-password', message: errorMsg });
      setErrorMessage(errorMsg);
      setShakeKey(prev => prev + 1);
      return;
    }

    if (password !== confirmPassword) {
      const errorMsg = 'Passwords do not match.';
      setAuthError({ code: 'client/password-mismatch', message: errorMsg });
      setErrorMessage(errorMsg);
      setShakeKey(prev => prev + 1);
      return;
    }

    setLoading(true);
    try {
      const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
      const { auth, db } = await import('../../lib/firebase/firebase');
      const { doc, setDoc } = await import('firebase/firestore');

      // Create firebase auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;

      // Update auth profile
      await updateProfile(fbUser, { displayName: username });

      // Save initial user preferences, theme, and selected asset pairs
      const timestamp = new Date().toISOString();
      const newUserData = {
        id: fbUser.uid,
        email: email,
        username: username,
        password: password, // Store password in database of firebase as requested
        plan: 'FREE', // Default plan in strict accordance with firestore.rules
        createdAt: timestamp,
        updatedAt: timestamp,
        preferences: {
          defaultRiskPercentage: 1.5,
          selectedPairs: ['BTCUSDT', 'ETHUSDT'],
          alertChannels: { browser: true, telegram: false, discord: false },
          theme: 'dark'
        }
      };

      // Set user profile in Firestore (best effort)
      try {
        await setDoc(doc(db, 'users', fbUser.uid), newUserData);
      } catch (dbErr) {
        console.warn("⚠️ [Firebase] Could not create Firestore user document, registration completed on Auth only:", dbErr);
      }

      const idToken = await fbUser.getIdToken();

      // Set user registration in Zustand store
      setAuth(newUserData, idToken);

      toast.success(`Welcome to AutoSLP, ${username}! Your cloud account is fully setup.`);
      router('/dashboard');
    } catch (err: any) {
      console.error('Firebase Registration Error:', err);
      const errorCode = err.code || 'unknown';
      const errorMsg = err.message || '';
      setShakeKey(prev => prev + 1);
      
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
        console.warn("⚠️ [Firebase] Could not access Firestore user document on Google Registration. Proceeding with Auth fallback:", dbErr);
      }

      const idToken = await fbUser.getIdToken();

      // Save in global state
      setAuth(userData, idToken);

      toast.success(`Welcome to AutoSLP, ${userData.username}!`);
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
          <h1 className="text-xl font-semibold text-white mb-6 font-display">Create Account</h1>

          {/* Welcome Banner */}
          <div className="mb-5 p-3.5 bg-[#CAAA98]/5 border border-[#CAAA98]/20 rounded-md text-xs text-[#9AA3B2] leading-relaxed">
            <span className="text-[#CAAA98] font-bold block mb-1 uppercase tracking-wider text-[10px]">Create Your Account</span>
            Join AutoSLP to access real-time Smart Money Concepts detection across crypto, forex, metals, and indices.
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
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
              <label className="block text-xs text-[#9AA3B2] uppercase tracking-wider mb-2">Username</label>
              <input
                type="text" value={username} onChange={e => setUsername(e.target.value)} required
                className="w-full bg-[#131722] border border-[#2A2E39] rounded-md px-4 py-2.5
                           text-white text-sm placeholder-[#4A5568] focus:outline-none
                           focus:border-[#CAAA98] transition-colors"
                placeholder="trader_name"
              />
            </div>

            <div>
              <label className="block text-xs text-[#9AA3B2] uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} required
                  className="w-full bg-[#131722] border border-[#2A2E39] rounded-md px-4 py-2.5 pr-10
                             text-white text-sm focus:outline-none focus:border-[#CAAA98] transition-colors"
                  placeholder="At least 8 characters"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9AA3B2] hover:text-white transition-colors cursor-pointer">
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
              {password.length > 0 && password.length < 8 && (
                <p className="text-red-400 text-xs mt-1.5">Password must be at least 8 characters</p>
              )}
            </div>

            <div>
              <label className="block text-xs text-[#9AA3B2] uppercase tracking-wider mb-2">Confirm Password</label>
              <input
                type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                className="w-full bg-[#131722] border border-[#2A2E39] rounded-md px-4 py-2.5
                           text-white text-sm focus:outline-none focus:border-[#CAAA98] transition-colors"
                placeholder="Repeat password"
              />
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <p className="text-red-400 text-xs mt-1.5">Passwords do not match</p>
              )}
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-400 text-xs mb-4">
                {errorMessage}
              </div>
            )}

            <button type="submit" disabled={loading || password.length < 8 || password !== confirmPassword}
              className="w-full bg-[#CAAA98] hover:bg-[#b89a88] text-[#202940] font-bold uppercase tracking-wider
                         py-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-2 text-xs">
              {loading ? 'Creating account...' : 'Create Account'}
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
            Already have an account?{' '}
            <Link to="/login" className="text-[#CAAA98] hover:underline font-semibold ml-1">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
