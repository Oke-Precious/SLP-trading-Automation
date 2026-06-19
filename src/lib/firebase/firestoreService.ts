import {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  getDocs, getDoc, onSnapshot, query, orderBy, where,
  serverTimestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

// Helper: get user's subcollection ref
const userCol = (uid: string, col: string) =>
  collection(db, 'users', uid, col);

const userDoc = (uid: string, col: string, docId: string) =>
  doc(db, 'users', uid, col, docId);

// ════════════════════════════════════════
// POIs
// ════════════════════════════════════════

export async function savePOI(uid: string, poi: any) {
  const path = `users/${uid}/pois/${poi.id}`;
  try {
    await setDoc(userDoc(uid, 'pois', poi.id), {
      ...poi,
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
    await updateDoc(userDoc(uid, 'pois', poiId), {
      ...changes,
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

export async function getUserPOIs(uid: string) {
  const path = `users/${uid}/pois`;
  try {
    const snap = await getDocs(
      query(userCol(uid, 'pois'), orderBy('createdAt', 'desc'))
    );
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export function listenToPOIs(uid: string, callback: (pois: any[]) => void) {
  const path = `users/${uid}/pois`;
  return onSnapshot(
    query(userCol(uid, 'pois'), orderBy('createdAt', 'desc')),
    (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  );
}

// ════════════════════════════════════════
// JOURNAL TRADES
// ════════════════════════════════════════

export async function saveTrade(uid: string, trade: any) {
  const path = `users/${uid}/trades/${trade.id}`;
  try {
    await setDoc(userDoc(uid, 'trades', trade.id), {
      ...trade,
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
    await updateDoc(userDoc(uid, 'trades', tradeId), {
      ...changes,
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
    const snap = await getDocs(
      query(userCol(uid, 'trades'), orderBy('entryDate', 'desc'))
    );
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export function listenToTrades(uid: string, callback: (trades: any[]) => void) {
  const path = `users/${uid}/trades`;
  return onSnapshot(
    query(userCol(uid, 'trades'), orderBy('entryDate', 'desc')),
    (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  );
}

// ════════════════════════════════════════
// ALERTS
// ════════════════════════════════════════

export async function saveAlert(uid: string, alert: any) {
  const path = `users/${uid}/alerts/${alert.id}`;
  try {
    await setDoc(userDoc(uid, 'alerts', alert.id), {
      ...alert,
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
    await updateDoc(userDoc(uid, 'alerts', alertId), {
      ...changes,
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
    query(userCol(uid, 'alerts'), orderBy('createdAt', 'desc')),
    (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
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
    await setDoc(userDoc(uid, 'settings', 'preferences'), {
      ...serializableSettings,
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
    await setDoc(userDoc(uid, 'settings', 'bias'), {
      biasMap,
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
    await setDoc(userDoc(uid, 'settings', 'chart'), {
      settings,
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
    await updateDoc(doc(db, 'users', uid), {
      ...changes,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}
