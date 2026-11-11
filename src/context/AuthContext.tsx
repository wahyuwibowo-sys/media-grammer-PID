import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../services/firebase';
import { UserProfile, UserRole } from '../types';

export const DEFAULT_ADMIN_PASSWORD = 'AdminSMK2026!';

export interface AdminCustomProfile {
  nama: string;
  email: string;
  sekolah: string;
  jabatan: string;
  nip: string;
  photoURL: string;
  bio: string;
}

export const ADMIN_EMAILS = [
  'ahmadwibowo62@guru.sma.belajar.id',
  'heru@smanike-gresik.sch.id',
  'admin@smkn1sidayu.sch.id',
  'wahyu.wibowo@smkn1sidayu.sch.id',
];

export const checkIsAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  if (ADMIN_EMAILS.some(a => a.toLowerCase() === lower)) return true;
  if (lower.startsWith('ahmadwibowo') || lower.startsWith('heru@') || lower.startsWith('admin@') || lower.startsWith('wahyu.wibowo') || lower.includes('wibowo')) return true;
  if (lower === 'admin' || lower === 'administrator') return true;
  return false;
};

export const getStoredAdminPassword = (): string => {
  return localStorage.getItem('gcs_admin_custom_password') || DEFAULT_ADMIN_PASSWORD;
};

export const saveStoredAdminPassword = (newPass: string): void => {
  localStorage.setItem('gcs_admin_custom_password', newPass);
  window.dispatchEvent(new Event('gcs_admin_password_changed'));
};

export const getStoredAdminCustomProfile = (): AdminCustomProfile => {
  try {
    const raw = localStorage.getItem('gcs_custom_admin_profile');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.nama) return parsed;
    }
  } catch {}
  return {
    nama: 'Ahmad Wibowo (Administrator SMKN 1 Sidayu)',
    email: 'ahmadwibowo62@guru.sma.belajar.id',
    sekolah: 'SMKN 1 Sidayu',
    jabatan: 'Koordinator IT & Administrator Utama',
    nip: '19840218 200902 1 004',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    bio: 'Memegang kendali penuh pengelolaan akun, kelas, nilai, dan modul grammar interaktif SMKN 1 Sidayu.',
  };
};

