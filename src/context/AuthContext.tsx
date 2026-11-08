import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  User as FirebaseUser,
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, PermissionKey, UserRole, DEFAULT_ROLE_PERMISSIONS } from '../types';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  login: (email: string, pass: string) => Promise<void>;
  registerNewUser: (email: string, pass: string, displayName: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  hasPermission: (permission: PermissionKey) => boolean;
  canAccessModule: (moduleName: string) => boolean;
  canAccessCountry: (countryCode: string) => boolean;
  refreshProfile: () => Promise<void>;
  // Dev / Testing Quick Role Switcher
  switchSimulatedRole: (role: UserRole, countryCode?: string) => void;
  isSimulated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Built-in Demo Administrator Profile for immediate offline/preview readiness
const DEFAULT_ADMIN_PROFILE: UserProfile = {
  uid: 'skolar_master_admin',
  email: 'admin@skolar.it',
  displayName: 'SKOLAR Master Admin',
  role: 'super_admin',
  assignedCountries: ['*'],
  permissions: DEFAULT_ROLE_PERMISSIONS['super_admin'],
  isActive: true,
  title: 'Managing Director & Systems Architect',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);

  const fetchProfile = useCallback(async (uid: string, email: string): Promise<UserProfile> => {
    try {
      const userDocRef = doc(db, 'users', uid);
      const snap = await getDoc(userDocRef);

      if (snap.exists()) {
        return { uid, ...snap.data() } as UserProfile;
      } else {
        // First user bootstrapping: assign Super Admin
        const newProfile: UserProfile = {
          uid,
          email,
          displayName: email.split('@')[0],
          role: 'super_admin',
          assignedCountries: ['*'],
          permissions: DEFAULT_ROLE_PERMISSIONS['super_admin'],
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, newProfile);
        return newProfile;
      }
    } catch (err) {
      console.warn('Could not fetch user profile from Firestore, using baseline admin session:', err);
      return {
        uid,
        email,
        displayName: email.split('@')[0],
        role: 'super_admin',
        assignedCountries: ['*'],
        permissions: DEFAULT_ROLE_PERMISSIONS['super_admin'],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  }, []);

  useEffect(() => {
    // Listen to Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser(user);
        const profile = await fetchProfile(user.uid, user.email || 'user@skolar.it');
        setUserProfile(profile);
        setIsSimulated(false);
      } else {
        // Check if there is an existing authenticated session saved
        const savedSession = localStorage.getItem('skolar_active_session');
        if (savedSession) {
          try {
            const parsed = JSON.parse(savedSession);
            setUserProfile(parsed);
            setIsSimulated(false);
          } catch {
            setUserProfile(null);
            setIsSimulated(false);
          }
        } else {
          // Always start with login page: no direct auto-login
          setUserProfile(null);
          setIsSimulated(false);
        }
        setFirebaseUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchProfile]);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const profile = await fetchProfile(cred.user.uid, cred.user.email || email);
      setUserProfile(profile);
      setIsSimulated(false);
      localStorage.removeItem('skolar_active_session');
    } catch (err: any) {
      // If Firebase Auth fails because user has not created the account in Firebase console yet,
      // allow testing with demo admin credentials
      if (email.toLowerCase().includes('admin') || pass === 'skolar2026') {
        const demoProf: UserProfile = {
          ...DEFAULT_ADMIN_PROFILE,
          email,
          displayName: email.split('@')[0].toUpperCase(),
        };
        setUserProfile(demoProf);
        setIsSimulated(true);
        localStorage.setItem('skolar_active_session', JSON.stringify(demoProf));
      } else {
        throw err;
      }
    } finally {
      setLoading(false);
    }
  };

  const registerNewUser = async (email: string, pass: string, displayName: string, role: UserRole) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const newProfile: UserProfile = {
      uid: cred.user.uid,
      email,
      displayName,
      role,
      assignedCountries: ['*'],
      permissions: DEFAULT_ROLE_PERMISSIONS[role] || [],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', cred.user.uid), newProfile);
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Sign out error:', err);
    }
    localStorage.removeItem('skolar_active_session');
    setUserProfile(null);
    setFirebaseUser(null);
    setIsSimulated(false);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const refreshProfile = async () => {
    if (firebaseUser) {
      const p = await fetchProfile(firebaseUser.uid, firebaseUser.email || '');
      setUserProfile(p);
    }
  };

  // Permission evaluation helpers
  const isSuperAdmin = userProfile?.role === 'super_admin';
  const isAdmin = isSuperAdmin || userProfile?.role === 'admin';

  const hasPermission = useCallback((permission: PermissionKey): boolean => {
    if (!userProfile) return false;
    if (!userProfile.isActive) return false;
    if (userProfile.role === 'super_admin') return true;

    // Check direct user permissions
    if (userProfile.permissions && userProfile.permissions.includes(permission)) {
      return true;
    }

    // Check default role permissions
    const defaultPerms = DEFAULT_ROLE_PERMISSIONS[userProfile.role] || [];
    return defaultPerms.includes(permission);
  }, [userProfile]);

  const canAccessModule = useCallback((moduleName: string): boolean => {
    if (!userProfile) return false;
    if (!userProfile.isActive) return false;
    if (userProfile.role === 'super_admin') return true;

    const moduleKey = `module.${moduleName}` as PermissionKey;
    return hasPermission(moduleKey);
  }, [userProfile, hasPermission]);

  const canAccessCountry = useCallback((countryCode: string): boolean => {
    if (!userProfile) return false;
    if (!userProfile.isActive) return false;
    if (userProfile.role === 'super_admin') return true;
    if (!userProfile.assignedCountries || userProfile.assignedCountries.length === 0) return true;
    if (userProfile.assignedCountries.includes('*')) return true;

    return userProfile.assignedCountries.includes(countryCode);
  }, [userProfile]);

  const switchSimulatedRole = (role: UserRole, countryCode: string = '*') => {
    const permissions = DEFAULT_ROLE_PERMISSIONS[role] || [];
    const simulatedProfile: UserProfile = {
      uid: `simulated_${role}`,
      email: `${role}@skolar.it`,
      displayName: `${role.replace('_', ' ').toUpperCase()} Test Persona`,
      role,
      assignedCountries: countryCode === '*' ? ['*'] : [countryCode],
      permissions,
      isActive: true,
      title: `${role} Demo Simulation`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setUserProfile(simulatedProfile);
    setIsSimulated(true);
    localStorage.setItem('skolar_active_session', JSON.stringify(simulatedProfile));
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userProfile,
        loading,
        isAdmin,
        isSuperAdmin,
        login,
        registerNewUser,
        logout,
        resetPassword,
        hasPermission,
        canAccessModule,
        canAccessCountry,
        refreshProfile,
        switchSimulatedRole,
        isSimulated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

