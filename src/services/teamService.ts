import { 
  collection, 
  getDocs, 
  doc
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { UserProfile, CustomRole, UserRole, PermissionKey, DEFAULT_ROLE_PERMISSIONS } from "../types";
import { logActivity } from "./auditService";
import { 
  cleanFirestoreData, 
  getLocalCache, 
  setLocalCache, 
  addToLocalCache, 
  updateInLocalCache, 
  removeFromLocalCache,
  syncDocToFirestore,
  syncDocDeleteFromFirestore,
  withTimeout
} from "../lib/firestoreUtils";

const USERS_COLLECTION = "users";
const ROLES_COLLECTION = "roles";

export async function getTeamMembers(): Promise<UserProfile[]> {
  try {
    let allMembers: UserProfile[] = [];
    const cached = getLocalCache<UserProfile>(USERS_COLLECTION);
    if (cached !== null) {
      allMembers = [...cached];
    } else {
      try {
        const colRef = collection(db, USERS_COLLECTION);
        const snapshot = await withTimeout(getDocs(colRef), 1200);
        allMembers = snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
        setLocalCache(USERS_COLLECTION, allMembers);
      } catch (e) {
        console.debug("Firestore fetch team members fallback to local store:", e);
        allMembers = [];
        setLocalCache(USERS_COLLECTION, allMembers);
      }
    }

    allMembers.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return allMembers;
  } catch (error) {
    console.error("Error in getTeamMembers:", error);
    const cached = getLocalCache<UserProfile>(USERS_COLLECTION) || [];
    return cached;
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const cached = getLocalCache<UserProfile>(USERS_COLLECTION);
  if (cached) {
    const found = cached.find(u => u.uid === uid);
    if (found) return found;
  }
  return null;
}

export async function createOrUpdateUserProfile(
  profileData: Partial<UserProfile> & { uid: string; email: string },
  actor?: { uid: string; displayName: string; email: string }
): Promise<UserProfile> {
  const now = new Date().toISOString();
  let finalProfile: UserProfile;

  const currentCached = getLocalCache<UserProfile>(USERS_COLLECTION)?.find(u => u.uid === profileData.uid);

  if (currentCached) {
    finalProfile = {
      ...currentCached,
      ...profileData,
      updatedAt: now,
    };
  } else {
    const role: UserRole = profileData.role || 'counsellor';
    const initialPermissions = profileData.permissions || DEFAULT_ROLE_PERMISSIONS[role] || [];
    
    finalProfile = {
      uid: profileData.uid,
      email: profileData.email,
      displayName: profileData.displayName || profileData.email.split('@')[0],
      role,
      customRoleId: profileData.customRoleId,
      assignedCountries: profileData.assignedCountries || ['*'],
      permissions: initialPermissions,
      isActive: profileData.isActive !== undefined ? profileData.isActive : true,
      title: profileData.title || '',
      createdAt: now,
      updatedAt: now,
    };
  }

  const cleaned = cleanFirestoreData(finalProfile);

  // 1. Optimistic local store update (< 1ms)
  addToLocalCache(USERS_COLLECTION, cleaned);

  // 2. Non-blocking cloud sync in background
  syncDocToFirestore(USERS_COLLECTION, profileData.uid, cleaned);

  // 3. Log audit event
  if (actor) {
    logActivity(
      actor.uid,
      actor.displayName,
      actor.email,
      currentCached ? 'permission.change' : 'user.create',
      'team',
      profileData.uid,
      `Assigned role ${finalProfile.role} with ${finalProfile.permissions.length} permissions`
    ).catch(e => console.debug("Audit notice:", e));
  }

  return finalProfile;
}

export async function toggleUserActive(
  uid: string, 
  isActive: boolean,
  actor?: { uid: string; displayName: string; email: string }
): Promise<void> {
  const now = new Date().toISOString();
  updateInLocalCache(USERS_COLLECTION, uid, { isActive, updatedAt: now });
  syncDocToFirestore(USERS_COLLECTION, uid, { isActive, updatedAt: now });

  if (actor) {
    logActivity(
      actor.uid,
      actor.displayName,
      actor.email,
      'user.update',
      'team',
      uid,
      `User account ${isActive ? 'activated' : 'deactivated'}`
    ).catch(e => console.debug("Audit notice:", e));
  }
}

export async function deleteUserProfile(uid: string): Promise<void> {
  removeFromLocalCache(USERS_COLLECTION, uid);
  syncDocDeleteFromFirestore(USERS_COLLECTION, uid);
}

export async function getCustomRoles(): Promise<CustomRole[]> {
  try {
    let roles: CustomRole[] = [];
    const cached = getLocalCache<CustomRole>(ROLES_COLLECTION);
    if (cached !== null) {
      roles = [...cached];
    } else {
      try {
        const colRef = collection(db, ROLES_COLLECTION);
        const snapshot = await withTimeout(getDocs(colRef), 1200);
        roles = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CustomRole));
        setLocalCache(ROLES_COLLECTION, roles);
      } catch (e) {
        roles = [];
        setLocalCache(ROLES_COLLECTION, roles);
      }
    }
    return roles;
  } catch (error) {
    console.error("Error in getCustomRoles:", error);
    const cached = getLocalCache<CustomRole>(ROLES_COLLECTION) || [];
    return cached;
  }
}

export async function createCustomRole(roleData: Omit<CustomRole, 'id'>): Promise<CustomRole> {
  const colRef = collection(db, ROLES_COLLECTION);
  const docRef = doc(colRef);

  const newRole: CustomRole = {
    ...roleData,
    id: docRef.id,
  };

  const cleaned = cleanFirestoreData(newRole);

  addToLocalCache(ROLES_COLLECTION, cleaned);
  syncDocToFirestore(ROLES_COLLECTION, docRef.id, cleaned);

  return cleaned;
}
