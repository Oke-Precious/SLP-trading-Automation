import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

// ── Sign Up ──────────────────────────────────────────────
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<{ user: User | null; error: string | null }> {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    // Update display name
    await updateProfile(user, { displayName });

    // Create Firestore user document
    await setDoc(doc(db, 'users', user.uid), {
      uid:         user.uid,
      email:       user.email,
      username:    displayName,
      plan:        'FREE',
      createdAt:   new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
      preferences: {
        defaultPair: 'BTCUSDT',
        defaultTF:   '1d',
        theme:       'dark',
        notifications: { inApp: true, browser: false, sound: true },
      },
    });

    return { user, error: null };
  } catch (err: any) {
    return { user: null, error: mapFirebaseError(err.code) };
  }
}

// ── Sign In ──────────────────────────────────────────────
export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ user: User | null; error: string | null }> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return { user: credential.user, error: null };
  } catch (err: any) {
    return { user: null, error: mapFirebaseError(err.code) };
  }
}

// ── Google Sign In ───────────────────────────────────────
export async function signInWithGoogle(): Promise<{ user: User | null; error: string | null }> {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const credential = await signInWithPopup(auth, provider);
    const user = credential.user;

    // Create user doc only if it doesn't exist yet
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid:         user.uid,
        email:       user.email,
        username:    user.displayName ?? 'Trader',
        photoURL:    user.photoURL ?? null,
        plan:        'FREE',
        createdAt:   new Date().toISOString(),
        updatedAt:   new Date().toISOString(),
        preferences: {
          defaultPair: 'BTCUSDT',
          defaultTF:   '1d',
          theme:       'dark',
          notifications: { inApp: true, browser: false, sound: true },
        },
      });
    }

    return { user, error: null };
  } catch (err: any) {
    return { user: null, error: mapFirebaseError(err.code) };
  }
}

// ── Sign Out ─────────────────────────────────────────────
export async function logOut(): Promise<void> {
  await signOut(auth);
}

// ── Password Reset ───────────────────────────────────────
export async function resetPassword(email: string): Promise<{ error: string | null }> {
  try {
    await sendPasswordResetEmail(auth, email);
    return { error: null };
  } catch (err: any) {
    return { error: mapFirebaseError(err.code) };
  }
}

// ── Auth State Listener ──────────────────────────────────
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// ── User Profile from Firestore ──────────────────────────
export async function getUserProfile(uid: string) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
}

// ── Firebase error code → human readable message ────────
function mapFirebaseError(code: string): string {
  const map: Record<string, string> = {
    'auth/email-already-in-use':    'An account with this email already exists.',
    'auth/invalid-email':           'Please enter a valid email address.',
    'auth/weak-password':           'Password must be at least 6 characters.',
    'auth/user-not-found':          'No account found with this email.',
    'auth/wrong-password':          'Incorrect password. Please try again.',
    'auth/invalid-credential':      'Invalid email or password.',
    'auth/too-many-requests':       'Too many attempts. Please wait a moment.',
    'auth/network-request-failed':  'Network error. Check your internet connection.',
    'auth/popup-closed-by-user':    'Google sign-in was cancelled.',
    'auth/cancelled-popup-request': 'Only one sign-in popup allowed at a time.',
  };
  return map[code] ?? `Authentication error: ${code}`;
}
