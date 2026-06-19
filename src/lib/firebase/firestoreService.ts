import {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  getDocs, getDoc, onSnapshot, query, where,
  serverTimestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

// Helper: get user's subcollection ref
const userCol = (uid: string, col: string) =>
  collection(db, 'users', uid, col);

const userDoc = (uid: string, col: string, docId: string) =>
  doc(db, 'users', uid, col, docId);

// Recursive helper to remove properties with undefined values
// (Firestore throws exceptions on fields with undefined value)
function cleanUndefined(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  // If it's a special Firestore FieldValue or similar custom instance, do not sanitize it
  if (obj.constructor && obj.constructor.name !== 'Object' && obj.constructor.name !== 'Array') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined);
  }
  const clean: any = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      clean[key] = cleanUndefined(obj[key]);
    }
  }
  return clean;
}

// ════════════════════════════════════════
// POIs
// ════════════════════════════════════════

export async function savePOI(uid: string, poi: any) {
  const path = `users/${uid}/pois/${poi.id}`;
  try {
    const cleaned = cleanUndefined(poi);
    await setDoc(userDoc(uid, 'pois', poi.id), {
      ...cleaned,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return poi.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updatePOI(uid: string, poiId: string, changes: any) {
  const path = `users/${uid}/pois/${poiId}`;
  try {
    const cleaned = cleanUndefined(changes);
    await updateDoc(userDoc(uid, 'pois', poiId), {
      ...cleaned,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deletePOI(uid: string, poiId: string) {
  const path = `users/${uid}/pois/${poiId}`;
  try {
    await deleteDoc(userDoc(uid, 'pois', poiId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

function getSafeTime(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (val.toDate && typeof val.toDate === 'function') {
    return val.toDate().getTime();
  }
  if (typeof val.seconds === 'number') {
    return val.seconds * 1000;
  }
  const parsed = new Date(val).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

export async function getUserPOIs(uid: string) {
  const path = `users/${uid}/pois`;
  try {
    const snap = await getDocs(userCol(uid, 'pois'));
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    docs.sort((a: any, b: any) => getSafeTime(b.createdAt) - getSafeTime(a.createdAt));
    return docs;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export function listenToPOIs(uid: string, callback: (pois: any[]) => void) {
  const path = `users/${uid}/pois`;
  return onSnapshot(
    userCol(uid, 'pois'),
    (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a: any, b: any) => getSafeTime(b.createdAt) - getSafeTime(a.createdAt));
      callback(docs);
    },
    (err) => {
      // Use clean console logging warning for read listeners rather than throwing fatal uncaught exceptions
      console.warn('[Firestore Listener] Failed to subscribe to pois collection:', err);
    }
  );
}

// ════════════════════════════════════════
// JOURNAL TRADES
// ════════════════════════════════════════

export async function saveTrade(uid: string, trade: any) {
  const path = `users/${uid}/trades/${trade.id}`;
  try {
    const cleaned = cleanUndefined(trade);
    await setDoc(userDoc(uid, 'trades', trade.id), {
      ...cleaned,
      createdAt: serverTimestamp(),
    });
    return trade.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateTrade(uid: string, tradeId: string, changes: any) {
  const path = `users/${uid}/trades/${tradeId}`;
  try {
    const cleaned = cleanUndefined(changes);
    await updateDoc(userDoc(uid, 'trades', tradeId), {
      ...cleaned,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteTrade(uid: string, tradeId: string) {
  const path = `users/${uid}/trades/${tradeId}`;
  try {
    await deleteDoc(userDoc(uid, 'trades', tradeId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function getUserTrades(uid: string) {
  const path = `users/${uid}/trades`;
  try {
    const snap = await getDocs(userCol(uid, 'trades'));
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    docs.sort((a: any, b: any) => {
      const ta = a.entryDate ? new Date(a.entryDate).getTime() : getSafeTime(a.createdAt);
      const tb = b.entryDate ? new Date(b.entryDate).getTime() : getSafeTime(b.createdAt);
      return tb - ta;
    });
    return docs;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export function listenToTrades(uid: string, callback: (trades: any[]) => void) {
  const path = `users/${uid}/trades`;
  return onSnapshot(
    userCol(uid, 'trades'),
    (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a: any, b: any) => {
        const ta = a.entryDate ? new Date(a.entryDate).getTime() : getSafeTime(a.createdAt);
        const tb = b.entryDate ? new Date(b.entryDate).getTime() : getSafeTime(b.createdAt);
        return tb - ta;
      });
      callback(docs);
    },
    (err) => {
      console.warn('[Firestore Listener] Failed to subscribe to trades collection:', err);
    }
  );
}

// ════════════════════════════════════════
// ALERTS
// ════════════════════════════════════════

export async function saveAlert(uid: string, alert: any) {
  const path = `users/${uid}/alerts/${alert.id}`;
  try {
    const cleaned = cleanUndefined(alert);
    await setDoc(userDoc(uid, 'alerts', alert.id), {
      ...cleaned,
      createdAt: serverTimestamp(),
    });
    return alert.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateAlert(uid: string, alertId: string, changes: any) {
  const path = `users/${uid}/alerts/${alertId}`;
  try {
    const cleaned = cleanUndefined(changes);
    await updateDoc(userDoc(uid, 'alerts', alertId), {
      ...cleaned,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteAlert(uid: string, alertId: string) {
  const path = `users/${uid}/alerts/${alertId}`;
  try {
    await deleteDoc(userDoc(uid, 'alerts', alertId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export function listenToAlerts(uid: string, callback: (alerts: any[]) => void) {
  const path = `users/${uid}/alerts`;
  return onSnapshot(
    userCol(uid, 'alerts'),
    (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a: any, b: any) => getSafeTime(b.createdAt) - getSafeTime(a.createdAt));
      callback(docs);
    },
    (err) => {
      console.warn('[Firestore Listener] Failed to subscribe to alerts collection:', err);
    }
  );
}

// ════════════════════════════════════════
// USER SETTINGS
// ════════════════════════════════════════

export async function saveUserSettings(uid: string, settings: any) {
  const path = `users/${uid}/settings/preferences`;
  try {
    const { updatedAt, ...serializableSettings } = settings;
    const cleaned = cleanUndefined(serializableSettings);
    await setDoc(userDoc(uid, 'settings', 'preferences'), {
      ...cleaned,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function getUserSettings(uid: string) {
  const path = `users/${uid}/settings/preferences`;
  try {
    const snap = await getDoc(userDoc(uid, 'settings', 'preferences'));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export function listenToUserSettings(uid: string, callback: (settings: any) => void) {
  const path = `users/${uid}/settings/preferences`;
  return onSnapshot(
    userDoc(uid, 'settings', 'preferences'),
    (snap) => {
      if (snap.exists()) {
        callback(snap.data());
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}

// ════════════════════════════════════════
// USER BIAS
// ════════════════════════════════════════

export async function saveUserBias(uid: string, biasMap: any) {
  const path = `users/${uid}/settings/bias`;
  try {
    const cleaned = cleanUndefined(biasMap);
    await setDoc(userDoc(uid, 'settings', 'bias'), {
      biasMap: cleaned,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export function listenToUserBias(uid: string, callback: (biasMap: any) => void) {
  const path = `users/${uid}/settings/bias`;
  return onSnapshot(
    userDoc(uid, 'settings', 'bias'),
    (snap) => {
      if (snap.exists() && snap.data()?.biasMap) {
        callback(snap.data().biasMap);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}

// ════════════════════════════════════════
// CHART SETTINGS
// ════════════════════════════════════════

export async function saveUserChartSettings(uid: string, settings: any) {
  const path = `users/${uid}/settings/chart`;
  try {
    const cleaned = cleanUndefined(settings);
    await setDoc(userDoc(uid, 'settings', 'chart'), {
      settings: cleaned,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export function listenToUserChartSettings(uid: string, callback: (settings: any) => void) {
  const path = `users/${uid}/settings/chart`;
  return onSnapshot(
    userDoc(uid, 'settings', 'chart'),
    (snap) => {
      if (snap.exists() && snap.data()?.settings) {
        callback(snap.data().settings);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}

// ════════════════════════════════════════
// USER PROFILE
// ════════════════════════════════════════

export async function updateUserProfile(uid: string, changes: any) {
  const path = `users/${uid}`;
  try {
    const cleaned = cleanUndefined(changes);
    await updateDoc(doc(db, 'users', uid), {
      ...cleaned,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}
