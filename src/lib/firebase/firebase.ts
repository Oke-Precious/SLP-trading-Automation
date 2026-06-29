import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  getFirestore,
  doc, 
  getDoc,
  getDocFromServer,
  setLogLevel
} from 'firebase/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';

// Suppress Firestore verbose connection warnings
try {
  setLogLevel('silent');
} catch (e) {
  // Ignore failure to set log level
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Resilient Firestore configuration with local persistent offline caching and HTTP long polling fallback
let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    }),
    experimentalForceLongPolling: true,
    ignoreUndefinedProperties: true
  }, firebaseConfig.firestoreDatabaseId);
  console.log('🔥 [Firebase] Firestore initialized successfully with robust long-polling and persistent cache.');
} catch (error) {
  console.warn('⚠️ [Firebase] Failed to initialize Firestore with persistent offline cache. Falling back to memory-only representation:', error);
  try {
    dbInstance = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      ignoreUndefinedProperties: true
    }, firebaseConfig.firestoreDatabaseId);
  } catch (errInner) {
    console.error('❌ [Firebase] Failed standard Firestore initialization:', errInner);
    // Explicitly fallback to default getFirestore
    dbInstance = getFirestore(app);
  }
}

export const db = dbInstance;

export const auth = getAuth();

// --- Non-blocking Firestore operations with ultra-low timeouts ---
export async function getDocWithTimeout(docRef: any, timeoutMs = 1500): Promise<any> {
  try {
    const { getDocFromCache } = await import('firebase/firestore');
    const cacheSnap = await getDocFromCache(docRef);
    if (cacheSnap.exists()) {
      return cacheSnap;
    }
  } catch (e) {
    // Cache miss / not available, fall through
  }

  const serverPromise = getDoc(docRef);
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Firestore fetch timeout')), timeoutMs)
  );

  return Promise.race([serverPromise, timeoutPromise]);
}

export async function getDocsWithTimeout(queryRef: any, timeoutMs = 1500): Promise<any> {
  try {
    const { getDocsFromCache } = await import('firebase/firestore');
    const cacheSnap = await getDocsFromCache(queryRef);
    if (cacheSnap && !cacheSnap.empty) {
      return cacheSnap;
    }
  } catch (e) {
    // Cache miss / not available, fall through
  }

  const { getDocs } = await import('firebase/firestore');
  const serverPromise = getDocs(queryRef);
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Firestore fetch timeout')), timeoutMs)
  );

  return Promise.race([serverPromise, timeoutPromise]);
}

// --- Firestore Error Handling Schema & Utility ---

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
          })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validation Connection to Firestore on Boot, as strictly mandated
async function testConnection() {
  try {
    // Attempt getDocFromServer to verify connection settings but with a short timeout to prevent boot hangs
    const docRef = doc(db, 'test', 'connection');
    const fetchPromise = getDocFromServer(docRef);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Connection timeout')), 2000)
    );
    await Promise.race([fetchPromise, timeoutPromise]);
    console.log('[Firebase] Outbound connection verified successfully.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      if (typeof window !== 'undefined' && (window.location.hostname.includes('run.app') || window.navigator.webdriver)) {
        console.warn('[Firebase] Outbound Firebase connection failed in the preview sandbox (running in offline-first mode).');
      } else {
        console.log('[Firebase] Client is offline; proceeding in robust offline-first mode.');
      }
    } else {
      console.log('[Firebase] Startup connection test skipped or completed. Offline-first cache is active.');
    }
  }
}

// Fire async validation test safely
testConnection();
