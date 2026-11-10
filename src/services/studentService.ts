import { 
  collection, 
  doc, 
  DocumentSnapshot
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Student, AcquisitionType } from "../types";
import { 
  cleanFirestoreData, 
  fetchCollectionSynced,
  getLocalCache,
  writeDocSynced,
  updateDocSynced,
  deleteDocSynced
} from "../lib/firestoreUtils";

const COLLECTION_NAME = "students";

export interface StudentFilterOptions {
  searchQuery?: string;
  country?: string;
  intakeYear?: string;
  acquisitionType?: AcquisitionType | 'ALL';
  partnerId?: string;
  assignedCounsellorId?: string;
  pageSize?: number;
  lastDoc?: DocumentSnapshot;
  forceRefresh?: boolean;
}

export async function getStudents(options: StudentFilterOptions = {}): Promise<{
  students: Student[];
  lastDoc?: DocumentSnapshot;
  totalCount: number;
}> {
  try {
    let allStudents = await fetchCollectionSynced<Student>(COLLECTION_NAME, {
      forceRemote: options.forceRefresh,
    });

    // Fast in-memory sort by createdAt DESC
    allStudents.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    // Apply country filter
    if (options.country && options.country !== 'ALL') {
      allStudents = allStudents.filter(s => s.countryOfInterest === options.country);
    }

    // Apply intakeYear filter
    if (options.intakeYear && options.intakeYear !== 'ALL') {
      allStudents = allStudents.filter(s => {
        const yr = s.intakeYear || (s.registrationDate ? new Date(s.registrationDate).getFullYear().toString() : '2025');
        return yr === options.intakeYear;
      });
    }

    // Apply acquisition type filter
    if (options.acquisitionType && options.acquisitionType !== 'ALL') {
      allStudents = allStudents.filter(s => s.acquisitionType === options.acquisitionType);
    }

    // Apply partner filter
    if (options.partnerId) {
      allStudents = allStudents.filter(s => s.partnerId === options.partnerId);
    }

    // Client-side text search (full name, email, phone, passport, school, year)
    if (options.searchQuery && options.searchQuery.trim() !== '') {
      const term = options.searchQuery.toLowerCase().trim();
      allStudents = allStudents.filter(s => 
        (s.fullName && s.fullName.toLowerCase().includes(term)) ||
        (s.email && s.email.toLowerCase().includes(term)) ||
        (s.phone && s.phone.toLowerCase().includes(term)) ||
        (s.passportNumber && s.passportNumber.toLowerCase().includes(term)) ||
        (s.schoolOrUniversity && s.schoolOrUniversity.toLowerCase().includes(term)) ||
        (s.intakeYear && s.intakeYear.toLowerCase().includes(term))
      );
    }

    const totalCount = allStudents.length;

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
  const all = await fetchCollectionSynced<Student>(COLLECTION_NAME);
  return all.find(s => s.id === id) || null;
}

export async function createStudent(studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student> {
  const colRef = collection(db, COLLECTION_NAME);
  const docRef = doc(colRef);
  const now = new Date().toISOString();

  const newStudent: Student = {
    ...studentData,
    intakeYear: studentData.intakeYear || new Date().getFullYear().toString(),
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  };

  const cleanedStudent = cleanFirestoreData(newStudent);
  return await writeDocSynced(COLLECTION_NAME, docRef.id, cleanedStudent);
}

export async function updateStudent(id: string, updates: Partial<Student>): Promise<void> {
  const now = new Date().toISOString();
  const cleanedUpdates = cleanFirestoreData({
    ...updates,
    updatedAt: now,
  });

  await updateDocSynced(COLLECTION_NAME, id, cleanedUpdates);
}

export async function deleteStudent(id: string): Promise<void> {
  await deleteDocSynced(COLLECTION_NAME, id);
}
