'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, TrendingUp, X } from 'lucide-react';
import { apiClient } from '../../lib/api/client';
import { useAuthStore } from '../../store/useAuthStore';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router  = useRouter();
  const setAuth = useAuthStore(s => s.setAuth);
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Check local Sandbox Users backup database FIRST
    try {
      const storedUsers = typeof window !== 'undefined' ? localStorage.getItem('autoslp_sandbox_users') : null;
      const localUsers = storedUsers ? JSON.parse(storedUsers) : [];
      const match = localUsers.find((u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
      
      if (match) {
        toast.loading('Logging into local Sandbox session...', { id: 'sandbox-init-login', duration: 1500 });
        setTimeout(() => {
          setAuth(match.userData, 'sandbox-token-session-' + Date.now());
          toast.success(`Welcome back, ${match.userData.username}! (Sandbox Mode)`, { id: 'sandbox-init-login' });
          router.push('/dashboard');
        }, 1000);
        return;
      }
    } catch (storageErr) {
      console.error('Local Users lookup error:', storageErr);
    }

    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const { auth, db } = await import('../../lib/firebase/firebase');
      const { doc, getDoc } = await import('firebase/firestore');

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;

      // Retrieve user specifications directly from secure Firestore ruleset
      const userDocRef = doc(db, 'users', fbUser.uid);
      const userSnap = await getDoc(userDocRef);

      let userData: any = {
        id: fbUser.uid,
        email: fbUser.email,
        username: fbUser.displayName || fbUser.email?.split('@')[0] || 'Trader',
        plan: 'FREE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (userSnap.exists()) {
        userData = userSnap.data();

        // STRICT VERIFICATION: Verify input password against the password saved in the Firestore database!
        if (userData.password && userData.password !== password) {
          const { signOut } = await import('firebase/auth');
          await signOut(auth);
          throw { code: 'auth/wrong-password', message: 'Incorrect password according to database.' };
        }
      }

      const idToken = await fbUser.getIdToken();

      // Save in global state
      setAuth(userData, idToken);

      toast.success(`Welcome back, ${userData.username}!`);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Firebase Login Error:', err);
      let errorMsg = err.message || 'Login failed';
      if (err.code === 'auth/operation-not-allowed' || errorMsg.includes('auth/operation-not-allowed') || (email === 'demo@autoslp.com' && password === 'Demo@1234')) {
        // Automatically activate Sandbox fallback session using custom login email or demo
        toast.loading('Initializing local Sandbox user session...', { id: 'sandbox-init-login', duration: 3000 });
        
        setTimeout(() => {
          const timestamp = new Date().toISOString();
          const targetUsername = email === 'demo@autoslp.com' ? 'Demo Trader' : email.split('@')[0];
          const sandboxUserData = {
            id: 'sandbox-' + Math.random().toString(36).substring(2, 9),
            email: email,
            username: targetUsername,
            plan: 'FREE',
            isSandbox: true,
            createdAt: timestamp,
            updatedAt: timestamp,
            preferences: {
              defaultRiskPercentage: 1.5,
              selectedPairs: ['BTCUSDT', 'ETHUSDT'],
              alertChannels: { browser: true, telegram: false, discord: false },
              theme: 'dark'
            }
          };

          setAuth(sandboxUserData, 'sandbox-token-session-' + Date.now());
          toast.success(`Welcome back, ${targetUsername}! Connected to local sandbox.`, { id: 'sandbox-init-login' });
          router.push('/dashboard');
        }, 1200);
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errorMsg = 'Incorrect email or password. Please verify your details.';
        toast.error(errorMsg);
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = 'Invalid email address format.';
        toast.error(errorMsg);
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error('Please enter your email address.');
      return;
    }
    setResetLoading(true);
    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      const { auth } = await import('../../lib/firebase/firebase');
      await sendPasswordResetEmail(auth, resetEmail);
      toast.success('Password reset email sent! Please check your inbox.');
      setShowResetModal(false);
      setResetEmail('');
    } catch (err: any) {
      console.error('Password reset error:', err);
      let errorMsg = err.message || 'Failed to send password reset email.';
      if (err.code === 'auth/user-not-found') {
        errorMsg = 'No user found with this email address.';
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = 'Invalid email address format.';
      }
      toast.error(errorMsg);
    } finally {
      setResetLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const { auth, db } = await import('../../lib/firebase/firebase');
      const { doc, getDoc, setDoc } = await import('firebase/firestore');

      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const fbUser = userCredential.user;

      // Retrieve or create user profile in secure Firestore ruleset
      const userDocRef = doc(db, 'users', fbUser.uid);
      const userSnap = await getDoc(userDocRef);

      let userData: any;
      if (userSnap.exists()) {
        userData = userSnap.data();
      } else {
        const timestamp = new Date().toISOString();
        userData = {
          id: fbUser.uid,
          email: fbUser.email,
          username: fbUser.displayName || fbUser.email?.split('@')[0] || 'Trader',
          plan: 'FREE',
          createdAt: timestamp,
          updatedAt: timestamp,
          preferences: {
            defaultRiskPercentage: 1.5,
            selectedPairs: ['BTCUSDT', 'ETHUSDT'],
            alertChannels: { browser: true, telegram: false, discord: false },
            theme: 'dark'
          }
        };
        await setDoc(userDocRef, userData);
      }

      const idToken = await fbUser.getIdToken();

      // Save in global state
      setAuth(userData, idToken);

      toast.success(`Welcome, ${userData.username}!`);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err.code === 'auth/popup-closed-by-user' || err.message?.includes('popup-closed-by-user')) {
        toast.error('Google popup was closed or blocked. Manual Sign-In or Demo Account login below is recommended inside the preview.', { duration: 6000 });
      } else {
        toast.error(err.message || 'Google Sign-In failed');
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

          {/* Helpful sandbox sandbox/iframe alert */}
          <div className="mb-5 p-3.5 bg-[#131722]/60 border border-[#2A2E39]/80 rounded-md text-xs text-[#9AA3B2] leading-relaxed">
            <span className="text-[#CAAA98] font-bold block mb-1 uppercase tracking-wider text-[10px]">💡 Running in Preview Mode?</span>
            If Google popup is blocked or closed by your browser, sign in with the **Demo Account** or manually type your details—local sandbox sessions are supported seamlessly!
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

          {/* Demo credentials */}
          <div className="mt-5 p-3.5 bg-[#131722] border border-[#2A2E39] rounded-md text-xs text-[#9AA3B2]">
            <p className="font-semibold text-[#CAAA98] mb-1.5 uppercase tracking-wider text-[10px]">Demo Account</p>
            <p className="font-mono">Email: demo@autoslp.com</p>
            <p className="font-mono">Password: Demo@1234</p>
          </div>

          <p className="mt-6 text-center text-xs text-[#9AA3B2]">
            No account?{' '}
            <Link href="/register" className="text-[#CAAA98] hover:underline font-semibold ml-1">Create one</Link>
          </p>
        </div>
      </div>

      {showResetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#1E2433] border border-[#2A2E39] rounded-xl p-6 shadow-2xl w-full max-w-md relative">
            <button
              onClick={() => setShowResetModal(false)}
              className="absolute right-4 top-4 text-[#9AA3B2] hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
            <h2 className="text-lg font-semibold text-white mb-2 font-display">Reset Password</h2>
            <p className="text-xs text-[#9AA3B2] mb-5 leading-normal">
              Enter your email address below, and we'll send you a link to reset your password and regain access to your account.
            </p>
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
                  onClick={() => setShowResetModal(false)}
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
          </div>
        </div>
      )}
    </div>
  );
}
