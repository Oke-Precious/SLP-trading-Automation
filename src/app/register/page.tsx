'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, TrendingUp } from 'lucide-react';
import { apiClient } from '../../lib/api/client';
import { useAuthStore } from '../../store/useAuthStore';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const router  = useRouter();
  const setAuth = useAuthStore(s => s.setAuth);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
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
      if (err.code === 'auth/email-already-in-use') {
        errorMsg = 'This email is already registered. Please login or try another email.';
      } else if (err.code === 'auth/weak-password') {
        errorMsg = 'Weak password. Please choose a stronger password.';
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = 'Invalid email address format.';
      } else if (errorMsg.includes('auth/operation-not-allowed')) {
        errorMsg = 'Email/Password Sign-In is disabled in your Firebase Console. Please enable it in the Authentication panel.';
      }
      toast.error(errorMsg);
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

          <p className="mt-6 text-center text-xs text-[#9AA3B2]">
            Already have an account?{' '}
            <Link href="/login" className="text-[#CAAA98] hover:underline font-semibold ml-1">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