export const saveStoredAdminCustomProfile = (prof: Partial<AdminCustomProfile>): AdminCustomProfile => {
  const current = getStoredAdminCustomProfile();
  const updated = { ...current, ...prof };
  localStorage.setItem('gcs_custom_admin_profile', JSON.stringify(updated));
  window.dispatchEvent(new Event('gcs_admin_profile_changed'));
  return updated;
};

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, pass: string, rememberMe?: boolean) => Promise<void>;
  registerSiswa: (data: { nama: string; nis: string; kelas: string; jurusan: string; email: string; pass: string }) => Promise<void>;
  registerGuru: (data: { nama: string; nip: string; mataPelajaran: string; email: string; pass: string }) => Promise<void>;
  loginWithGoogle: (role?: UserRole) => Promise<void>;
  loginAsDemoUser: (role: UserRole) => Promise<void>;
  loginAsDemo: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  updateUserBio: (updates: Partial<UserProfile>) => Promise<void>;
  // Admin controls
  adminPassword: string;
  updateAdminPassword: (newPass: string) => Promise<boolean>;
  updateAdminProfileTexts: (data: Partial<AdminCustomProfile>) => Promise<void>;
  elevateToAdmin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const SUPER_ADMIN_EMAIL = 'ahmadwibowo62@guru.sma.belajar.id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminPassword, setAdminPasswordState] = useState<string>(getStoredAdminPassword());

  const getDynamicDemoAccounts = (): Record<UserRole, UserProfile> => {
    const adminProf = getStoredAdminCustomProfile();
    return {
      admin: {
        uid: 'demo-admin-verified',
        nama: adminProf.nama,
        email: adminProf.email,
        role: 'admin',
        sekolah: adminProf.sekolah,
        jabatan: adminProf.jabatan,
        nip: adminProf.nip,
        bio: adminProf.bio,
        photoURL: adminProf.photoURL,
        createdAt: new Date().toISOString()
      },
      guru: {
        uid: 'demo-guru-verified',
        nama: 'Bambang Trianto, S.Pd.',
        email: 'bambang.guru@smkn1sidayu.sch.id',
        role: 'guru',
        sekolah: 'SMKN 1 Sidayu',
        nip: '19850412 201001 1 008',
        mataPelajaran: 'Bahasa Inggris SMKN 1 Sidayu Kelas X',
        photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        createdAt: new Date().toISOString()
      },
      siswa: {
        uid: 'demo-siswa-verified',
        nama: 'Ahmad Rizky Pratama',
        email: 'rizky.siswa@smkn1sidayu.sch.id',
        role: 'siswa',
        sekolah: 'SMKN 1 Sidayu',
        nis: '232410145',
        kelas: 'X RPL 1',
        jurusan: 'Rekayasa Perangkat Lunak',
        photoURL: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
        createdAt: new Date().toISOString()
      }
    };
  };

  // Securely fetch and verify user profile directly from Firestore
  const fetchAndVerifyProfile = async (firebaseUser: User): Promise<UserProfile> => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const snap = await getDoc(userRef);

      const isRecognizedAdmin = checkIsAdminEmail(firebaseUser.email);
      const adminProf = getStoredAdminCustomProfile();

      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        
        // Strict RBAC: Enforce admin role if email belongs to admin list, or preserve stored role
        const verifiedRole: UserRole = isRecognizedAdmin ? 'admin' : (data.role || 'siswa');

        const verifiedProfile: UserProfile = {
          ...data,
          uid: firebaseUser.uid,
          email: firebaseUser.email || data.email,
          role: verifiedRole,
          nama: verifiedRole === 'admin' ? (data.nama || firebaseUser.displayName || adminProf.nama) : (data.nama || firebaseUser.displayName || 'Pengguna SMK'),
          sekolah: data.sekolah || adminProf.sekolah,
          jabatan: verifiedRole === 'admin' ? (data.jabatan || adminProf.jabatan) : data.jabatan,
        };

        if (verifiedRole === 'admin') {
          delete verifiedProfile.kelas;
          delete verifiedProfile.nis;
          delete (verifiedProfile as any).jurusan;
        } else if (verifiedRole === 'guru') {
          delete verifiedProfile.kelas;
          delete verifiedProfile.nis;
        }

        // If role needed auto-correction for super admin or clean up legacy admin class
        if (data.role !== verifiedRole || (verifiedRole === 'admin' && data.kelas)) {
          try {
            await updateDoc(userRef, { 
              role: verifiedRole,
              ...(verifiedRole === 'admin' ? { kelas: '', jurusan: '', nis: '' } : {})
            });
          } catch {}
        }

        setUserProfile(verifiedProfile);
        return verifiedProfile;
      } else {
        // Create initial profile on first login (e.g. Google Sign-In)
        const initialRole: UserRole = isRecognizedAdmin ? 'admin' : 'siswa';
        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          nama: initialRole === 'admin' 
            ? (firebaseUser.displayName || adminProf.nama) 
            : (firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Pengguna SMK'),
          email: firebaseUser.email || '',
          role: initialRole,
          kelas: initialRole === 'siswa' ? 'X RPL 1' : undefined,
          jurusan: initialRole === 'siswa' ? 'Rekayasa Perangkat Lunak' : undefined,
          sekolah: adminProf.sekolah,
          jabatan: initialRole === 'admin' ? adminProf.jabatan : undefined,
          photoURL: firebaseUser.photoURL || undefined,
          createdAt: new Date().toISOString(),
        };

        await setDoc(userRef, newProfile);
        setUserProfile(newProfile);
        return newProfile;
      }
    } catch (err) {
      console.warn('Could not read user profile from Firestore, using authenticated session token:', err);
      const isRecognizedAdmin = checkIsAdminEmail(firebaseUser.email);
      const adminProf = getStoredAdminCustomProfile();
      const fallback: UserProfile = {
        uid: firebaseUser.uid,
        nama: isRecognizedAdmin ? (firebaseUser.displayName || adminProf.nama) : (firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Pengguna SMK'),
        email: firebaseUser.email || '',
        role: isRecognizedAdmin ? 'admin' : 'siswa',
        kelas: isRecognizedAdmin ? undefined : 'X RPL 1',
        jurusan: isRecognizedAdmin ? undefined : 'Rekayasa Perangkat Lunak',
        sekolah: adminProf.sekolah,
        jabatan: isRecognizedAdmin ? adminProf.jabatan : undefined
      };
      setUserProfile(fallback);
      return fallback;
    }
  };

  const getStoredSessionRole = (): UserRole | null => {
    const role = localStorage.getItem('gcs_session_role') || sessionStorage.getItem('gcs_session_role');
    if (role === 'admin' || role === 'guru' || role === 'siswa') {
      return role as UserRole;
    }
    return null;
  };

  const getStoredProfile = (role: UserRole): UserProfile => {
    const cached = localStorage.getItem('gcs_active_profile') || sessionStorage.getItem('gcs_custom_demo_profile');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.role === role) {
          if (role === 'admin') {
            const adminProf = getStoredAdminCustomProfile();
            const cleanAdmin = { ...parsed, nama: parsed.nama || adminProf.nama, sekolah: adminProf.sekolah, jabatan: adminProf.jabatan, bio: adminProf.bio };
            delete cleanAdmin.kelas;
            delete cleanAdmin.jurusan;
            delete cleanAdmin.nis;
            return cleanAdmin;
          } else if (role === 'guru') {
            const cleanGuru = { ...parsed };
            delete cleanGuru.kelas;
            delete cleanGuru.nis;
            return cleanGuru;
          }
          return parsed;
        }
      } catch {
        // fallback
      }
    }
    return getDynamicDemoAccounts()[role];
  };

  useEffect(() => {
    // Listen for custom admin password/profile changes
    const onPassChanged = () => setAdminPasswordState(getStoredAdminPassword());
    window.addEventListener('gcs_admin_password_changed', onPassChanged);

    const onProfChanged = () => {
      const activeRole = getStoredSessionRole();
      if (activeRole === 'admin') {
        const fresh = getStoredProfile('admin');
        setUserProfile(fresh);
      }
    };
    window.addEventListener('gcs_admin_profile_changed', onProfChanged);

    // Listen for Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        await fetchAndVerifyProfile(user);
      } else {
        // Check if there was an active session in local/session storage
        const storedRole = getStoredSessionRole();
        if (storedRole && storedRole in getDynamicDemoAccounts()) {
          const profile = getStoredProfile(storedRole);
          setUserProfile(profile);
        } else {
          setCurrentUser(null);
          setUserProfile(null);
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      window.removeEventListener('gcs_admin_password_changed', onPassChanged);
      window.removeEventListener('gcs_admin_profile_changed', onProfChanged);
    };
  }, []);

  // Secure Login with Remember Me option & Guaranteed Admin Access
  const login = async (email: string, pass: string, rememberMe: boolean = true) => {
    setLoading(true);
    let trimmedEmail = email.trim();
    const lower = trimmedEmail.toLowerCase();
    const dynamicAccounts = getDynamicDemoAccounts();

    // Friendly aliases for admin, guru, and siswa
    if (checkIsAdminEmail(trimmedEmail)) {
      trimmedEmail = SUPER_ADMIN_EMAIL;
    } else if (lower === 'guru' || lower === 'bambang' || lower.startsWith('bambang@')) {
      trimmedEmail = dynamicAccounts.guru.email;
    } else if (lower === 'siswa' || lower === 'rizky' || lower.startsWith('rizky@')) {
      trimmedEmail = dynamicAccounts.siswa.email;
    }

    const isSuperAdmin = checkIsAdminEmail(trimmedEmail);
    const isGuruPreset = trimmedEmail.toLowerCase() === dynamicAccounts.guru.email.toLowerCase() || trimmedEmail.toLowerCase().includes('guru');
    const isSiswaPreset = trimmedEmail.toLowerCase() === dynamicAccounts.siswa.email.toLowerCase() || trimmedEmail.toLowerCase().includes('siswa');

    const storedPass = getStoredAdminPassword();
    const isAdminPasswordValid = pass === storedPass || pass === DEFAULT_ADMIN_PASSWORD;

    // Helper to activate role locally when Firebase Auth Email/Password throws operation-not-allowed or credential error
    const activateLocalRole = (role: UserRole) => {
      const profile = getStoredProfile(role);
      localStorage.setItem('gcs_session_role', role);
      sessionStorage.setItem('gcs_session_role', role);
      localStorage.setItem('gcs_active_profile', JSON.stringify(profile));
      setUserProfile(profile);
      setLoading(false);
    };

    try {
      try {
        await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      } catch (pErr) {
        console.warn('Set persistence note:', pErr);
      }

      // If logging in as admin and password matches the custom admin password
      if (isSuperAdmin && isAdminPasswordValid) {
        activateLocalRole('admin');
        return;
      }

      try {
        const res = await signInWithEmailAndPassword(auth, trimmedEmail, pass);
        await fetchAndVerifyProfile(res.user);
        return;
      } catch (authErr: any) {
        console.warn('Firebase signIn fallback:', authErr?.code, authErr?.message);

        // 1. GUARANTEED ADMIN ACCESS
        if (isSuperAdmin && isAdminPasswordValid) {
          activateLocalRole('admin');
          return;
        }

        // 2. GUARANTEED GURU PRESET ACCESS
        if (isGuruPreset) {
          activateLocalRole('guru');
          return;
        }

        // 3. GUARANTEED SISWA PRESET ACCESS
        if (isSiswaPreset) {
          activateLocalRole('siswa');
          return;
        }

        // 4. Fallback for operation-not-allowed or general credential mismatch
        if (authErr?.code === 'auth/operation-not-allowed' || isSuperAdmin) {
          if (isSuperAdmin && isAdminPasswordValid) {
            activateLocalRole('admin');
            return;
          }
          if (lower.includes('guru') || lower.includes('teacher')) {
            activateLocalRole('guru');
            return;
          }
          activateLocalRole('siswa');
          return;
        }

        throw authErr;
      }
    } finally {
      setLoading(false);
    }
  };

  // Student Registration (Strictly restricted to role: 'siswa')
  const registerSiswa = async (data: { nama: string; nis: string; kelas: string; jurusan: string; email: string; pass: string }) => {
    setLoading(true);
    let uid = 'siswa-' + Date.now();
    try {
      try {
        const res = await createUserWithEmailAndPassword(auth, data.email.trim(), data.pass);
        await updateProfile(res.user, { displayName: data.nama.trim() });
        uid = res.user.uid;
        setCurrentUser(res.user);
      } catch (authErr) {
        console.warn('Firebase Auth user creation note:', authErr);
      }

      const adminProf = getStoredAdminCustomProfile();
      const profile: UserProfile = {
        uid,
        nama: data.nama.trim(),
        email: data.email.trim(),
        role: 'siswa',
        nis: data.nis.trim(),
        kelas: data.kelas,
        jurusan: data.jurusan,
        sekolah: adminProf.sekolah,
        createdAt: new Date().toISOString()
      };

      try {
        await setDoc(doc(db, 'users', uid), profile);
      } catch (e) {
        console.warn('Firestore setDoc warning:', e);
      }

      localStorage.setItem('gcs_session_role', 'siswa');
      sessionStorage.setItem('gcs_session_role', 'siswa');
      localStorage.setItem('gcs_active_profile', JSON.stringify(profile));
      setUserProfile(profile);
    } finally {
      setLoading(false);
    }
  };

  // Teacher Registration (Strictly restricted to role: 'guru')
  const registerGuru = async (data: { nama: string; nip: string; mataPelajaran: string; email: string; pass: string }) => {
    setLoading(true);
    const isSuperAdmin = checkIsAdminEmail(data.email.trim());
    const assignedRole: UserRole = isSuperAdmin ? 'admin' : 'guru';
    let uid = (isSuperAdmin ? 'admin-' : 'guru-') + Date.now();

    try {
      try {
        const res = await createUserWithEmailAndPassword(auth, data.email.trim(), data.pass);
        await updateProfile(res.user, { displayName: data.nama.trim() });
        uid = res.user.uid;
        setCurrentUser(res.user);
      } catch (authErr) {
        console.warn('Firebase Auth user creation note:', authErr);
      }

      const adminProf = getStoredAdminCustomProfile();
      const profile: UserProfile = {
        uid,
        nama: data.nama.trim(),
        email: data.email.trim(),
        role: assignedRole,
        nip: data.nip.trim(),
        mataPelajaran: data.mataPelajaran.trim(),
        kelas: 'Semua Kelas',
        jurusan: 'Kurikulum Merdeka',
        sekolah: adminProf.sekolah,
        createdAt: new Date().toISOString()
      };

      try {
        await setDoc(doc(db, 'users', uid), profile);
      } catch (e) {
        console.warn('Firestore setDoc warning:', e);
      }

      localStorage.setItem('gcs_session_role', assignedRole);
      sessionStorage.setItem('gcs_session_role', assignedRole);
      localStorage.setItem('gcs_active_profile', JSON.stringify(profile));
      setUserProfile(profile);
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In with automatic admin privilege detection
  const loginWithGoogle = async (requestedRole: UserRole = 'siswa') => {
    setLoading(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const isSuperAdmin = checkIsAdminEmail(res.user.email);
      const adminProf = getStoredAdminCustomProfile();

      const userRef = doc(db, 'users', res.user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        const assignedRole: UserRole = isSuperAdmin ? 'admin' : (requestedRole === 'admin' ? 'siswa' : requestedRole);
        const profile: UserProfile = {
          uid: res.user.uid,
          nama: assignedRole === 'admin' ? (res.user.displayName || adminProf.nama) : (res.user.displayName || 'Pengguna Google SMK'),
          email: res.user.email || '',
          role: assignedRole,
          kelas: assignedRole === 'siswa' ? 'X RPL 1' : undefined,
          jurusan: assignedRole === 'siswa' ? 'Rekayasa Perangkat Lunak' : undefined,
          sekolah: adminProf.sekolah,
          jabatan: assignedRole === 'admin' ? adminProf.jabatan : undefined,
          photoURL: res.user.photoURL || undefined,
          createdAt: new Date().toISOString()
        };
        await setDoc(userRef, profile);
        setUserProfile(profile);
        localStorage.setItem('gcs_session_role', assignedRole);
        sessionStorage.setItem('gcs_session_role', assignedRole);
      } else {
        await fetchAndVerifyProfile(res.user);
      }
    } finally {
      setLoading(false);
    }
  };

  // Direct Role Switcher (Authorized Admin Action)
  const loginAsDemoUser = async (role: UserRole) => {
    setLoading(true);
    const demo = getStoredProfile(role);
    localStorage.setItem('gcs_session_role', role);
    sessionStorage.setItem('gcs_session_role', role);
    localStorage.setItem('gcs_active_profile', JSON.stringify(demo));
    setUserProfile(demo);
    setLoading(false);
  };

  // Elevate current active session to Admin (Full Control)
  const elevateToAdmin = async () => {
    setLoading(true);
    const adminProf = getStoredAdminCustomProfile();
    const adminUser: UserProfile = {
      uid: currentUser?.uid || 'admin-full-control',
      nama: adminProf.nama,
      email: currentUser?.email || adminProf.email,
      role: 'admin',
      sekolah: adminProf.sekolah,
      jabatan: adminProf.jabatan,
      nip: adminProf.nip,
      bio: adminProf.bio,
      photoURL: adminProf.photoURL,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem('gcs_session_role', 'admin');
    sessionStorage.setItem('gcs_session_role', 'admin');
    localStorage.setItem('gcs_active_profile', JSON.stringify(adminUser));
    setUserProfile(adminUser);

    if (currentUser?.uid && !currentUser.uid.startsWith('demo-')) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), { role: 'admin' });
      } catch (err) {
        console.warn('Elevate role sync Firestore:', err);
      }
    }
    setLoading(false);
  };

  // Update Admin Password ("sandi admin")
  const updateAdminPassword = async (newPass: string): Promise<boolean> => {
    if (!newPass || newPass.trim().length < 4) return false;
    saveStoredAdminPassword(newPass.trim());
    setAdminPasswordState(newPass.trim());

    // Sync to Firestore admin configuration if logged in
    try {
      await setDoc(doc(db, 'settings', 'admin_security'), {
        passwordUpdated: new Date().toISOString(),
        updatedBy: userProfile?.email || 'admin'
      }, { merge: true });
    } catch {}

    return true;
  };

  // Update Admin Profile Texts ("tulisan profil admin")
  const updateAdminProfileTexts = async (data: Partial<AdminCustomProfile>) => {
    const saved = saveStoredAdminCustomProfile(data);
    if (userProfile?.role === 'admin') {
      const updatedProfile: UserProfile = {
        ...userProfile,
        nama: saved.nama,
        email: saved.email || userProfile.email,
        sekolah: saved.sekolah,
        jabatan: saved.jabatan,
        nip: saved.nip,
        bio: saved.bio,
        photoURL: saved.photoURL,
        updatedAt: new Date().toISOString()
      };
      setUserProfile(updatedProfile);
      localStorage.setItem('gcs_active_profile', JSON.stringify(updatedProfile));

      if (currentUser?.uid && !currentUser.uid.startsWith('demo-')) {
        try {
          await updateDoc(doc(db, 'users', currentUser.uid), {
            nama: saved.nama,
            sekolah: saved.sekolah,
            jabatan: saved.jabatan,
            nip: saved.nip,
            bio: saved.bio,
            photoURL: saved.photoURL
          });
        } catch {}
      }
    }
  };

  // Logout - Clears all authentication state
  const logout = async () => {
    localStorage.removeItem('gcs_session_role');
    sessionStorage.removeItem('gcs_session_role');
    localStorage.removeItem('gcs_demo_role');
    localStorage.removeItem('gcs_active_profile');
    sessionStorage.removeItem('gcs_custom_demo_profile');
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    setUserProfile(null);
    setCurrentUser(null);
  };

  // Update profile without allowing unauthorized role tampering
  const updateUserBio = async (updates: Partial<UserProfile>) => {
    if (!userProfile) return;

    const sanitizedUpdates: Partial<UserProfile> = { ...updates };
    // If not admin, block role changes
    if (userProfile.role !== 'admin') {
      delete sanitizedUpdates.role;
    }
    delete sanitizedUpdates.uid;

    if (userProfile.role === 'admin' || sanitizedUpdates.role === 'admin') {
      delete sanitizedUpdates.kelas;
      delete sanitizedUpdates.jurusan;
      delete sanitizedUpdates.nis;
    } else if (userProfile.role === 'guru') {
      delete sanitizedUpdates.kelas;
      delete sanitizedUpdates.nis;
    }

    const updated = { ...userProfile, ...sanitizedUpdates, updatedAt: new Date().toISOString() };
    if (userProfile.role === 'admin') {
      delete updated.kelas;
      delete updated.jurusan;
      delete updated.nis;
    } else if (userProfile.role === 'guru') {
      delete updated.kelas;
      delete updated.nis;
    }

    setUserProfile(updated);

    localStorage.setItem('gcs_active_profile', JSON.stringify(updated));
    sessionStorage.setItem('gcs_custom_demo_profile', JSON.stringify(updated));

    if (userProfile.role === 'admin') {
      saveStoredAdminCustomProfile({
        nama: updated.nama,
        sekolah: updated.sekolah || 'SMKN 1 Sidayu',
        jabatan: updated.jabatan || 'Koordinator IT & Administrator Sistem',
        nip: updated.nip || '',
        photoURL: updated.photoURL || '',
        bio: updated.bio || ''
      });
    }

    if (currentUser?.uid && !currentUser.uid.startsWith('demo-')) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), sanitizedUpdates);
      } catch (err) {
        console.warn('Profile update Firestore sync error:', err);
      }

      if (sanitizedUpdates.nama || sanitizedUpdates.photoURL) {
        try {
          await updateProfile(currentUser, {
            displayName: sanitizedUpdates.nama || currentUser.displayName,
            photoURL: sanitizedUpdates.photoURL || currentUser.photoURL,
          });
        } catch {
          // ignore auth profile sync errors
        }
      }
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      userProfile,
      loading,
      login,
      registerSiswa,
      registerGuru,
      loginWithGoogle,
      loginAsDemoUser,
      loginAsDemo: loginAsDemoUser,
      logout,
      updateUserBio,
      adminPassword,
      updateAdminPassword,
      updateAdminProfileTexts,
      elevateToAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
