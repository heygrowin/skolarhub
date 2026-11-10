import { 
  collection, 
  doc
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Application, ApplicationStatus, ApplicationTimelineItem } from "../types";
import { 
  cleanFirestoreData, 
  fetchCollectionSynced,
  getLocalCache,
  writeDocSynced,
  updateDocSynced,
  deleteDocSynced
} from "../lib/firestoreUtils";

const COLLECTION_NAME = "applications";

export interface ApplicationFilterOptions {
  studentId?: string;
  countryCode?: string;
  intakeYear?: string;
  status?: string;
  assignedUserId?: string;
  forceRefresh?: boolean;
}

export async function getApplications(filters: ApplicationFilterOptions = {}): Promise<Application[]> {
  try {
    let allApps = await fetchCollectionSynced<Application>(COLLECTION_NAME, {
      forceRemote: filters.forceRefresh,
    });

    allApps.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    if (filters.studentId) {
      allApps = allApps.filter(a => a.studentId === filters.studentId);
    }
    if (filters.countryCode && filters.countryCode !== 'ALL') {
      allApps = allApps.filter(a => a.countryCode === filters.countryCode);
    }
    if (filters.intakeYear && filters.intakeYear !== 'ALL') {
      allApps = allApps.filter(a => {
        const yr = a.intakeYear || (a.createdAt ? new Date(a.createdAt).getFullYear().toString() : '');
        return yr === filters.intakeYear;
      });
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
    return getLocalCache<Application>(COLLECTION_NAME) || [];
  }
}

export async function getApplicationById(id: string): Promise<Application | null> {
  const cached = getLocalCache<Application>(COLLECTION_NAME);
  if (cached) {
    const found = cached.find(a => a.id === id);
    if (found) return found;
  }
  const all = await fetchCollectionSynced<Application>(COLLECTION_NAME);
  return all.find(a => a.id === id) || null;
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
    intakeYear: appData.intakeYear || new Date().getFullYear().toString(),
    id: docRef.id,
    statusHistory: [initialTimelineItem],
    createdAt: now,
    updatedAt: now,
  };

  const cleanedApp = cleanFirestoreData(newApp);
  return await writeDocSynced(COLLECTION_NAME, docRef.id, cleanedApp);
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

  await updateDocSynced(COLLECTION_NAME, appId, updates);
}

export async function updateApplication(id: string, updates: Partial<Application>): Promise<void> {
  const now = new Date().toISOString();
  const cleaned = cleanFirestoreData({
    ...updates,
    updatedAt: now,
  });

  await updateDocSynced(COLLECTION_NAME, id, cleaned);
}

export async function deleteApplication(id: string): Promise<void> {
  await deleteDocSynced(COLLECTION_NAME, id);
}
