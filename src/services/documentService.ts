import { 
  collection, 
  getDocs, 
  doc
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { DocumentRecord } from "../types";
import { deleteDocumentFile } from "../lib/storageService";
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

const COLLECTION_NAME = "documents";

export interface DocumentFilterOptions {
  studentId?: string;
  applicationId?: string;
  countryCode?: string;
  category?: string;
  reviewStatus?: string;
}

export async function getDocuments(filters: DocumentFilterOptions = {}): Promise<DocumentRecord[]> {
  try {
    let allDocs: DocumentRecord[] = [];
    const cached = getLocalCache<DocumentRecord>(COLLECTION_NAME);
    if (cached !== null) {
      allDocs = [...cached];
    } else {
      try {
        const colRef = collection(db, COLLECTION_NAME);
        const snapshot = await withTimeout(getDocs(colRef), 1200);
        allDocs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DocumentRecord));
        setLocalCache(COLLECTION_NAME, allDocs);
      } catch (e) {
        console.debug("Firestore fetch documents fallback to local store:", e);
        allDocs = [];
        setLocalCache(COLLECTION_NAME, allDocs);
      }
    }

    allDocs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    if (filters.studentId) {
      allDocs = allDocs.filter(d => d.studentId === filters.studentId);
    }
    if (filters.countryCode && filters.countryCode !== 'ALL') {
      allDocs = allDocs.filter(d => d.countryCode === filters.countryCode);
    }
    if (filters.category && filters.category !== 'ALL') {
      allDocs = allDocs.filter(d => d.category === filters.category);
    }
    if (filters.reviewStatus && filters.reviewStatus !== 'ALL') {
      allDocs = allDocs.filter(d => d.reviewStatus === filters.reviewStatus);
    }

    return allDocs;
  } catch (error) {
    console.error("Error in getDocuments:", error);
    const cached = getLocalCache<DocumentRecord>(COLLECTION_NAME) || [];
    return cached;
  }
}

export async function createDocumentRecord(docData: Omit<DocumentRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<DocumentRecord> {
  const colRef = collection(db, COLLECTION_NAME);
  const docRef = doc(colRef);
  const now = new Date().toISOString();

  const newDoc: DocumentRecord = {
    ...docData,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  };

  const cleaned = cleanFirestoreData(newDoc);

  // 1. Optimistic local store update (< 1ms)
  addToLocalCache(COLLECTION_NAME, cleaned);

  // 2. Non-blocking cloud sync in background
  syncDocToFirestore(COLLECTION_NAME, docRef.id, cleaned);

  return cleaned;
}

export async function updateDocumentRecord(id: string, updates: Partial<DocumentRecord>): Promise<void> {
  const now = new Date().toISOString();
  const cleaned = cleanFirestoreData({
    ...updates,
    updatedAt: now,
  });

  updateInLocalCache(COLLECTION_NAME, id, cleaned);
  syncDocToFirestore(COLLECTION_NAME, id, cleaned);
}

export async function updateDocumentStatus(
  docId: string,
  status: DocumentRecord['reviewStatus'],
  rejectionReason?: string
): Promise<void> {
  const updates: Partial<DocumentRecord> = {
    reviewStatus: status,
    ...(rejectionReason !== undefined ? { rejectionReason } : {})
  };
  await updateDocumentRecord(docId, updates);
}

export async function deleteDocumentRecord(id: string, storagePath?: string): Promise<void> {
  // If a file path is present, attempt remote storage deletion
  if (storagePath) {
    try {
      await deleteDocumentFile(storagePath);
    } catch (e) {
      console.warn("Storage deletion notice:", e);
    }
  }

  removeFromLocalCache(COLLECTION_NAME, id);
  syncDocDeleteFromFirestore(COLLECTION_NAME, id);
}
