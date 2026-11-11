import { doc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export interface StudentItem {
  id: string;
  nama: string;
  nis: string;
  kelas: string;
  jurusan: string;
  email: string;
}

export const DEFAULT_STUDENTS: StudentItem[] = [
  { id: 's1', nama: 'Ahmad Rizky Pratama', nis: '232410145', kelas: 'X RPL 1', jurusan: 'Rekayasa Perangkat Lunak', email: 'rizky.siswa@smkn1sidayu.sch.id' },
  { id: 's2', nama: 'Siti Nur Aisyah', nis: '232410146', kelas: 'X AKL 1', jurusan: 'Akuntansi & Keuangan', email: 'siti.siswa@smkn1sidayu.sch.id' },
  { id: 's3', nama: 'Budi Santoso', nis: '232410147', kelas: 'X TKJ 1', jurusan: 'Teknik Komputer & Jaringan', email: 'budi.siswa@smkn1sidayu.sch.id' },
  { id: 's4', nama: 'Dian Permata', nis: '232410148', kelas: 'X DPIB 1', jurusan: 'Desain Pemodelan Bangunan', email: 'dian.siswa@smkn1sidayu.sch.id' },
  { id: 's5', nama: 'Farhan Maulana', nis: '232410149', kelas: 'X Otomotif 1', jurusan: 'Teknik Kendaraan Ringan', email: 'farhan.siswa@smkn1sidayu.sch.id' },
  { id: 's6', nama: 'Zahra Amelia', nis: '232410150', kelas: 'X RPL 2', jurusan: 'Rekayasa Perangkat Lunak', email: 'zahra.siswa@smkn1sidayu.sch.id' },
  { id: 's7', nama: 'Muhammad Dimas', nis: '232410151', kelas: 'X RPL 2', jurusan: 'Rekayasa Perangkat Lunak', email: 'dimas.siswa@smkn1sidayu.sch.id' },
  { id: 's8', nama: 'Aulia Rahma Putri', nis: '232410152', kelas: 'X AKL 2', jurusan: 'Akuntansi & Keuangan', email: 'aulia.siswa@smkn1sidayu.sch.id' },
];

const STORAGE_KEY = 'gcs_students_list_v2';
const PURGED_FLAG = 'gcs_students_purged_flag';

export const getStoredStudents = (): StudentItem[] => {
  try {
    if (localStorage.getItem(PURGED_FLAG) === 'true') {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
      return [];
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Error reading stored students:', err);
  }
  return DEFAULT_STUDENTS;
};

export const saveStoredStudents = (students: StudentItem[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
    if (students.length > 0) {
      localStorage.removeItem(PURGED_FLAG);
    } else {
      localStorage.setItem(PURGED_FLAG, 'true');
    }
    window.dispatchEvent(new Event('gcs_students_updated'));
  } catch (err) {
    console.warn('Error saving stored students:', err);
  }
};

/**
 * Hapus total SEMUA data akun siswa dari storage dan Firestore
 */
export const purgeAllStudentsFromStorage = async (clearFirestore: boolean = true): Promise<number> => {
  const current = getStoredStudents();
  const count = current.length;

  localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  localStorage.setItem(PURGED_FLAG, 'true');
  window.dispatchEvent(new Event('gcs_students_updated'));

  if (clearFirestore) {
    for (const s of current) {
      try {
        await deleteDoc(doc(db, 'users', s.id));
      } catch (err) {
        // Silently catch firestore error
      }
    }
  }

  return count;
};

export const restoreDefaultStudents = (): StudentItem[] => {
  localStorage.removeItem(PURGED_FLAG);
  saveStoredStudents(DEFAULT_STUDENTS);
  return DEFAULT_STUDENTS;
};

export const addSingleStudentToStorage = async (student: StudentItem): Promise<void> => {
  const current = getStoredStudents();
  const updated = [student, ...current.filter(s => s.id !== student.id)];
  saveStoredStudents(updated);

  try {
    await setDoc(doc(db, 'users', student.id), {
      uid: student.id,
      nama: student.nama,
      email: student.email,
      role: 'siswa',
      nis: student.nis,
      kelas: student.kelas,
      jurusan: student.jurusan,
      createdAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore add student error:', err);
  }
};

export const updateStudentInStorage = async (student: StudentItem): Promise<void> => {
  const current = getStoredStudents();
  const updated = current.map(s => s.id === student.id ? student : s);
  saveStoredStudents(updated);

  try {
    await setDoc(doc(db, 'users', student.id), {
      nama: student.nama,
      nis: student.nis,
      kelas: student.kelas,
      jurusan: student.jurusan,
      email: student.email,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore update student error:', err);
  }
};

export const deleteSingleStudentFromStorage = async (id: string): Promise<void> => {
  const current = getStoredStudents();
  const updated = current.filter(s => s.id !== id);
  saveStoredStudents(updated);

  try {
    await deleteDoc(doc(db, 'users', id));
  } catch (err) {
    console.warn('Firestore delete student error:', err);
  }
};
