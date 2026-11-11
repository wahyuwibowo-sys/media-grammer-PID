import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export interface ClassRoomItem {
  id: string;
  namaKelas: string;
  jurusan: string;
  guru: string;
  jmlSiswa: number;
  status: 'aktif' | 'belum aktif';
}

export const DEFAULT_CLASSES: ClassRoomItem[] = [
  { id: 'c1', namaKelas: 'X RPL 1', jurusan: 'Rekayasa Perangkat Lunak', guru: 'Bambang Trianto, S.Pd.', jmlSiswa: 36, status: 'aktif' },
  { id: 'c2', namaKelas: 'X RPL 2', jurusan: 'Rekayasa Perangkat Lunak', guru: 'Bambang Trianto, S.Pd.', jmlSiswa: 36, status: 'aktif' },
  { id: 'c3', namaKelas: 'X TKJ 1', jurusan: 'Teknik Komputer & Jaringan', guru: 'Bambang Trianto, S.Pd.', jmlSiswa: 36, status: 'aktif' },
  { id: 'c4', namaKelas: 'X AKL 1', jurusan: 'Akuntansi & Keuangan', guru: 'Dra. Endang Sulistyo', jmlSiswa: 35, status: 'aktif' },
  { id: 'c5', namaKelas: 'X AKL 2', jurusan: 'Akuntansi & Keuangan', guru: 'Dra. Endang Sulistyo', jmlSiswa: 35, status: 'aktif' },
  { id: 'c6', namaKelas: 'X DPIB 1', jurusan: 'Desain Pemodelan Bangunan', guru: 'Dra. Endang Sulistyo', jmlSiswa: 34, status: 'aktif' },
  { id: 'c7', namaKelas: 'X Otomotif 1', jurusan: 'Teknik Kendaraan Ringan', guru: 'Ahmad Fauzi, M.Pd.', jmlSiswa: 35, status: 'aktif' },
];

const STORAGE_KEY = 'gcs_classes_list_v2';
const PURGE_INACTIVE_FLAG = 'gcs_inactive_purged_v2';

export const getStoredClasses = (): ClassRoomItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let items: ClassRoomItem[] = parsed.map(c => ({
          ...c,
          status: c.status || 'aktif'
        }));

        // Auto-purge initial inactive classes if not purged yet
        if (!localStorage.getItem(PURGE_INACTIVE_FLAG)) {
          items = items.filter(c => c.status !== 'belum aktif');
          localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
          localStorage.setItem(PURGE_INACTIVE_FLAG, 'true');
        }

        return items;
      }
    }
  } catch (err) {
    console.warn('Error reading stored classes:', err);
  }
  return DEFAULT_CLASSES;
};

export const saveStoredClasses = (classes: ClassRoomItem[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(classes));
    window.dispatchEvent(new Event('gcs_classes_updated'));
  } catch (err) {
    console.warn('Error writing stored classes:', err);
  }
};

export const getActiveClassNames = (): string[] => {
  const list = getStoredClasses();
  return list.filter(c => c.status === 'aktif').map(c => c.namaKelas);
};

export const getAvailableClassNames = (): string[] => {
  return getActiveClassNames();
};

export const getInactiveClasses = (): ClassRoomItem[] => {
  const list = getStoredClasses();
  return list.filter(c => c.status === 'belum aktif');
};

/**
 * Hapus seluruh rombel kelas yang berstatus 'belum aktif'
 */
export const deleteInactiveClasses = async (): Promise<string[]> => {
  const current = getStoredClasses();
  const inactive = current.filter(c => c.status === 'belum aktif');
  const deletedNames = inactive.map(c => c.namaKelas);
  const activeOnly = current.filter(c => c.status !== 'belum aktif');

  saveStoredClasses(activeOnly);

  // Sync delete to Firestore for each inactive class
  for (const c of inactive) {
    try {
      await deleteDoc(doc(db, 'classes', c.id));
    } catch (err) {
      console.warn('Error deleting class from Firestore:', c.id, err);
    }
  }

  window.dispatchEvent(new Event('gcs_classes_updated'));
  return deletedNames;
};

export const toggleClassStatus = async (id: string): Promise<'aktif' | 'belum aktif'> => {
  const current = getStoredClasses();
  let newStatus: 'aktif' | 'belum aktif' = 'aktif';

  const updated = current.map(c => {
    if (c.id === id) {
      newStatus = c.status === 'aktif' ? 'belum aktif' : 'aktif';
      return { ...c, status: newStatus };
    }
    return c;
  });

  saveStoredClasses(updated);

  try {
    const target = updated.find(c => c.id === id);
    if (target) {
      await setDoc(doc(db, 'classes', target.id), target, { merge: true });
    }
  } catch (err) {
    console.warn('Firestore class status update error:', err);
  }

  return newStatus;
};

export const updateClassNameInStorage = async (oldName: string, newName: string): Promise<void> => {
  const current = getStoredClasses();
  const updated = current.map(c => c.namaKelas === oldName ? { ...c, namaKelas: newName } : c);
  saveStoredClasses(updated);

  try {
    const target = updated.find(c => c.namaKelas === newName);
    if (target) {
      await setDoc(doc(db, 'classes', target.id), target, { merge: true });
    }
  } catch (err) {
    console.warn('Firestore class update error:', err);
  }
};

export const saveSingleClass = async (item: ClassRoomItem): Promise<void> => {
  const current = getStoredClasses();
  const exists = current.some(c => c.id === item.id);
  const updated = exists ? current.map(c => c.id === item.id ? item : c) : [...current, item];
  saveStoredClasses(updated);

  try {
    await setDoc(doc(db, 'classes', item.id), item, { merge: true });
  } catch (err) {
    console.warn('Firestore single class error:', err);
  }
};

export const deleteSingleClass = async (id: string): Promise<void> => {
  const current = getStoredClasses();
  const updated = current.filter(c => c.id !== id);
  saveStoredClasses(updated);

  try {
    await deleteDoc(doc(db, 'classes', id));
  } catch (err) {
    console.warn('Firestore delete class error:', err);
  }
};
