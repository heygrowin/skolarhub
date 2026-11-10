import { 
  collection, 
  doc
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { UserProfile, CustomRole, UserRole, DEFAULT_ROLE_PERMISSIONS } from "../types";
import { logActivity } from "./auditService";
import { 
  cleanFirestoreData, 
  fetchCollectionSynced,
  getLocalCache,
  writeDocSynced,
  updateDocSynced,
  deleteDocSynced
} from "../lib/firestoreUtils";

const USERS_COLLECTION = "users";
const ROLES_COLLECTION = "roles";

export async function getTeamMembers(forceRefresh: boolean = false): Promise<UserProfile[]> {
  try {
    const allMembers = await fetchCollectionSynced<UserProfile>(USERS_COLLECTION, {
      forceRemote: forceRefresh,
      idField: 'uid',
    });

    allMembers.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return allMembers;
  } catch (error) {
    console.error("Error in getTeamMembers:", error);
    return getLocalCache<UserProfile>(USERS_COLLECTION) || [];
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const cached = getLocalCache<UserProfile>(USERS_COLLECTION);
  if (cached) {
    const found = cached.find(u => u.uid === uid);
    if (found) return found;
  }
  const all = await getTeamMembers();
  return all.find(u => u.uid === uid) || null;
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
  await writeDocSynced(USERS_COLLECTION, profileData.uid, cleaned);

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
  await updateDocSynced(USERS_COLLECTION, uid, { isActive, updatedAt: now });

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
  await deleteDocSynced(USERS_COLLECTION, uid);
}

export async function getCustomRoles(): Promise<CustomRole[]> {
  try {
    return await fetchCollectionSynced<CustomRole>(ROLES_COLLECTION);
  } catch (error) {
    console.error("Error in getCustomRoles:", error);
    return getLocalCache<CustomRole>(ROLES_COLLECTION) || [];
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
  return await writeDocSynced(ROLES_COLLECTION, docRef.id, cleaned);
}
