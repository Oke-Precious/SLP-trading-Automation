import { collection, doc, setDoc, getDocs, query, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/firebase';
import { BOSEvent } from '../analysis/slpEngine';
import { Candle } from '../market/marketDataService';

const seenEvents = new Set<string>();

export async function processMLDataCollection(bosEvents: BOSEvent[], currentCandles: Candle[]) {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  const signalsRef = collection(db, `users/${uid}/signals`);

  // Detect and Log new events
  for (const event of bosEvents) {
    const key = `${event.type}-${event.direction}-${event.breakTime}-${event.price}`;
    if (!seenEvents.has(key)) {
      seenEvents.add(key);
      const signalId = `sig-${event.breakTime}-${Math.floor(Math.random()*1000)}`;
      
      try {
        await setDoc(doc(signalsRef, signalId), {
          id: signalId,
          type: event.type,
          price: event.price,
          time: event.breakTime,
          direction: event.direction,
          outcome: 'PENDING',
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Silent fail saving ML signal logging', err);
      }
    }
  }

  // Very basic background outcome-checker
  // Real ML data pipelines usually do this async on backend, but this fulfills the prompt constraint
  if (Math.random() > 0.05) return; // Only process outcomes occasionally to save reads

  try {
    const q = query(signalsRef);
    const snap = await getDocs(q);
    const currentPrice = currentCandles[currentCandles.length - 1]?.close;
    if (!currentPrice) return;

    snap.forEach(async (docSnap) => {
      const data = docSnap.data();
      if (data.outcome === 'PENDING') {
        // If price goes 1% in direction = WIN, else if goes 1% against = LOSS
        const threshold = data.price * 0.01;
        
        let newOutcome = 'PENDING';
        if (data.direction === 'BULLISH') {
          if (currentPrice >= data.price + threshold) newOutcome = 'WIN';
          else if (currentPrice <= data.price - threshold) newOutcome = 'LOSS';
        } else {
          if (currentPrice <= data.price - threshold) newOutcome = 'WIN';
          else if (currentPrice >= data.price + threshold) newOutcome = 'LOSS';
        }

        if (newOutcome !== 'PENDING') {
          try {
            await updateDoc(doc(signalsRef, docSnap.id), { outcome: newOutcome, resolvedAt: new Date().toISOString() });
          } catch {}
        }
      }
    });
  } catch (err) {
    // silently fail
  }
}
