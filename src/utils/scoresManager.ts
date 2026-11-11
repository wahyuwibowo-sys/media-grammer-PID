import { collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';

const SCORES_CLEARED_FLAG = 'gcs_scores_cleared_state';

export const isScoresCleared = (): boolean => {
  return localStorage.getItem(SCORES_CLEARED_FLAG) === 'true';
};

export const setScoresClearedState = (cleared: boolean): void => {
  if (cleared) {
    localStorage.setItem(SCORES_CLEARED_FLAG, 'true');
  } else {
    localStorage.removeItem(SCORES_CLEARED_FLAG);
  }
  window.dispatchEvent(new Event('gcs_scores_changed'));
};

/**
 * Purge / Kosongkan semua data nilai siswa baik di Firestore maupun local state
 */
export const clearAllScoresFromDb = async (): Promise<number> => {
  let count = 0;
  try {
    const snap = await getDocs(collection(db, 'scores'));
    const batch = writeBatch(db);
    snap.forEach((docSnap) => {
      batch.delete(docSnap.ref);
      count++;
    });
    if (count > 0) {
      await batch.commit();
    }
  } catch (err) {
    console.warn('Error purging Firestore scores (batch):', err);
  }

  // Set the cleared flag so seed data won't auto-regenerate
  setScoresClearedState(true);
  window.dispatchEvent(new Event('gcs_scores_cleared'));
  return count;
};

/**
 * Kosongkan nilai hanya untuk kelas tertentu
 */
export const clearScoresByClassFromDb = async (kelas: string): Promise<number> => {
  let count = 0;
  try {
    const snap = await getDocs(collection(db, 'scores'));
    const batch = writeBatch(db);
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.kelas === kelas) {
        batch.delete(docSnap.ref);
        count++;
      }
    });
    if (count > 0) {
      await batch.commit();
    }
  } catch (err) {
    console.warn(`Error purging scores for class ${kelas}:`, err);
  }

  window.dispatchEvent(new Event('gcs_scores_changed'));
  return count;
};

/**
 * Hapus satu rekaman nilai siswa
 */
export const deleteSingleScoreFromDb = async (scoreId: string): Promise<void> => {
  try {
    if (!scoreId.startsWith('sc-') && !scoreId.startsWith('local-')) {
      await deleteDoc(doc(db, 'scores', scoreId));
    }
  } catch (err) {
    console.warn('Error deleting score doc:', err);
  }
  window.dispatchEvent(new Event('gcs_scores_changed'));
};
