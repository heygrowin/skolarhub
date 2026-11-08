import { 
  collection, 
  getDocs, 
  doc, 
  DocumentSnapshot
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Student, AcquisitionType } from "../types";
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

const COLLECTION_NAME = "students";

export interface StudentFilterOptions {
  searchQuery?: string;
  country?: string;
  acquisitionType?: AcquisitionType | 'ALL';
  partnerId?: string;
  assignedCounsellorId?: string;
  pageSize?: number;
  lastDoc?: DocumentSnapshot;
}

export async function getStudents(options: StudentFilterOptions = {}): Promise<{
  students: Student[];
  lastDoc?: DocumentSnapshot;
  totalCount: number;
}> {
  try {
    let allStudents: Student[] = [];

    // 1. Try fast local store first (0ms latency)
    const cached = getLocalCache<Student>(COLLECTION_NAME);
    if (cached !== null) {
      allStudents = [...cached];
    } else {
      // 2. Fetch from Firestore with fast timeout (never block longer than 1200ms)
      try {
        const colRef = collection(db, COLLECTION_NAME);
        const snapshot = await withTimeout(getDocs(colRef), 1200);
        allStudents = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Student));
        setLocalCache(COLLECTION_NAME, allStudents);
      } catch (e) {
        console.debug("Firestore fetch students fallback to local store:", e);
        allStudents = [];
        setLocalCache(COLLECTION_NAME, allStudents);
      }
    }

    // Fast in-memory sort by createdAt DESC
    allStudents.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    // Apply country filter
    if (options.country && options.country !== 'ALL') {
      allStudents = allStudents.filter(s => s.countryOfInterest === options.country);
    }

    // Apply acquisition type filter
    if (options.acquisitionType && options.acquisitionType !== 'ALL') {
      allStudents = allStudents.filter(s => s.acquisitionType === options.acquisitionType);
    }

    // Apply partner filter
    if (options.partnerId) {
      allStudents = allStudents.filter(s => s.partnerId === options.partnerId);
    }

    // Client-side text search (full name, email, phone, passport, school)
    if (options.searchQuery && options.searchQuery.trim() !== '') {
      const term = options.searchQuery.toLowerCase().trim();
      allStudents = allStudents.filter(s => 
        (s.fullName && s.fullName.toLowerCase().includes(term)) ||
        (s.email && s.email.toLowerCase().includes(term)) ||
        (s.phone && s.phone.toLowerCase().includes(term)) ||
        (s.passportNumber && s.passportNumber.toLowerCase().includes(term)) ||
        (s.schoolOrUniversity && s.schoolOrUniversity.toLowerCase().includes(term))
      );
    }

    const totalCount = allStudents.length;

    // Optional pagination slicing
    if (options.pageSize) {
      allStudents = allStudents.slice(0, options.pageSize);
    }

    return {
      students: allStudents,
      totalCount,
    };
  } catch (error) {
    console.error("Error in getStudents:", error);
    const cached = getLocalCache<Student>(COLLECTION_NAME) || [];
    return { students: cached, totalCount: cached.length };
  }
}

export async function getStudentById(id: string): Promise<Student | null> {
  const cached = getLocalCache<Student>(COLLECTION_NAME);
  if (cached) {
    const found = cached.find(s => s.id === id);
    if (found) return found;
  }
  return null;
}

export async function createStudent(studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student> {
  const colRef = collection(db, COLLECTION_NAME);
  const docRef = doc(colRef);
  const now = new Date().toISOString();

  const newStudent: Student = {
    ...studentData,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  };

  // Clean undefined values to prevent Firestore crashes
  const cleanedStudent = cleanFirestoreData(newStudent);

  // 1. Optimistically update local store immediately (< 1ms)
  addToLocalCache(COLLECTION_NAME, cleanedStudent);

  // 2. Non-blocking cloud sync in background
  syncDocToFirestore(COLLECTION_NAME, docRef.id, cleanedStudent);

  return cleanedStudent;
}

export async function updateStudent(id: string, updates: Partial<Student>): Promise<void> {
  const now = new Date().toISOString();
  const cleanedUpdates = cleanFirestoreData({
    ...updates,
    updatedAt: now,
  });

  // 1. Optimistically update local store immediately
  updateInLocalCache(COLLECTION_NAME, id, cleanedUpdates);

  // 2. Non-blocking cloud sync in background
  syncDocToFirestore(COLLECTION_NAME, id, cleanedUpdates);
}

export async function deleteStudent(id: string): Promise<void> {
  // 1. Optimistically remove from local store immediately
  removeFromLocalCache(COLLECTION_NAME, id);

  // 2. Non-blocking cloud delete in background
  syncDocDeleteFromFirestore(COLLECTION_NAME, id);
}
