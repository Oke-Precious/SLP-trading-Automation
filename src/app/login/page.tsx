'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, TrendingUp } from 'lucide-react';
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
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
      }

      const idToken = await fbUser.getIdToken();

      // Save in global state
      setAuth(userData, idToken);

      toast.success(`Welcome back, ${userData.username}!`);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Firebase Login Error:', err);
      let errorMsg = err.message || 'Login failed';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errorMsg = 'Incorrect email or password. Please verify your details.';
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
          <h1 className="text-xl font-semibold text-white mb-6 font-display">Sign In</h1>

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
              <label className="block text-xs text-[#9AA3B2] uppercase tracking-wider mb-2">Password</label>
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
    </div>
  );
}
