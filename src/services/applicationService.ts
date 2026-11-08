import { 
  collection, 
  getDocs, 
  doc
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Application, ApplicationStatus, ApplicationTimelineItem } from "../types";
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

const COLLECTION_NAME = "applications";

export interface ApplicationFilterOptions {
  studentId?: string;
  countryCode?: string;
  status?: string;
  assignedUserId?: string;
}

export async function getApplications(filters: ApplicationFilterOptions = {}): Promise<Application[]> {
  try {
    let allApps: Application[] = [];

    // 1. Try fast local store first (0ms latency)
    const cached = getLocalCache<Application>(COLLECTION_NAME);
    if (cached !== null) {
      allApps = [...cached];
    } else {
      try {
        const colRef = collection(db, COLLECTION_NAME);
        const snapshot = await withTimeout(getDocs(colRef), 1200);
        allApps = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Application));
        setLocalCache(COLLECTION_NAME, allApps);
      } catch (e) {
        console.debug("Firestore fetch applications fallback to local store:", e);
        allApps = [];
        setLocalCache(COLLECTION_NAME, allApps);
      }
    }

    // Fast in-memory sort
    allApps.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    if (filters.studentId) {
      allApps = allApps.filter(a => a.studentId === filters.studentId);
    }
    if (filters.countryCode && filters.countryCode !== 'ALL') {
      allApps = allApps.filter(a => a.countryCode === filters.countryCode);
    }
    if (filters.status && filters.status !== 'ALL') {
      allApps = allApps.filter(a => a.status === filters.status);
    }
    if (filters.assignedUserId) {
      allApps = allApps.filter(a => a.assignedUserId === filters.assignedUserId);
    }

    return allApps;
  } catch (error) {
    console.error("Error in getApplications:", error);
    const cached = getLocalCache<Application>(COLLECTION_NAME) || [];
    return cached;
  }
}

export async function getApplicationById(id: string): Promise<Application | null> {
  const cached = getLocalCache<Application>(COLLECTION_NAME);
  if (cached) {
    const found = cached.find(a => a.id === id);
    if (found) return found;
  }
  return null;
}

export async function createApplication(
  appData: Omit<Application, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory'>,
  creatorUserId: string = 'system',
  creatorName: string = 'Staff'
): Promise<Application> {
  const colRef = collection(db, COLLECTION_NAME);
  const docRef = doc(colRef);
  const now = new Date().toISOString();

  const initialTimelineItem: ApplicationTimelineItem = {
    id: `hist_${Date.now()}`,
    status: appData.status || 'New Enquiry',
    changedAt: now,
    changedBy: creatorUserId,
    changedByName: creatorName,
    note: 'Application record created',
  };

  const newApp: Application = {
    ...appData,
    id: docRef.id,
    statusHistory: [initialTimelineItem],
    createdAt: now,
    updatedAt: now,
  };

  const cleanedApp = cleanFirestoreData(newApp);

  // 1. Optimistic local store update (< 1ms)
  addToLocalCache(COLLECTION_NAME, cleanedApp);

  // 2. Non-blocking cloud sync in background
  syncDocToFirestore(COLLECTION_NAME, docRef.id, cleanedApp);

  return cleanedApp;
}

export async function updateApplicationStatus(
  appId: string,
  newStatus: ApplicationStatus,
  user: { uid: string; displayName: string },
  note?: string
): Promise<void> {
  const current = await getApplicationById(appId);
  if (!current) throw new Error("Application record not found");

  const now = new Date().toISOString();
  const timelineItem: ApplicationTimelineItem = {
    id: `hist_${Date.now()}`,
    status: newStatus,
    changedAt: now,
    changedBy: user.uid,
    changedByName: user.displayName,
    note: note || `Status transitioned to ${newStatus}`,
  };

  const updatedHistory = [...(current.statusHistory || []), timelineItem];

  const updates = cleanFirestoreData({
    status: newStatus,
    statusHistory: updatedHistory,
    updatedAt: now,
  });

  // 1. Optimistic local store update
  updateInLocalCache(COLLECTION_NAME, appId, updates);

  // 2. Non-blocking cloud sync in background
  syncDocToFirestore(COLLECTION_NAME, appId, updates);
}

export async function updateApplication(id: string, updates: Partial<Application>): Promise<void> {
  const now = new Date().toISOString();
  const cleaned = cleanFirestoreData({
    ...updates,
    updatedAt: now,
  });

  updateInLocalCache(COLLECTION_NAME, id, cleaned);
  syncDocToFirestore(COLLECTION_NAME, id, cleaned);
}

export async function deleteApplication(id: string): Promise<void> {
  removeFromLocalCache(COLLECTION_NAME, id);
  syncDocDeleteFromFirestore(COLLECTION_NAME, id);
}
