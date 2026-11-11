import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Users, 
  GraduationCap, 
  Layers, 
  BookOpen, 
  Download, 
  Upload, 
  Activity, 
  Settings, 
  CheckCircle2, 
  Trash2, 
  Plus, 
  Database,
  RefreshCw,
  Search,
  FileSpreadsheet,
  Edit3,
  X,
  Save,
  School,
  ClipboardPaste,
  Smile,
  AlertTriangle,
  UserCog,
  UserPlus,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth, getStoredAdminCustomProfile, saveStoredAdminCustomProfile, getStoredAdminPassword } from '../context/AuthContext';
import { useIFP } from '../context/IFPContext';
import { GRAMMAR_QUESTION_BANK } from '../data/grammarQuestions';
import { GRAMMAR_MATERIALS } from '../data/materialsData';
import { PRESET_AVATARS } from './Profile';
import { triggerConfetti } from '../utils/confetti';
import { soundManager } from '../utils/audio';
import { 
  ClassRoomItem, 
  getStoredClasses, 
  saveStoredClasses, 
  saveSingleClass, 
  deleteSingleClass,
  updateClassNameInStorage,
  deleteInactiveClasses,
  toggleClassStatus,
  getInactiveClasses
} from '../utils/classesManager';
import { 
  clearAllScoresFromDb, 
  clearScoresByClassFromDb, 
  isScoresCleared, 
  setScoresClearedState 
} from '../utils/scoresManager';

interface TeacherItem {
  id: string;
  nama: string;
  nip: string;
  mapel: string;
  kelas: string;
  email: string;
}

interface StudentItem {
  id: string;
  nama: string;
  nis: string;
  kelas: string;
  jurusan: string;
  email: string;
}

