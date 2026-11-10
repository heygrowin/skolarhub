import { 
  collection, 
  doc
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { DocumentRecord } from "../types";
import { deleteDocumentFile } from "../lib/storageService";
import { 
  cleanFirestoreData, 
  fetchCollectionSynced,
  getLocalCache,
  writeDocSynced,
  updateDocSynced,
  deleteDocSynced
} from "../lib/firestoreUtils";

const COLLECTION_NAME = "documents";

export interface DocumentFilterOptions {
  studentId?: string;
  applicationId?: string;
  countryCode?: string;
  intakeYear?: string;
  category?: string;
  reviewStatus?: string;
  forceRefresh?: boolean;
}

export async function getDocuments(filters: DocumentFilterOptions = {}): Promise<DocumentRecord[]> {
  try {
    let allDocs = await fetchCollectionSynced<DocumentRecord>(COLLECTION_NAME, {
      forceRemote: filters.forceRefresh,
    });

    allDocs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    if (filters.studentId) {
      allDocs = allDocs.filter(d => d.studentId === filters.studentId);
    }
    if (filters.countryCode && filters.countryCode !== 'ALL') {
      allDocs = allDocs.filter(d => d.countryCode === filters.countryCode);
    }
    if (filters.intakeYear && filters.intakeYear !== 'ALL') {
      allDocs = allDocs.filter(d => {
        const yr = d.intakeYear || (d.uploadDate ? new Date(d.uploadDate).getFullYear().toString() : '');
        return yr === filters.intakeYear;
      });
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
    return getLocalCache<DocumentRecord>(COLLECTION_NAME) || [];
  }
}

export async function createDocumentRecord(docData: Omit<DocumentRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<DocumentRecord> {
  const colRef = collection(db, COLLECTION_NAME);
  const docRef = doc(colRef);
  const now = new Date().toISOString();

  const newDoc: DocumentRecord = {
    ...docData,
    intakeYear: docData.intakeYear || new Date().getFullYear().toString(),
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  };

  const cleaned = cleanFirestoreData(newDoc);
  return await writeDocSynced(COLLECTION_NAME, docRef.id, cleaned);
}

export async function updateDocumentRecord(id: string, updates: Partial<DocumentRecord>): Promise<void> {
  const now = new Date().toISOString();
  const cleaned = cleanFirestoreData({
    ...updates,
    updatedAt: now,
  });

  await updateDocSynced(COLLECTION_NAME, id, cleaned);
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

export async function deleteDocumentRecord(id: string, storagePath?: string, fileUrl?: string): Promise<void> {
  const targetForDelete = fileUrl || storagePath;
  if (targetForDelete) {
    try {
      await deleteDocumentFile(targetForDelete);
    } catch (e) {
      console.warn("Storage deletion notice:", e);
    }
  }

  await deleteDocSynced(COLLECTION_NAME, id);
}
