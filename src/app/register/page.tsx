'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, TrendingUp } from 'lucide-react';
import { apiClient } from '../../lib/api/client';
import { useAuthStore } from '../../store/useAuthStore';
import toast from 'react-hot-toast';
import { motion } from 'motion/react';

export default function RegisterPage() {
  const router  = useRouter();
  const setAuth = useAuthStore(s => s.setAuth);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<{ code: string; message: string } | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    // Clean client-side pre-validation to avoid hitting backend if details are incorrectly structured
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      const errorMsg = 'Please enter a valid email address format.';
      setAuthError({ code: 'client/invalid-email', message: errorMsg });
      setShakeKey(prev => prev + 1);
      toast.error(errorMsg);
      return;
    }

    if (!username || username.trim().length < 3) {
      const errorMsg = 'Username must be at least 3 characters.';
      setAuthError({ code: 'client/invalid-username', message: errorMsg });
      setShakeKey(prev => prev + 1);
      toast.error(errorMsg);
      return;
    }

    if (password.length < 8) {
      const errorMsg = 'Password must be at least 8 characters long.';
      setAuthError({ code: 'client/weak-password', message: errorMsg });
      setShakeKey(prev => prev + 1);
      toast.error(errorMsg);
      return;
    }

    if (password !== confirmPassword) {
      const errorMsg = 'Passwords do not match.';
      setAuthError({ code: 'client/password-mismatch', message: errorMsg });
      setShakeKey(prev => prev + 1);
      toast.error(errorMsg);
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

      // Set user profile in Firestore
      await setDoc(doc(db, 'users', fbUser.uid), newUserData);

      const idToken = await fbUser.getIdToken();

      // Set user registration in Zustand store
      setAuth(newUserData, idToken);

      toast.success(`Welcome to AutoSLP, ${username}! Your cloud account is fully setup.`);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Firebase Registration Error:', err);
      let errorMsg = err.message || 'Registration failed';
      const errorCode = err.code || 'unknown';
      setShakeKey(prev => prev + 1);

      if (err.code === 'auth/email-already-in-use') {
        errorMsg = 'This email is already registered. Please login or try another email.';
        setAuthError({ code: errorCode, message: errorMsg });
        toast.error(errorMsg);
      } else if (err.code === 'auth/weak-password') {
        errorMsg = 'Weak password. Please choose a stronger password.';
        setAuthError({ code: errorCode, message: errorMsg });
        toast.error(errorMsg);
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = 'Invalid email address format.';
        setAuthError({ code: errorCode, message: errorMsg });
        toast.error(errorMsg);
      } else if (err.code === 'auth/operation-not-allowed' || errorMsg.includes('auth/operation-not-allowed')) {
        errorMsg = 'Email/Password registration is currently not enabled in your Firebase console.';
        setAuthError({ code: errorCode, message: errorMsg });
        toast.error('Email & Password provider is disabled. Follow the guide on your screen to enable it!', { duration: 6000 });
      } else {
        setAuthError({ code: errorCode, message: errorMsg });
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setAuthError(null);
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

      toast.success(`Welcome to AutoSLP, ${userData.username}!`);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      const errorCode = err.code || 'unknown';
      let errorMsg = err.message || 'Google Sign-In failed';
      if (err.code === 'auth/popup-closed-by-user' || err.message?.includes('popup-closed-by-user')) {
        errorMsg = 'Google authentication popup was closed before completion. If popups are restricted in this embedded preview frame, we highly recommend launching the app in a new tab.';
        setAuthError({ code: errorCode, message: errorMsg });
        toast.error('Sign-in popup closed. Tap "Open App in New Tab" at top right to bypass iframe limits.', { duration: 7000 });
      } else {
        setAuthError({ code: errorCode, message: errorMsg });
        toast.error(errorMsg);
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

          {/* Dynamic Interactive Troubleshooting Alert */}
          {authError ? (
            <motion.div
              key={shakeKey}
              initial={{ x: 0, opacity: 0, scale: 0.95 }}
              animate={{ 
                x: [0, -10, 10, -10, 10, -5, 5, 0],
                opacity: 1, 
                scale: 1 
              }}
              transition={{ 
                x: { duration: 0.4, ease: "easeInOut" },
                opacity: { duration: 0.2 },
                scale: { duration: 0.2 }
              }}
              className={`mb-5 p-4 rounded-lg text-xs leading-relaxed border ${
                authError.code.startsWith('client/') || authError.code === 'auth/email-already-in-use' || authError.code === 'auth/weak-password'
                  ? 'bg-red-500/10 border-red-500/30 text-red-200'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              }`}
            >
              <span className={`font-bold block mb-2 uppercase tracking-wider text-[10px] flex items-center gap-1.5 font-sans ${
                authError.code.startsWith('client/') || authError.code === 'auth/email-already-in-use' || authError.code === 'auth/weak-password'
                  ? 'text-red-400'
                  : 'text-amber-400'
              }`}>
                ⚠️ {authError.code.startsWith('client/') ? 'Validation Error' : 'Connection Helper'} ({authError.code})
              </span>
              
              {authError.code === 'auth/operation-not-allowed' ? (
                <div className="space-y-2 text-[#C8D1E0]">
                  <p className="text-[#F1F5F9] font-medium font-sans">
                    Email/Password registration is not enabled in your Firebase Console.
                  </p>
                  <p className="text-amber-300 font-semibold uppercase tracking-wider text-[9px] mt-2">👉 Quick Setup Steps:</p>
                  <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-[#A0AEC0]">
                    <li>Go to your <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline hover:text-amber-300">Firebase Console</a>.</li>
                    <li>Click <strong>Authentication</strong> in the left menu.</li>
                    <li>Navigate to the <strong>Sign-in method</strong> tab.</li>
                    <li>Click <strong>Add new provider</strong>, select <strong>Email/Password</strong>, choose <strong>Enable</strong>, and click <strong>Save</strong>!</li>
                  </ol>
                  <p className="text-[10px] text-[#718096] italic mt-2">
                    (Once enabled in Firebase, you can register or sign-in with any custom email instantly.)
                  </p>
                </div>
              ) : authError.code === 'auth/popup-closed-by-user' ? (
                <div className="space-y-2 text-[#C8D1E0]">
                  <p className="text-[#F1F5F9] font-medium font-sans">
                    Google sign-in popup was blocked or closed before completion.
                  </p>
                  <p className="text-amber-300 font-semibold uppercase tracking-wider text-[9px] mt-2">👉 Resolution Steps:</p>
                  <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-[#A0AEC0]">
                    <li>Look at the very top-right of your AI Studio/preview screen panel.</li>
                    <li>Click the <strong className="text-white">"Open App in New Tab" ↗</strong> button.</li>
                    <li>In the standalone tab, complete Google Sign-In flawlessly in 1 click!</li>
                  </ol>
                </div>
              ) : (
                <p className="text-[#E2E8F0] font-sans">{authError.message}</p>
              )}

              <button
                type="button"
                onClick={() => setAuthError(null)}
                className={`mt-3.5 text-[9px] hover:underline cursor-pointer font-bold block uppercase tracking-wider px-2 py-1.5 rounded w-full text-center border transition-all ${
                  authError.code.startsWith('client/') || authError.code === 'auth/email-already-in-use' || authError.code === 'auth/weak-password'
                    ? 'text-red-300 bg-red-500/10 hover:bg-red-500/20 border-red-500/20'
                    : 'text-[#CAAA98] bg-[#CAAA98]/10 hover:bg-[#CAAA98]/20 border-[#CAAA98]/20'
                }`}
              >
                Dismiss Error Help
              </button>
            </motion.div>
          ) : (
            <div className="mb-5 p-3.5 bg-[#CAAA98]/5 border border-[#CAAA98]/20 rounded-md text-xs text-[#9AA3B2] leading-relaxed animate-fadeIn">
              <span className="text-[#CAAA98] font-bold block mb-1 uppercase tracking-wider text-[10px]">🔒 Create Real Account</span>
              Sign up securely with your Google Account as your primary, 1-click option. If you prefer to register standard Email/Password accounts, make sure "Email/Password" is enabled in your Firebase console.
            </div>
          )}

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
            </div>

            <div>
              <label className="block text-xs text-[#9AA3B2] uppercase tracking-wider mb-2">Confirm Password</label>
              <input
                type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                className="w-full bg-[#131722] border border-[#2A2E39] rounded-md px-4 py-2.5
                           text-white text-sm focus:outline-none focus:border-[#CAAA98] transition-colors"
                placeholder="Repeat password"
              />
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-[#CAAA98] hover:bg-[#b89a88] text-[#202940] font-bold uppercase tracking-wider
                         py-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-2 text-xs">
              {loading ? 'Creating account...' : 'Registers Account'}
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
            <Link href="/login" className="text-[#CAAA98] hover:underline font-semibold ml-1">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