export const AdminManagement: React.FC = () => {
  const { 
    userProfile, 
    updateUserBio, 
    adminPassword, 
    updateAdminPassword, 
    updateAdminProfileTexts,
    elevateToAdmin 
  } = useAuth();
  const { triggerHaptic } = useIFP();

  const [activeTab, setActiveTab] = useState<'users' | 'classes' | 'scores' | 'admin-profile' | 'admin-password' | 'questions' | 'backup' | 'logs'>('users');
  const [userSubTab, setUserSubTab] = useState<'guru' | 'siswa'>('guru');
  const [searchQuery, setSearchQuery] = useState('');
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Sembunyikan Kredensial Login (Mode Privasi Layar Kelas / IFP)
  const [hideLoginCredentials, setHideLoginCredentials] = useState<boolean>(() => {
    return localStorage.getItem('gcs_hide_login_credentials') === 'true';
  });

  const toggleHideLoginCredentials = () => {
    triggerHaptic();
    setHideLoginCredentials(prev => {
      const next = !prev;
      localStorage.setItem('gcs_hide_login_credentials', String(next));
      return next;
    });
    setActionSuccessMsg(
      !hideLoginCredentials 
        ? 'Privasi aktif: Kredensial login berhasil disembunyikan di halaman login!' 
        : 'Kredensial login sekarang ditampilkan kembali di halaman login.'
    );
    soundManager.playCorrect();
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  // Managed Teachers & Students State
  const [teachers, setTeachers] = useState<TeacherItem[]>([
    { id: 'g1', nama: 'Bambang Trianto, S.Pd.', nip: '19850412 201001 1 008', mapel: 'Bahasa Inggris SMK Kelas X', kelas: 'X RPL 1, X RPL 2, X TKJ 1', email: 'bambang.guru@smkn1sidayu.sch.id' },
    { id: 'g2', nama: 'Dra. Endang Sulistyo', nip: '19790615 200501 2 004', mapel: 'Bahasa Inggris Kejuruan Bisnis', kelas: 'X AKL 1, X AKL 2, X DPIB 1', email: 'endang.guru@smkn1sidayu.sch.id' },
    { id: 'g3', nama: 'Ahmad Fauzi, M.Pd.', nip: '19900820 201503 1 002', mapel: 'English for Vocational Tech', kelas: 'X Otomotif 1, X DPIB 1', email: 'fauzi.guru@smkn1sidayu.sch.id' },
    { id: 'g4', nama: 'Siti Rahmawati, S.Pd.', nip: '19920110 201902 2 007', mapel: 'English Communication Skills', kelas: 'X RPL 1, X AKL 1', email: 'siti.rahma@smkn1sidayu.sch.id' },
  ]);

  const [students, setStudents] = useState<StudentItem[]>([
    { id: 's1', nama: 'Ahmad Rizky Pratama', nis: '232410145', kelas: 'X RPL 1', jurusan: 'Rekayasa Perangkat Lunak', email: 'rizky.siswa@smkn1sidayu.sch.id' },
    { id: 's2', nama: 'Siti Nur Aisyah', nis: '232410146', kelas: 'X AKL 1', jurusan: 'Akuntansi & Keuangan', email: 'siti.siswa@smkn1sidayu.sch.id' },
    { id: 's3', nama: 'Budi Santoso', nis: '232410147', kelas: 'X TKJ 1', jurusan: 'Teknik Komputer & Jaringan', email: 'budi.siswa@smkn1sidayu.sch.id' },
    { id: 's4', nama: 'Dian Permata', nis: '232410148', kelas: 'X DPIB 1', jurusan: 'Desain Pemodelan Bangunan', email: 'dian.siswa@smkn1sidayu.sch.id' },
    { id: 's5', nama: 'Farhan Maulana', nis: '232410149', kelas: 'X Otomotif 1', jurusan: 'Teknik Kendaraan Ringan', email: 'farhan.siswa@smkn1sidayu.sch.id' },
    { id: 's6', nama: 'Zahra Amelia', nis: '232410150', kelas: 'X RPL 2', jurusan: 'Rekayasa Perangkat Lunak', email: 'zahra.siswa@smkn1sidayu.sch.id' },
    { id: 's7', nama: 'Muhammad Dimas', nis: '232410151', kelas: 'X RPL 2', jurusan: 'Rekayasa Perangkat Lunak', email: 'dimas.siswa@smkn1sidayu.sch.id' },
    { id: 's8', nama: 'Aulia Rahma Putri', nis: '232410152', kelas: 'X AKL 2', jurusan: 'Akuntansi & Keuangan', email: 'aulia.siswa@smkn1sidayu.sch.id' },
  ]);

  // Managed Classes State (Dynamic and Persistent)
  const [classes, setClasses] = useState<ClassRoomItem[]>(getStoredClasses());

  // System Activity Logs
  const [activityLogs, setActivityLogs] = useState([
    { time: '10:45:12', user: 'Administrator', action: 'Membuat 5 Soal AI baru pada topik Future Tense' },
    { time: '10:32:05', user: 'Ahmad Rizky Pratama', action: 'Menyelesaikan Level 6 Boss Battle dengan skor 98' },
    { time: '10:15:30', user: 'Siti Nur Aisyah', action: 'Mendapatkan Badge 🏅 Champion (1000+ pts)' },
    { time: '09:50:18', user: 'Administrator', action: 'Sinkronisasi database Firestore selesai (300+ soal aktif)' },
    { time: '09:20:44', user: 'Team Battle Arena', action: 'Sesi IFP Tim Biru vs Tim Merah selesai' },
  ]);

  // Modals state for Users
  const [showManualModal, setShowManualModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedRoleToCreate, setSelectedRoleToCreate] = useState<'guru' | 'siswa'>('guru');

  const [editItem, setEditItem] = useState<{
    id: string;
    role: 'guru' | 'siswa';
    nama: string;
    nipOrNis: string;
    kelas: string;
    jurusanOrMapel: string;
    email: string;
  } | null>(null);

  // User Manual Form State
  const [manualUserData, setManualUserData] = useState({
    nama: '',
    nipOrNis: '',
    kelas: classes[0]?.namaKelas || 'X RPL 1',
    jurusanOrMapel: 'Bahasa Inggris SMKN 1 Sidayu Kelas X',
    email: '',
  });

  // Modals state for Classes
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [showDeleteInactiveModal, setShowDeleteInactiveModal] = useState(false);
  const [classFilter, setClassFilter] = useState<'semua' | 'aktif' | 'belum aktif'>('semua');
  const [editClassItem, setEditClassItem] = useState<ClassRoomItem | null>(null);
  const [newClassData, setNewClassData] = useState<{
    namaKelas: string;
    jurusan: string;
    guru: string;
    jmlSiswa: number;
    status: 'aktif' | 'belum aktif';
  }>({
    namaKelas: '',
    jurusan: 'Rekayasa Perangkat Lunak',
    guru: 'Bambang Trianto, S.Pd.',
    jmlSiswa: 36,
    status: 'aktif',
  });

  // Template Import States
  const [templateTargetRole, setTemplateTargetRole] = useState<'guru' | 'siswa'>('siswa');
  const [rawPastedText, setRawPastedText] = useState('');
  const [parsedPreview, setParsedPreview] = useState<any[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  // Admin Profile Edit State ("tulisan profil admin")
  const initialAdminData = getStoredAdminCustomProfile();
  const [adminProfileForm, setAdminProfileForm] = useState({
    nama: userProfile?.nama || initialAdminData.nama,
    email: userProfile?.email || initialAdminData.email,
    nip: userProfile?.nip || initialAdminData.nip,
    jabatan: userProfile?.jabatan || initialAdminData.jabatan,
    sekolah: userProfile?.sekolah || initialAdminData.sekolah,
    photoURL: userProfile?.photoURL || initialAdminData.photoURL,
    bio: userProfile?.bio || initialAdminData.bio,
  });

  // Admin Password Form State ("sandi admin")
  const [newAdminPass, setNewAdminPass] = useState('');
  const [confirmAdminPass, setConfirmAdminPass] = useState('');
  const [showPassText, setShowPassText] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  // Listen to external class updates
  useEffect(() => {
    const handleClassesChange = () => {
      setClasses(getStoredClasses());
    };
    window.addEventListener('gcs_classes_updated', handleClassesChange);
    return () => window.removeEventListener('gcs_classes_updated', handleClassesChange);
  }, []);

  // Filtered lists
  const filteredTeachers = teachers.filter(t => 
    t.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.nip.includes(searchQuery) ||
    t.kelas.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStudents = students.filter(s => 
    s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.nis.includes(searchQuery) ||
    s.kelas.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.jurusan.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Download Sample CSV Template
  const handleDownloadTemplate = (type: 'guru' | 'siswa') => {
    triggerHaptic();
    let csvContent = '';
    let fileName = '';

    if (type === 'guru') {
      fileName = 'Template_Import_Guru_SMK.csv';
      csvContent = 'Nama Lengkap,NIP,Mata Pelajaran,Kelas Binaan,Email Resmi\n' +
        'Bambang Trianto S.Pd.,19850412 201001 1 008,Bahasa Inggris SMK Kelas X,X RPL 1; X TKJ 1,bambang.guru@smkn1sidayu.sch.id\n' +
        'Dra. Endang Sulistyo,19790615 200501 2 004,Bahasa Inggris Kejuruan Bisnis,X AKL 1; X DPIB 1,endang.guru@smkn1sidayu.sch.id';
    } else {
      fileName = 'Template_Import_Siswa_SMK.csv';
      csvContent = 'Nama Lengkap Siswa,NIS,Kelas,Jurusan,Email Siswa\n' +
        'Ahmad Rizky Pratama,232410145,X RPL 1,Rekayasa Perangkat Lunak,rizky.siswa@smkn1sidayu.sch.id\n' +
        'Siti Nur Aisyah,232410146,X AKL 1,Akuntansi & Keuangan,siti.siswa@smkn1sidayu.sch.id';
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    soundManager.playCorrect();
  };

  // Parse CSV or TSV
  const handleParseText = (text: string, role: 'guru' | 'siswa') => {
    setParseError(null);
    if (!text.trim()) {
      setParsedPreview([]);
      return;
    }

    try {
      const lines = text.trim().split(/\r\n|\n|\r/);
      if (lines.length < 1) {
        setParseError('Data kosong atau tidak memiliki baris.');
        return;
      }

      const headerLine = lines[0].toLowerCase();
      const hasHeader = headerLine.includes('nama') || headerLine.includes('nip') || headerLine.includes('nis') || headerLine.includes('email');
      const dataRows = hasHeader ? lines.slice(1) : lines;

      const results: any[] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const line = dataRows[i].trim();
        if (!line) continue;

        let parts: string[] = [];
        if (line.includes('\t')) {
          parts = line.split('\t');
        } else if (line.includes(';')) {
          parts = line.split(';');
        } else {
          parts = line.split(',');
        }

        parts = parts.map(p => p.trim().replace(/^["']|["']$/g, ''));

        if (role === 'guru') {
          const nama = parts[0] || `Guru Baru ${i + 1}`;
          const nip = parts[1] || '-';
          const mapel = parts[2] || 'Bahasa Inggris SMK';
          const kelas = parts[3] || classes[0]?.namaKelas || 'X RPL 1';
          const email = parts[4] || `${nama.toLowerCase().replace(/[^a-z0-9]/g, '.')}@smkn1sidayu.sch.id`;

          results.push({
            id: `g-import-${Date.now()}-${i}`,
            nama,
            nip,
            mapel,
            kelas,
            email,
          });
        } else {
          const nama = parts[0] || `Siswa Baru ${i + 1}`;
          const nis = parts[1] || String(242510000 + i);
          const kelas = parts[2] || classes[0]?.namaKelas || 'X RPL 1';
          const jurusan = parts[3] || 'Kejuruan SMK';
          const email = parts[4] || `${nama.toLowerCase().replace(/[^a-z0-9]/g, '.')}@smkn1sidayu.sch.id`;

          results.push({
            id: `s-import-${Date.now()}-${i}`,
            nama,
            nis,
            kelas,
            jurusan,
            email,
          });
        }
      }

      if (results.length === 0) {
        setParseError('Tidak ada baris data valid yang terdeteksi.');
      } else {
        setParsedPreview(results);
      }
    } catch (err: any) {
      setParseError('Gagal memproses data: ' + err.message);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawPastedText(text);
      handleParseText(text, templateTargetRole);
    };
    reader.readAsText(file);
  };

  const handleCommitTemplateImport = async () => {
    triggerHaptic();
    if (parsedPreview.length === 0) return;

    if (templateTargetRole === 'guru') {
      setTeachers(prev => [...prev, ...parsedPreview]);
      for (const item of parsedPreview) {
        try {
          await setDoc(doc(db, 'users', item.id), {
            uid: item.id,
            nama: item.nama,
            email: item.email,
            role: 'guru',
            nip: item.nip,
            mataPelajaran: item.mapel,
            kelas: item.kelas,
            sekolah: adminProfileForm.sekolah,
            createdAt: new Date().toISOString()
          });
        } catch {}
      }
      setActionSuccessMsg(`Admin berhasil mengimpor ${parsedPreview.length} Role Guru!`);
    } else {
      setStudents(prev => [...prev, ...parsedPreview]);
      for (const item of parsedPreview) {
        try {
          await setDoc(doc(db, 'users', item.id), {
            uid: item.id,
            nama: item.nama,
            email: item.email,
            role: 'siswa',
            nis: item.nis,
            kelas: item.kelas,
            jurusan: item.jurusan,
            sekolah: adminProfileForm.sekolah,
            createdAt: new Date().toISOString()
          });
        } catch {}
      }
      setActionSuccessMsg(`Admin berhasil mengimpor ${parsedPreview.length} Role Siswa!`);
    }

    setShowTemplateModal(false);
    setParsedPreview([]);
    setRawPastedText('');
    soundManager.playVictory();
    triggerConfetti();
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  // ADMIN CREATES ROLE (GURU OR SISWA)
  const handleAdminCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();

    const newId = `${selectedRoleToCreate === 'guru' ? 'g' : 's'}-${Date.now()}`;
    const cleanName = manualUserData.nama.trim();
    const cleanEmail = manualUserData.email.trim() || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@smkn1sidayu.sch.id`;

    if (selectedRoleToCreate === 'guru') {
      const newTeacher: TeacherItem = {
        id: newId,
        nama: cleanName,
        nip: manualUserData.nipOrNis.trim(),
        mapel: manualUserData.jurusanOrMapel.trim(),
        kelas: manualUserData.kelas.trim(),
        email: cleanEmail,
      };

      setTeachers(prev => [newTeacher, ...prev]);

      try {
        await setDoc(doc(db, 'users', newId), {
          uid: newId,
          nama: cleanName,
          email: cleanEmail,
          role: 'guru',
          nip: manualUserData.nipOrNis.trim(),
          mataPelajaran: manualUserData.jurusanOrMapel.trim(),
          kelas: manualUserData.kelas.trim(),
          sekolah: adminProfileForm.sekolah,
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Sync firestore:', err);
      }

      setActionSuccessMsg(`Role GURU berhasil dibuat: "${cleanName}"!`);
    } else {
      const newStudent: StudentItem = {
        id: newId,
        nama: cleanName,
        nis: manualUserData.nipOrNis.trim(),
        kelas: manualUserData.kelas,
        jurusan: manualUserData.jurusanOrMapel.trim(),
        email: cleanEmail,
      };

      setStudents(prev => [newStudent, ...prev]);

      try {
        await setDoc(doc(db, 'users', newId), {
          uid: newId,
          nama: cleanName,
          email: cleanEmail,
          role: 'siswa',
          nis: manualUserData.nipOrNis.trim(),
          kelas: manualUserData.kelas,
          jurusan: manualUserData.jurusanOrMapel.trim(),
          sekolah: adminProfileForm.sekolah,
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Sync firestore:', err);
      }

      setActionSuccessMsg(`Role SISWA berhasil dibuat: "${cleanName}" terdaftar di kelas ${manualUserData.kelas}!`);
    }

    setManualUserData({
      nama: '',
      nipOrNis: '',
      kelas: classes[0]?.namaKelas || 'X RPL 1',
      jurusanOrMapel: selectedRoleToCreate === 'guru' ? 'Bahasa Inggris SMK Kelas X' : 'Rekayasa Perangkat Lunak',
      email: '',
    });

    setShowManualModal(false);
    soundManager.playCorrect();
    triggerConfetti();
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  // EDIT USER HANDLER
  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();
    if (!editItem) return;

    if (editItem.role === 'guru') {
      const updatedTeacher: TeacherItem = {
        id: editItem.id,
        nama: editItem.nama.trim(),
        nip: editItem.nipOrNis.trim(),
        mapel: editItem.jurusanOrMapel.trim(),
        kelas: editItem.kelas.trim(),
        email: editItem.email.trim(),
      };
      setTeachers(prev => prev.map(t => t.id === editItem.id ? updatedTeacher : t));
      setActionSuccessMsg(`Data Guru "${updatedTeacher.nama}" berhasil diperbarui!`);

      try {
        await setDoc(doc(db, 'users', editItem.id), {
          uid: editItem.id,
          nama: updatedTeacher.nama,
          nip: updatedTeacher.nip,
          mataPelajaran: updatedTeacher.mapel,
          kelas: updatedTeacher.kelas,
          email: updatedTeacher.email,
          role: 'guru',
          sekolah: adminProfileForm.sekolah,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch {}
    } else {
      const updatedStudent: StudentItem = {
        id: editItem.id,
        nama: editItem.nama.trim(),
        nis: editItem.nipOrNis.trim(),
        kelas: editItem.kelas,
        jurusan: editItem.jurusanOrMapel.trim(),
        email: editItem.email.trim(),
      };
      setStudents(prev => prev.map(s => s.id === editItem.id ? updatedStudent : s));
      setActionSuccessMsg(`Data Siswa "${updatedStudent.nama}" berhasil diperbarui!`);

      try {
        await setDoc(doc(db, 'users', editItem.id), {
          uid: editItem.id,
          nama: updatedStudent.nama,
          nis: updatedStudent.nis,
          kelas: updatedStudent.kelas,
          jurusan: updatedStudent.jurusan,
          email: updatedStudent.email,
          role: 'siswa',
          sekolah: adminProfileForm.sekolah,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch {}
    }

    setEditItem(null);
    soundManager.playCorrect();
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  // DELETE USER
  const handleDeleteUser = (type: 'guru' | 'siswa', id: string, name: string) => {
    triggerHaptic();
    if (confirm(`Apakah Anda yakin ingin menghapus data ${type === 'guru' ? 'Guru' : 'Siswa'} "${name}"?`)) {
      if (type === 'guru') {
        setTeachers(prev => prev.filter(t => t.id !== id));
      } else {
        setStudents(prev => prev.filter(s => s.id !== id));
      }
      try {
        deleteDoc(doc(db, 'users', id));
      } catch {}
      soundManager.playWrong();
      setActionSuccessMsg(`Data "${name}" berhasil dihapus.`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    }
  };

  // CLASSROOM CRUD HANDLERS (UBAH NAMA KELAS & KELOLA KELAS)
  const handleAddClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();

    const newClassId = `c-${Date.now()}`;
    const item: ClassRoomItem = {
      id: newClassId,
      namaKelas: newClassData.namaKelas.trim(),
      jurusan: newClassData.jurusan.trim(),
      guru: newClassData.guru.trim(),
      jmlSiswa: Number(newClassData.jmlSiswa) || 36,
      status: newClassData.status || 'aktif',
    };

    await saveSingleClass(item);
    setClasses(getStoredClasses());

    setShowAddClassModal(false);
    setNewClassData({ namaKelas: '', jurusan: 'Rekayasa Perangkat Lunak', guru: 'Bambang Trianto, S.Pd.', jmlSiswa: 36, status: 'aktif' });
    setActionSuccessMsg(`Kelas baru "${item.namaKelas}" berhasil ditambahkan ke sistem (${item.status})!`);
    soundManager.playCorrect();
    triggerConfetti();
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const handleSaveEditClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();
    if (!editClassItem) return;

    const oldClass = classes.find(c => c.id === editClassItem.id);
    const oldName = oldClass?.namaKelas;
    const newName = editClassItem.namaKelas.trim();

    await saveSingleClass(editClassItem);

    // If name changed, update students assigned to old class
    if (oldName && oldName !== newName) {
      setStudents(prev => prev.map(s => s.kelas === oldName ? { ...s, kelas: newName } : s));
      setTeachers(prev => prev.map(t => t.kelas.includes(oldName) ? { ...t, kelas: t.kelas.replace(oldName, newName) } : t));
    }

    setClasses(getStoredClasses());
    setActionSuccessMsg(`Data & nama kelas berhasil disimpan sebagai "${newName}" (${editClassItem.status || 'aktif'})!`);
    setEditClassItem(null);
    soundManager.playCorrect();
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const handleDeleteClass = async (id: string, name: string) => {
    triggerHaptic();
    if (confirm(`Hapus rombongan belajar kelas "${name}"?`)) {
      await deleteSingleClass(id);
      setClasses(getStoredClasses());
      soundManager.playWrong();
      setActionSuccessMsg(`Kelas "${name}" berhasil dihapus.`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    }
  };

  const handleDeleteInactiveClasses = async () => {
    triggerHaptic();
    const deletedNames = await deleteInactiveClasses();
    setClasses(getStoredClasses());
    setShowDeleteInactiveModal(false);
    if (deletedNames.length > 0) {
      soundManager.playVictory();
      triggerConfetti();
      setActionSuccessMsg(`Berhasil menghapus ${deletedNames.length} kelas belum aktif: [${deletedNames.join(', ')}]!`);
    } else {
      soundManager.playCorrect();
      setActionSuccessMsg('Tidak ada kelas dengan status belum aktif.');
    }
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  const handleToggleClassStatus = async (id: string, name: string) => {
    triggerHaptic();
    const newStatus = await toggleClassStatus(id);
    setClasses(getStoredClasses());
    soundManager.playCorrect();
    setActionSuccessMsg(`Status kelas "${name}" berhasil diubah menjadi: ${newStatus.toUpperCase()}`);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  // KOSONGKAN NILAI HANDLERS (ADMIN FULL CONTROL)
  const handlePurgeAllGrades = async () => {
    triggerHaptic();
    if (confirm('PERINGATAN: Apakah Anda yakin ingin MENGOSONGKAN SELURUH NILAI siswa di sistem? Data nilai di database Firestore akan dihapus bersih.')) {
      const deletedCount = await clearAllScoresFromDb();
      soundManager.playWrong();
      setActionSuccessMsg(`Seluruh data nilai berhasil dikosongkan (${deletedCount} dokumen nilai dibersihkan dari database).`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    }
  };

  const handlePurgeGradesForClass = async (className: string) => {
    triggerHaptic();
    if (confirm(`Kosongkan nilai hanya untuk kelas "${className}"?`)) {
      const count = await clearScoresByClassFromDb(className);
      soundManager.playWrong();
      setActionSuccessMsg(`Nilai untuk kelas ${className} berhasil dikosongkan (${count} data dihapus).`);
      setTimeout(() => setActionSuccessMsg(null), 3500);
    }
  };

  const handleRestoreSampleGrades = () => {
    triggerHaptic();
    setScoresClearedState(false);
    soundManager.playVictory();
    setActionSuccessMsg('Status nilai diaktifkan kembali. Data nilai contoh dapat diakses kembali di menu Penilaian.');
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  // ADMIN PROFILE SAVE ("tulisan profil admin")
  const handleSaveAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();

    await updateAdminProfileTexts({
      nama: adminProfileForm.nama.trim(),
      email: adminProfileForm.email.trim(),
      nip: adminProfileForm.nip.trim(),
      jabatan: adminProfileForm.jabatan.trim(),
      sekolah: adminProfileForm.sekolah.trim(),
      photoURL: adminProfileForm.photoURL,
      bio: adminProfileForm.bio.trim(),
    });

    await updateUserBio({
      nama: adminProfileForm.nama.trim(),
      email: adminProfileForm.email.trim(),
      nip: adminProfileForm.nip.trim(),
      jabatan: adminProfileForm.jabatan.trim(),
      sekolah: adminProfileForm.sekolah.trim(),
      photoURL: adminProfileForm.photoURL,
      bio: adminProfileForm.bio.trim(),
    });

    setActionSuccessMsg('Tulisan profil administrator berhasil diperbarui dan disinkronkan ke seluruh sistem!');
    soundManager.playCorrect();
    triggerConfetti();
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  // ADMIN PASSWORD CHANGE ("sandi admin")
  const handleSaveAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();
    setPassError(null);

    if (newAdminPass.length < 4) {
      setPassError('Sandi admin minimal 4 karakter.');
      return;
    }

    if (newAdminPass !== confirmAdminPass) {
      setPassError('Konfirmasi sandi baru tidak cocok. Periksa kembali.');
      return;
    }

    const success = await updateAdminPassword(newAdminPass);
    if (success) {
      setNewAdminPass('');
      setConfirmAdminPass('');
      soundManager.playVictory();
      triggerConfetti();
      setActionSuccessMsg('Sandi Administrator berhasil diubah! Gunakan sandi baru ini untuk login.');
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } else {
      setPassError('Gagal mengubah sandi admin.');
    }
  };

  // BACKUP DATA
  const handleBackup = () => {
    triggerHaptic();
    const backupPayload = {
      appName: 'Grammar Challenge X - SMKN 1 Sidayu',
      version: '3.0.0',
      timestamp: new Date().toISOString(),
      school: adminProfileForm.sekolah,
      exportedBy: userProfile?.email || adminProfileForm.email,
      adminProfile: adminProfileForm,
      data: {
        teachers,
        students,
        classes,
        questionCount: GRAMMAR_QUESTION_BANK.length,
        materialsCount: GRAMMAR_MATERIALS.length
      }
    };

    const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_Grammar_Admin_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setBackupStatus('Backup data sistem berhasil diekspor sebagai file JSON aman!');
    soundManager.playCorrect();
    triggerConfetti();
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    triggerHaptic();
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.data) {
          if (json.data.teachers) setTeachers(json.data.teachers);
          if (json.data.students) setStudents(json.data.students);
          if (json.data.classes) {
            setClasses(json.data.classes);
            saveStoredClasses(json.data.classes);
          }
          if (json.adminProfile) {
            setAdminProfileForm(json.adminProfile);
            updateAdminProfileTexts(json.adminProfile);
          }
          setBackupStatus('Database sistem berhasil dipulihkan (Restored) dari file cadangan!');
          soundManager.playVictory();
          triggerConfetti();
        }
      } catch {
        setBackupStatus('Gagal memulihkan: Format file JSON tidak valid.');
        soundManager.playWrong();
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold mb-2 border border-rose-500/30">
            <School className="w-3.5 h-3.5 text-rose-400" />
            {adminProfileForm.sekolah} • Pusat Kendali Penuh Administrator
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-white tracking-tight">
            Pusat Kontrol & Manajemen Sistem
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Ubah profil admin, ubah sandi keamanan, ubah nama kelas, kosongkan nilai, kelola role guru & siswa secara terpusat.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleHideLoginCredentials}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm ${
              hideLoginCredentials
                ? 'bg-rose-950/60 text-rose-300 border-rose-500/50 hover:bg-rose-900/60'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
            }`}
            title="Sembunyikan atau tampilkan kartu kredensial akun di halaman login untuk privasi"
          >
            {hideLoginCredentials ? <EyeOff className="w-3.5 h-3.5 text-rose-400" /> : <Eye className="w-3.5 h-3.5 text-amber-400" />}
            <span>{hideLoginCredentials ? 'Kredensial Login: Tersembunyi' : 'Kredensial Login: Terlihat'}</span>
          </button>

          <button
            type="button"
            onClick={elevateToAdmin}
            className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 text-xs font-black border border-rose-500/30 flex items-center gap-1.5 shadow-sm hover:bg-rose-500/30 active:scale-95 transition"
            title="Pastikan hak akses penuh Administrator aktif"
          >
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            Admin: {userProfile?.nama || adminProfileForm.nama}
          </button>
        </div>
      </div>

      {/* Global Success Notification */}
      {actionSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-500 text-emerald-200 text-xs sm:text-sm font-bold flex items-center gap-3 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Admin Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'users', label: 'Kelola Role Guru & Siswa', icon: Users },
          { id: 'classes', label: 'Ubah & Kelola Kelas', icon: GraduationCap, highlight: true },
          { id: 'scores', label: 'Kosongkan & Kelola Nilai', icon: Trash2, highlight: true },
          { id: 'admin-profile', label: 'Tulisan Profil Admin', icon: UserCog, highlight: true },
          { id: 'admin-password', label: 'Sandi Keamanan Admin', icon: KeyRound, highlight: true },
          { id: 'questions', label: 'Monitoring Bank Soal (300+)', icon: Layers },
          { id: 'backup', label: 'Backup & Restore Data', icon: Database },
          { id: 'logs', label: 'Log Aktivitas Sistem', icon: Activity },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { triggerHaptic(); setActiveTab(tab.id as any); }}
              className={`px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition border active:scale-95 touch-manipulation cursor-pointer ${
                isActive
                  ? 'bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-600/30'
                  : tab.highlight
                  ? 'bg-slate-900 text-amber-300 border-amber-500/40 hover:bg-slate-800'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: KELOLA ROLE GURU & SISWA */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Action Toolbar */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex items-center p-1.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 self-start">
              <button
                onClick={() => { triggerHaptic(); setUserSubTab('guru'); }}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
                  userSubTab === 'guru'
                    ? 'bg-amber-500 text-slate-950 font-heading font-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                Role Guru Pengampu ({teachers.length})
              </button>
              <button
                onClick={() => { triggerHaptic(); setUserSubTab('siswa'); }}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
                  userSubTab === 'siswa'
                    ? 'bg-emerald-500 text-slate-950 font-heading font-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                Role Siswa ({students.length})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => {
                  triggerHaptic();
                  setTemplateTargetRole(userSubTab);
                  setParsedPreview([]);
                  setRawPastedText('');
                  setParseError(null);
                  setShowTemplateModal(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-heading font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/30 flex items-center gap-2 active:scale-95 transition cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Input CSV / Excel
              </button>

              <button
                onClick={() => {
                  triggerHaptic();
                  setSelectedRoleToCreate(userSubTab);
                  setManualUserData({
                    nama: '',
                    nipOrNis: '',
                    kelas: classes[0]?.namaKelas || 'X RPL 1',
                    jurusanOrMapel: userSubTab === 'guru' ? 'Bahasa Inggris SMK Kelas X' : 'Rekayasa Perangkat Lunak',
                    email: '',
                  });
                  setShowManualModal(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:brightness-110 text-slate-950 font-heading font-black text-xs sm:text-sm shadow-md shadow-amber-500/20 flex items-center gap-2 active:scale-95 transition cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                Buat User Baru (Guru / Siswa)
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={`Cari nama, ${userSubTab === 'guru' ? 'NIP, mapel' : 'NIS, jurusan'}, atau kelas...`}
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Teachers list */}
          {userSubTab === 'guru' && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="font-heading font-bold text-white text-base flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-amber-400" />
                  Daftar Guru Pengampu ({filteredTeachers.length} Guru)
                </h3>
                <button
                  onClick={() => handleDownloadTemplate('guru')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh Template Guru (.csv)
                </button>
              </div>

              <div className="space-y-3">
                {filteredTeachers.map(g => (
                  <div key={g.id} className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-heading font-black text-white text-base">{g.nama}</p>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Role: Guru
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        NIP: <span className="text-slate-300 font-mono">{g.nip}</span> • {g.mapel}
                      </p>
                      <p className="text-xs text-indigo-400 font-mono">{g.email}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 text-xs font-bold rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
                        Kelas: {g.kelas}
                      </span>

                      <button
                        onClick={() => {
                          triggerHaptic();
                          setEditItem({
                            id: g.id,
                            role: 'guru',
                            nama: g.nama,
                            nipOrNis: g.nip,
                            kelas: g.kelas,
                            jurusanOrMapel: g.mapel,
                            email: g.email,
                          });
                        }}
                        className="p-2 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-95 cursor-pointer"
                        title="Edit Data Guru"
                      >
                        <Edit3 className="w-4 h-4 text-amber-400" />
                      </button>

                      <button
                        onClick={() => handleDeleteUser('guru', g.id, g.nama)}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition active:scale-95 cursor-pointer"
                        title="Hapus Guru"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Students list */}
          {userSubTab === 'siswa' && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="font-heading font-bold text-white text-base flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  Daftar Siswa Terdaftar ({filteredStudents.length} Siswa)
                </h3>
                <button
                  onClick={() => handleDownloadTemplate('siswa')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh Template Siswa (.csv)
                </button>
              </div>

              <div className="space-y-3">
                {filteredStudents.map(s => (
                  <div key={s.id} className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-heading font-black text-white text-base">{s.nama}</p>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Role: Siswa • {s.kelas}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        NIS: <span className="text-slate-300 font-mono">{s.nis}</span> • Jurusan: <span className="text-slate-300">{s.jurusan}</span>
                      </p>
                      <p className="text-xs text-indigo-400 font-mono">{s.email}</p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => {
                          triggerHaptic();
                          setEditItem({
                            id: s.id,
                            role: 'siswa',
                            nama: s.nama,
                            nipOrNis: s.nis,
                            kelas: s.kelas,
                            jurusanOrMapel: s.jurusan,
                            email: s.email,
                          });
                        }}
                        className="p-2 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-95 cursor-pointer"
                        title="Edit Data Siswa"
                      >
                        <Edit3 className="w-4 h-4 text-emerald-400" />
                      </button>

                      <button
                        onClick={() => handleDeleteUser('siswa', s.id, s.nama)}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition active:scale-95 cursor-pointer"
                        title="Hapus Siswa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: UBAH & KELOLA KELAS (DYNAMIC REALTIME) */}
      {activeTab === 'classes' && (() => {
        const activeClassesCount = classes.filter(c => c.status === 'aktif').length;
        const inactiveClassesCount = classes.filter(c => c.status === 'belum aktif').length;
        const displayedClasses = classes.filter(c => {
          if (classFilter === 'aktif') return c.status === 'aktif';
          if (classFilter === 'belum aktif') return c.status === 'belum aktif';
          return true;
        });

        return (
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h3 className="font-heading font-black text-xl text-white flex items-center gap-2">
                  <GraduationCap className="w-6 h-6 text-indigo-400" />
                  Ubah Nama & Kelola Rombongan Belajar (Rombel) Kelas
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                  Admin memiliki kendali penuh mengubah nama kelas (misal dari "X RPL 1" ke "X PPLG 1"), menghapus kelas yang belum aktif, menambah kelas baru, atau mengatur status aktif/belum aktif secara instan.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setShowDeleteInactiveModal(true);
                  }}
                  className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-heading font-black shadow-lg flex items-center gap-2 active:scale-95 transition cursor-pointer ${
                    inactiveClassesCount > 0
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 ring-2 ring-rose-400/50'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                  title="Hapus semua rombongan belajar kelas yang belum aktif"
                >
                  <Trash2 className="w-4 h-4 text-rose-300" />
                  <span>
                    {inactiveClassesCount > 0 
                      ? `Hapus Kelas Belum Aktif (${inactiveClassesCount})` 
                      : 'Hapus Kelas Belum Aktif (0)'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setShowAddClassModal(true);
                  }}
                  className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-heading font-black text-xs sm:text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-2 active:scale-95 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Kelas Baru
                </button>
              </div>
            </div>

            {/* Filter Tabs for Classes */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 mr-1">Filter Tampilan:</span>
                <button
                  type="button"
                  onClick={() => { triggerHaptic(); setClassFilter('semua'); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    classFilter === 'semua'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Semua ({classes.length})
                </button>
                <button
                  type="button"
                  onClick={() => { triggerHaptic(); setClassFilter('aktif'); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    classFilter === 'aktif'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-800 text-emerald-400 hover:text-white'
                  }`}
                >
                  <span>🟢 Kelas Aktif ({activeClassesCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => { triggerHaptic(); setClassFilter('belum aktif'); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    classFilter === 'belum aktif'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'bg-slate-800 text-amber-400 hover:text-white'
                  }`}
                >
                  <span>🟡 Belum Aktif ({inactiveClassesCount})</span>
                </button>
              </div>

              {inactiveClassesCount > 0 && (
                <div className="text-xs text-amber-400 font-semibold flex items-center gap-1.5 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/30">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Ada {inactiveClassesCount} kelas belum aktif yang siap dihapus</span>
                </div>
              )}
            </div>

            {displayedClasses.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-800/40 border border-slate-800 text-center space-y-2">
                <p className="text-sm font-bold text-slate-300">Tidak ada kelas dalam kategori ini.</p>
                <p className="text-xs text-slate-500">Semua kelas yang belum aktif telah dihapus atau dipindahkan ke status aktif.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedClasses.map(c => {
                  const isBelumAktif = c.status === 'belum aktif';
                  return (
                    <div 
                      key={c.id} 
                      className={`p-5 rounded-2xl border space-y-3 transition shadow-md ${
                        isBelumAktif
                          ? 'bg-slate-900/90 border-amber-500/40 hover:border-amber-400/70'
                          : 'bg-slate-800/80 border-slate-700/60 hover:border-indigo-500/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-black text-white text-lg">{c.namaKelas}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                            !isBelumAktif
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}>
                            {!isBelumAktif ? '🟢 Aktif' : '🟡 Belum Aktif'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {c.jmlSiswa} Siswa
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs text-slate-300 font-medium">
                          <span className="text-slate-500">Jurusan: </span>{c.jurusan}
                        </p>
                        <p className="text-xs text-slate-400">
                          <span className="text-slate-500">Guru Pengampu: </span>{c.guru}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-700/60">
                        <button
                          type="button"
                          onClick={() => handleToggleClassStatus(c.id, c.namaKelas)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition active:scale-95 cursor-pointer ${
                            !isBelumAktif
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-300 border-slate-700'
                              : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                          }`}
                          title={`Ubah status kelas`}
                        >
                          {!isBelumAktif ? 'Jadikan Belum Aktif' : 'Aktifkan Kelas'}
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic();
                              setEditClassItem({ ...c });
                            }}
                            className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer"
                            title="Ubah Nama Kelas"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-300" />
                            <span>Ubah Nama</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteClass(c.id, c.namaKelas)}
                            className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition active:scale-95 cursor-pointer"
                            title="Hapus Kelas"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* TAB 3: KOSONGKAN & KELOLA NILAI */}
      {activeTab === 'scores' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
          <div className="pb-4 border-b border-slate-800">
            <h3 className="font-heading font-black text-xl text-white flex items-center gap-2">
              <Trash2 className="w-6 h-6 text-rose-400" />
              Pengelolaan & Pengosongan Data Nilai Siswa
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Admin memiliki hak istimewa untuk mengosongkan nilai secara total (reset nilai seluruh siswa), mengosongkan nilai per kelas tertentu, atau membersihkan data simulasi untuk memulai tahun ajaran / semester baru.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Box 1: Kosongkan Total */}
            <div className="p-6 rounded-3xl bg-rose-950/20 border border-rose-500/40 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-rose-600/20 text-rose-400">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-heading font-black text-white text-base">Kosongkan SEMUA Nilai Siswa</h4>
                  <p className="text-xs text-slate-400">Hapus bersih seluruh catatan nilai di Firestore</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tindakan ini akan menghapus semua dokumen nilai dari koleksi <code className="text-rose-300 font-mono">scores</code> di Firebase Firestore dan mengosongkan buku nilai sehingga dimulai dari 0.
              </p>
              <button
                type="button"
                onClick={handlePurgeAllGrades}
                className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-heading font-black text-xs sm:text-sm shadow-xl shadow-rose-600/30 transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Kosongkan Semua Nilai Sekarang
              </button>
            </div>

            {/* Box 2: Kosongkan Nilai Per Rombel Kelas */}
            <div className="p-6 rounded-3xl bg-slate-800/60 border border-slate-700 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-heading font-black text-white text-base">Kosongkan Nilai Per Kelas</h4>
                  <p className="text-xs text-slate-400">Pilih kelas tertentu yang ingin di-reset nilainya</p>
                </div>
              </div>
              <p className="text-xs text-slate-300">
                Pilih rombongan belajar kelas di bawah untuk mengosongkan nilai khusus kelas tersebut tanpa mengganggu kelas lainnya:
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {classes.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handlePurgeGradesForClass(c.namaKelas)}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-amber-400/50 hover:bg-slate-800 text-left text-xs font-bold text-slate-200 transition flex items-center justify-between cursor-pointer"
                  >
                    <span>{c.namaKelas}</span>
                    <span className="text-[10px] text-rose-400 font-normal">Reset</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Reset / Restore Sample Data */}
          <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-700/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="font-bold text-indigo-300">Butuh Menguji Coba Nilai Kembali?</span>
              <p className="text-slate-400 text-[11px]">Anda dapat memuat kembali data contoh/simulasi nilai siswa jika diperlukan pengujian.</p>
            </div>
            <button
              type="button"
              onClick={handleRestoreSampleGrades}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 shrink-0 cursor-pointer"
            >
              Aktifkan Kembali Nilai Contoh
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: TULISAN PROFIL ADMIN ("tulisan profil admin") */}
      {activeTab === 'admin-profile' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold mb-2 border border-rose-500/30">
                <UserCog className="w-3.5 h-3.5 text-rose-400" />
                Pengaturan Tulisan & Biodata Profil Admin
              </div>
              <h2 className="font-heading font-black text-2xl text-white">
                Ubah Tulisan & Data Profil Administrator
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Ubah nama lengkap admin, nama sekolah, jabatan, bio, dan avatar administrator sesuai keinginan Anda.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveAdminProfile} className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
            <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/60 space-y-3">
              <label className="block text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                <Smile className="w-4 h-4 text-amber-400" />
                Pilih Foto Karakter Avatar Admin
              </label>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                {PRESET_AVATARS.map(av => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setAdminProfileForm({ ...adminProfileForm, photoURL: av.url });
                    }}
                    className={`p-2 rounded-2xl border transition-all text-center flex flex-col items-center gap-1 active:scale-95 cursor-pointer ${
                      adminProfileForm.photoURL === av.url 
                        ? 'bg-rose-500/20 border-rose-400 ring-2 ring-rose-400 scale-105' 
                        : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-950">
                      <img src={av.url} alt={av.label} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-300 truncate max-w-[80px]">
                      {av.label}
                    </span>
                  </button>
                ))}
              </div>

              <div className="pt-1">
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Atau Masukkan URL Foto Khusus:
                </label>
                <input
                  type="url"
                  value={adminProfileForm.photoURL}
                  onChange={e => setAdminProfileForm({ ...adminProfileForm, photoURL: e.target.value })}
                  placeholder="https://... atau URL foto Anda"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wide mb-1.5">
                  Nama Lengkap Administrator *
                </label>
                <input
                  type="text"
                  required
                  value={adminProfileForm.nama}
                  onChange={e => setAdminProfileForm({ ...adminProfileForm, nama: e.target.value })}
                  placeholder="Contoh: Ahmad Wibowo, S.Pd. atau Heru Admin"
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white font-bold focus:outline-none focus:border-rose-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wide mb-1.5">
                  Nama Sekolah (Bisa Diubah Sesuai Sekolah Anda) *
                </label>
                <input
                  type="text"
                  required
                  value={adminProfileForm.sekolah}
                  onChange={e => setAdminProfileForm({ ...adminProfileForm, sekolah: e.target.value })}
                  placeholder="Contoh: SMKN 1 Sidayu"
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white font-bold focus:outline-none focus:border-rose-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wide mb-1.5">
                  NIP / ID Pegawai Admin
                </label>
                <input
                  type="text"
                  value={adminProfileForm.nip}
                  onChange={e => setAdminProfileForm({ ...adminProfileForm, nip: e.target.value })}
                  placeholder="Contoh: 19840218 200902 1 004"
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-rose-400"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wide mb-1.5">
                  Jabatan / Unit Tugas Administrator
                </label>
                <input
                  type="text"
                  value={adminProfileForm.jabatan}
                  onChange={e => setAdminProfileForm({ ...adminProfileForm, jabatan: e.target.value })}
                  placeholder="Contoh: Koordinator IT & Administrator Utama"
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-rose-400"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wide mb-1.5">
                  Email Akun Admin
                </label>
                <input
                  type="email"
                  value={adminProfileForm.email}
                  onChange={e => setAdminProfileForm({ ...adminProfileForm, email: e.target.value })}
                  placeholder="ahmadwibowo62@guru.sma.belajar.id"
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white font-mono focus:outline-none focus:border-rose-400"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wide mb-1.5">
                  Tulisan Bio / Visi Administrator
                </label>
                <textarea
                  rows={2}
                  value={adminProfileForm.bio}
                  onChange={e => setAdminProfileForm({ ...adminProfileForm, bio: e.target.value })}
                  placeholder="Tuliskan catatan atau visi administrator sistem..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-rose-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-800">
              <button
                type="submit"
                className="px-7 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:brightness-110 text-white font-heading font-black text-sm shadow-xl shadow-rose-600/25 active:scale-95 transition flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Simpan Tulisan Profil Admin
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 5: SANDI KEAMANAN ADMIN ("sandi admin") */}
      {activeTab === 'admin-password' && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold mb-2 border border-rose-500/30">
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              Keamanan Akun & Hak Akses
            </div>
            <h2 className="font-heading font-black text-2xl text-white">
              Ubah Sandi / Password Administrator
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Atur sandi khusus untuk akun Admin agar aman dari akses siswa atau pengguna yang tidak berhak.
            </p>
          </div>

          <form onSubmit={handleSaveAdminPassword} className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Sandi Admin Aktif Saat Ini:</span>
              <p className="font-mono text-sm font-bold text-amber-300">
                {showPassText ? adminPassword : '••••••••••••'}
              </p>
            </div>

            {passError && (
              <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500 text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{passError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-200 uppercase tracking-wide mb-1.5">
                Sandi Baru Administrator *
              </label>
              <div className="relative">
                <input
                  type={showPassText ? 'text' : 'password'}
                  required
                  minLength={4}
                  value={newAdminPass}
                  onChange={e => setNewAdminPass(e.target.value)}
                  placeholder="Masukkan sandi admin baru..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-rose-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassText(!showPassText)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 uppercase tracking-wide mb-1.5">
                Konfirmasi Sandi Baru *
              </label>
              <input
                type={showPassText ? 'text' : 'password'}
                required
                minLength={4}
                value={confirmAdminPass}
                onChange={e => setConfirmAdminPass(e.target.value)}
                placeholder="Ulangi sandi admin baru..."
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-rose-400"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:brightness-110 text-white font-heading font-black text-sm shadow-xl shadow-rose-600/30 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                Simpan & Perbarui Sandi Admin
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 6: MONITORING BANK SOAL (300+ SOAL) */}
      {activeTab === 'questions' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-heading font-bold text-white text-base flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" />
                Bank Soal Grammar Aktif ({GRAMMAR_QUESTION_BANK.length} Butir Soal Terverifikasi)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Mencakup 6 kategori grammar Kurikulum Merdeka Fase E dan 3 tingkat kesulitan.
              </p>
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700">
            {GRAMMAR_QUESTION_BANK.slice(0, 15).map((q) => (
              <div key={q.id} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/50 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                    {q.category} • Level {q.level}
                  </span>
                  <span className="text-slate-400">{q.difficulty}</span>
                </div>
                <p className="font-bold text-white text-sm">{q.question}</p>
                <p className="text-xs text-emerald-400 font-semibold">Kunci: "{q.answer}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: BACKUP & RESTORE DATA */}
      {activeTab === 'backup' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
          <div>
            <h3 className="font-heading font-black text-white text-lg flex items-center gap-2">
              <Database className="w-5 h-5 text-rose-400" />
              Backup & Restore Data Sistem
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Simpan cadangan data seluruh siswa, guru, profil admin, kelas, dan soal secara aman dalam format JSON.
            </p>
          </div>

          {backupStatus && (
            <div className="p-4 rounded-2xl bg-indigo-950/60 border border-indigo-500 text-indigo-200 text-xs sm:text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-400" />
              {backupStatus}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="p-6 rounded-3xl bg-slate-800/70 border border-slate-700 space-y-4 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Download className="w-7 h-7" />
              </div>
              <h4 className="font-heading font-bold text-white text-base">Ekspor Cadangan (Backup Data)</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Unduh file arsip berformat JSON berisi seluruh riwayat akun, profil admin, master kelas, dan konfigurasi.
              </p>
              <button
                onClick={handleBackup}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-heading font-bold text-sm shadow-lg shadow-indigo-600/30 transition active:scale-95 cursor-pointer"
              >
                Unduh Cadangan JSON Sekarang
              </button>
            </div>

            <div className="p-6 rounded-3xl bg-slate-800/70 border border-slate-700 space-y-4 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Upload className="w-7 h-7" />
              </div>
              <h4 className="font-heading font-bold text-white text-base">Pulihkan Data (Restore Data)</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Unggah file cadangan JSON yang sebelumnya diekspor untuk memulihkan keadaan data sistem.
              </p>
              <label className="block w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-bold text-sm shadow-lg shadow-emerald-600/30 transition cursor-pointer text-center">
                Pilih File Cadangan JSON
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestore}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: LOG AKTIVITAS */}
      {activeTab === 'logs' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <h3 className="font-heading font-bold text-white text-base flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Audit Log Aktivitas Terkini
          </h3>

          <div className="space-y-2.5">
            {activityLogs.map((log, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-cyan-400 font-bold">{log.time}</span>
                  <div>
                    <span className="font-bold text-white">{log.user}: </span>
                    <span className="text-slate-300">{log.action}</span>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                  Sukses
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: ADMIN BUAT USER BARU */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-heading font-black text-lg sm:text-xl text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-amber-400" />
                  Buat Pengguna Baru (Role Guru / Siswa)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Admin dapat menetapkan peran secara langsung untuk warga sekolah.
                </p>
              </div>
              <button
                onClick={() => setShowManualModal(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdminCreateUserSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1.5">
                  Pilih Peran Akun (Role) *
                </label>
                <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-800 border border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRoleToCreate('guru');
                      setManualUserData(prev => ({
                        ...prev,
                        jurusanOrMapel: 'Bahasa Inggris SMK Kelas X'
                      }));
                    }}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 transition ${
                      selectedRoleToCreate === 'guru'
                        ? 'bg-amber-500 text-slate-950 shadow-md font-heading font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    Role Guru
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRoleToCreate('siswa');
                      setManualUserData(prev => ({
                        ...prev,
                        jurusanOrMapel: 'Rekayasa Perangkat Lunak'
                      }));
                    }}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 transition ${
                      selectedRoleToCreate === 'siswa'
                        ? 'bg-emerald-500 text-slate-950 shadow-md font-heading font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Role Siswa
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">
                  Nama Lengkap & Gelar *
                </label>
                <input
                  type="text"
                  required
                  value={manualUserData.nama}
                  onChange={e => setManualUserData({ ...manualUserData, nama: e.target.value })}
                  placeholder={selectedRoleToCreate === 'guru' ? 'Contoh: Drs. Wahyu Hidayat' : 'Contoh: Bagas Pratama'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">
                    {selectedRoleToCreate === 'guru' ? 'NIP / NUPTK' : 'NIS Siswa'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualUserData.nipOrNis}
                    onChange={e => setManualUserData({ ...manualUserData, nipOrNis: e.target.value })}
                    placeholder={selectedRoleToCreate === 'guru' ? '1987...' : '2324...'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">
                    {selectedRoleToCreate === 'guru' ? 'Kelas Binaan' : 'Kelas Siswa'} *
                  </label>
                  <select
                    value={manualUserData.kelas}
                    onChange={e => setManualUserData({ ...manualUserData, kelas: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.namaKelas}>{c.namaKelas}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">
                  {selectedRoleToCreate === 'guru' ? 'Mata Pelajaran' : 'Jurusan / Konsentrasi Keahlian'} *
                </label>
                <input
                  type="text"
                  required
                  value={manualUserData.jurusanOrMapel}
                  onChange={e => setManualUserData({ ...manualUserData, jurusanOrMapel: e.target.value })}
                  placeholder={selectedRoleToCreate === 'guru' ? 'Bahasa Inggris SMK Kelas X' : 'Rekayasa Perangkat Lunak'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">
                  Email Akun (Opsional)
                </label>
                <input
                  type="email"
                  value={manualUserData.email}
                  onChange={e => setManualUserData({ ...manualUserData, email: e.target.value })}
                  placeholder="otomatis dibuat jika dikosongkan"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:brightness-110 text-slate-950 font-heading font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 active:scale-95"
                >
                  Daftarkan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT USER */}
      {editItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-heading font-black text-lg text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                Edit Data {editItem.role === 'guru' ? 'Guru' : 'Siswa'}
              </h3>
              <button
                onClick={() => setEditItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={editItem.nama}
                  onChange={e => setEditItem({ ...editItem, nama: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">
                    {editItem.role === 'guru' ? 'NIP' : 'NIS'}
                  </label>
                  <input
                    type="text"
                    value={editItem.nipOrNis}
                    onChange={e => setEditItem({ ...editItem, nipOrNis: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">Kelas</label>
                  <select
                    value={editItem.kelas}
                    onChange={e => setEditItem({ ...editItem, kelas: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.namaKelas}>{c.namaKelas}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">
                  {editItem.role === 'guru' ? 'Mata Pelajaran' : 'Jurusan'}
                </label>
                <input
                  type="text"
                  value={editItem.jurusanOrMapel}
                  onChange={e => setEditItem({ ...editItem, jurusanOrMapel: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Email</label>
                <input
                  type="email"
                  value={editItem.email}
                  onChange={e => setEditItem({ ...editItem, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH KELAS BARU */}
      {showAddClassModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-heading font-black text-lg text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                Tambah Rombel Kelas Baru
              </h3>
              <button
                onClick={() => setShowAddClassModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddClassSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Nama Rombel Kelas *</label>
                <input
                  type="text"
                  required
                  value={newClassData.namaKelas}
                  onChange={e => setNewClassData({ ...newClassData, namaKelas: e.target.value })}
                  placeholder="Contoh: X PPLG 1 atau X TKJ 2"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Program Keahlian / Jurusan *</label>
                <input
                  type="text"
                  required
                  value={newClassData.jurusan}
                  onChange={e => setNewClassData({ ...newClassData, jurusan: e.target.value })}
                  placeholder="Contoh: Pengembangan Perangkat Lunak & Gim"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Guru Pengampu</label>
                <input
                  type="text"
                  value={newClassData.guru}
                  onChange={e => setNewClassData({ ...newClassData, guru: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Jumlah Siswa</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={newClassData.jmlSiswa}
                  onChange={e => setNewClassData({ ...newClassData, jmlSiswa: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Status Rombel Kelas</label>
                <select
                  value={newClassData.status}
                  onChange={e => setNewClassData({ ...newClassData, status: e.target.value as 'aktif' | 'belum aktif' })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold"
                >
                  <option value="aktif">🟢 Aktif (Tampil di Game, Leaderboard, & Filter)</option>
                  <option value="belum aktif">🟡 Belum Aktif (Disembunyikan / Draft)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddClassModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs cursor-pointer"
                >
                  Tambah Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UBAH NAMA KELAS ("ubah nama kelas") */}
      {editClassItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-heading font-black text-lg text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-400" />
                Ubah Nama & Data Kelas
              </h3>
              <button
                onClick={() => setEditClassItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditClassSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">
                  Nama Kelas (Bisa Diubah Bebas) *
                </label>
                <input
                  type="text"
                  required
                  value={editClassItem.namaKelas}
                  onChange={e => setEditClassItem({ ...editClassItem, namaKelas: e.target.value })}
                  placeholder="Contoh: X PPLG 1"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-indigo-500/60 text-white font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">
                  Jurusan / Konsentrasi Keahlian *
                </label>
                <input
                  type="text"
                  required
                  value={editClassItem.jurusan}
                  onChange={e => setEditClassItem({ ...editClassItem, jurusan: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Guru Pengampu</label>
                <input
                  type="text"
                  value={editClassItem.guru}
                  onChange={e => setEditClassItem({ ...editClassItem, guru: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Jumlah Siswa</label>
                <input
                  type="number"
                  min="1"
                  value={editClassItem.jmlSiswa}
                  onChange={e => setEditClassItem({ ...editClassItem, jmlSiswa: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Status Keaktifan Kelas</label>
                <select
                  value={editClassItem.status || 'aktif'}
                  onChange={e => setEditClassItem({ ...editClassItem, status: e.target.value as 'aktif' | 'belum aktif' })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold"
                >
                  <option value="aktif">🟢 Aktif (Tampil di Game & Leaderboard)</option>
                  <option value="belum aktif">🟡 Belum Aktif (Disembunyikan)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditClassItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs cursor-pointer"
                >
                  Simpan Nama Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: HAPUS KELAS BELUM AKTIF */}
      {showDeleteInactiveModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl shadow-2xl p-6 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-heading font-black text-lg text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-400" />
                Hapus Kelas Belum Aktif
              </h3>
              <button
                onClick={() => setShowDeleteInactiveModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300 leading-relaxed">
                Tindakan ini akan <strong className="text-rose-400">menghapus permanen</strong> seluruh rombongan belajar kelas yang saat ini berstatus <span className="text-amber-300 font-bold">"Belum Aktif"</span> dari sistem dan database.
              </p>

              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                <div className="font-bold text-slate-200 uppercase text-[11px]">
                  Daftar Kelas Belum Aktif Saat Ini ({classes.filter(c => c.status === 'belum aktif').length}):
                </div>
                {classes.filter(c => c.status === 'belum aktif').length === 0 ? (
                  <div className="text-slate-400 italic py-2 text-center">
                    Tidak ada kelas berstatus belum aktif saat ini. Semua kelas di sistem sudah aktif!
                  </div>
                ) : (
                  <ul className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {classes.filter(c => c.status === 'belum aktif').map(c => (
                      <li key={c.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-900 text-slate-200 border border-slate-800">
                        <span className="font-bold">{c.namaKelas}</span>
                        <span className="text-[10px] text-amber-400 font-medium">{c.jurusan}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeleteInactiveModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteInactiveClasses}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-heading font-black text-xs shadow-lg shadow-rose-600/30 transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Ya, Hapus Kelas Belum Aktif
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IMPORT CSV */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-heading font-black text-lg text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                Impor Data Massal dari Template Excel / CSV
              </h3>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Target Role:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTemplateTargetRole('siswa');
                      if (rawPastedText) handleParseText(rawPastedText, 'siswa');
                    }}
                    className={`py-2 rounded-xl text-xs font-bold border ${
                      templateTargetRole === 'siswa'
                        ? 'bg-emerald-600 text-white border-emerald-400'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    Role Siswa
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTemplateTargetRole('guru');
                      if (rawPastedText) handleParseText(rawPastedText, 'guru');
                    }}
                    className={`py-2 rounded-xl text-xs font-bold border ${
                      templateTargetRole === 'guru'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    Role Guru
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Unduh Template:</label>
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate(templateTargetRole)}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold text-xs border border-slate-700 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Format .CSV {templateTargetRole === 'guru' ? 'Guru' : 'Siswa'}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 uppercase">
                Unggah File .CSV atau Tempel Baris Spreadsheet:
              </label>
              <input
                type="file"
                accept=".csv, .txt"
                onChange={handleFileUpload}
                className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white bg-slate-800 p-2 rounded-2xl border border-slate-700"
              />
              <textarea
                rows={3}
                value={rawPastedText}
                onChange={(e) => {
                  setRawPastedText(e.target.value);
                  handleParseText(e.target.value, templateTargetRole);
                }}
                placeholder="Atau paste baris data Excel di sini..."
                className="w-full p-3 rounded-2xl bg-slate-800 border border-slate-700 text-xs font-mono text-white"
              />
            </div>

            {parseError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500 text-rose-300 text-xs font-semibold">
                {parseError}
              </div>
            )}

            {parsedPreview.length > 0 && (
              <div className="text-xs font-bold text-emerald-400">
                Siap mengimpor {parsedPreview.length} data {templateTargetRole}!
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={parsedPreview.length === 0}
                onClick={handleCommitTemplateImport}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs"
              >
                Konfirmasi Impor ({parsedPreview.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
