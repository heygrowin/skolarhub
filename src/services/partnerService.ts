import { 
  collection, 
  getDocs, 
  doc
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Partner, Student, Application, Expense, Invoice, PartnerMetrics } from "../types";
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
import { getStudents } from "./studentService";
import { getApplications } from "./applicationService";
import { getInvoices, getExpenses } from "./financeService";

export type { PartnerMetrics };

const COLLECTION_NAME = "partners";

export async function getPartners(): Promise<Partner[]> {
  try {
    let allPartners: Partner[] = [];
    const cached = getLocalCache<Partner>(COLLECTION_NAME);
    if (cached !== null) {
      allPartners = [...cached];
    } else {
      try {
        const colRef = collection(db, COLLECTION_NAME);
        const snapshot = await withTimeout(getDocs(colRef), 1200);
        allPartners = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Partner));
        setLocalCache(COLLECTION_NAME, allPartners);
      } catch (e) {
        console.debug("Firestore fetch partners fallback to local store:", e);
        allPartners = [];
        setLocalCache(COLLECTION_NAME, allPartners);
      }
    }

    allPartners.sort((a, b) => a.name.localeCompare(b.name));
    return allPartners;
  } catch (error) {
    console.error("Error in getPartners:", error);
    const cached = getLocalCache<Partner>(COLLECTION_NAME) || [];
    return cached;
  }
}

export async function getPartnerById(id: string): Promise<Partner | null> {
  const cached = getLocalCache<Partner>(COLLECTION_NAME);
  if (cached) {
    const found = cached.find(p => p.id === id);
    if (found) return found;
  }
  return null;
}

export async function createPartner(partnerData: Omit<Partner, 'id' | 'createdAt' | 'updatedAt'>): Promise<Partner> {
  const colRef = collection(db, COLLECTION_NAME);
  const docRef = doc(colRef);
  const now = new Date().toISOString();

  const newPartner: Partner = {
    ...partnerData,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  };

  const cleaned = cleanFirestoreData(newPartner);

  // 1. Optimistic local store update (< 1ms)
  addToLocalCache(COLLECTION_NAME, cleaned);

  // 2. Non-blocking cloud sync in background
  syncDocToFirestore(COLLECTION_NAME, docRef.id, cleaned);

  return cleaned;
}

export async function updatePartner(id: string, updates: Partial<Partner>): Promise<void> {
  const now = new Date().toISOString();
  const cleaned = cleanFirestoreData({
    ...updates,
    updatedAt: now,
  });

  updateInLocalCache(COLLECTION_NAME, id, cleaned);
  syncDocToFirestore(COLLECTION_NAME, id, cleaned);
}

export async function deletePartner(id: string): Promise<void> {
  removeFromLocalCache(COLLECTION_NAME, id);
  syncDocDeleteFromFirestore(COLLECTION_NAME, id);
}

export async function calculatePartnerMetrics(partnerId: string, partnerObj?: Partner): Promise<PartnerMetrics> {
  try {
    const [allStudentsRes, allApps, allInvoices, allExpenses] = await Promise.all([
      getStudents({ partnerId }),
      getApplications(),
      getInvoices(),
      getExpenses(),
    ]);

    const referredStudents = allStudentsRes.students;
    const studentIds = new Set(referredStudents.map(s => s.id));

    // Active applications
    const partnerApps = allApps.filter(a => studentIds.has(a.studentId));
    const activeApplications = partnerApps.filter(a => 
      !['Completed', 'Rejected', 'Withdrawn'].includes(a.status)
    ).length;

    // Converted
    const convertedStudents = partnerApps.filter(a => 
      ['Admission Received', 'Visa Process', 'Completed'].includes(a.status)
    ).length;

    // Associated revenue
    const partnerInvoices = allInvoices.filter(i => studentIds.has(i.studentId));
    const associatedRevenue: Record<string, number> = {};
    partnerInvoices.forEach(inv => {
      const curr = inv.currency;
      associatedRevenue[curr] = (associatedRevenue[curr] || 0) + (inv.paidAmount || 0);
    });

    // Commission calculations
    const partnerExpenses = allExpenses.filter(e => 
      e.partnerId === partnerId && e.category === 'Partner Commission'
    );

    const commissionPaid: Record<string, number> = {};
    partnerExpenses.forEach(exp => {
      commissionPaid[exp.currency] = (commissionPaid[exp.currency] || 0) + exp.amount;
    });

    // Partner info for commission calculation
    const partner = partnerObj || await getPartnerById(partnerId);
    const commissionOwed: Record<string, number> = {};

    if (partner) {
      if (partner.commissionType === 'fixed') {
        const totalEarned = convertedStudents * partner.commissionRate;
        const paid = commissionPaid[partner.currency] || 0;
        commissionOwed[partner.currency] = Math.max(0, totalEarned - paid);
      } else if (partner.commissionType === 'percentage') {
        Object.entries(associatedRevenue).forEach(([curr, rev]) => {
          const totalEarned = (rev * partner.commissionRate) / 100;
          const paid = commissionPaid[curr] || 0;
          commissionOwed[curr] = Math.max(0, totalEarned - paid);
        });
      }
    }

    return {
      totalReferredStudents: referredStudents.length,
      activeApplications,
      convertedStudents,
      associatedRevenue,
      commissionOwed,
      commissionPaid,
    };
  } catch (error) {
    console.error("Error calculating partner metrics:", error);
    return {
      totalReferredStudents: 0,
      activeApplications: 0,
      convertedStudents: 0,
      associatedRevenue: {},
      commissionOwed: {},
      commissionPaid: {},
    };
  }
}

export const getPartnerMetrics = calculatePartnerMetrics;

export async function getPartnerReferredStudents(partnerId: string): Promise<Student[]> {
  const res = await getStudents({ partnerId });
  return res.students;
}
