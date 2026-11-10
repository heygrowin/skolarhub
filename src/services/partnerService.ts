import { 
  collection, 
  doc
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Partner, Student, PartnerMetrics } from "../types";
import { 
  cleanFirestoreData, 
  fetchCollectionSynced,
  getLocalCache,
  writeDocSynced,
  updateDocSynced,
  deleteDocSynced
} from "../lib/firestoreUtils";
import { getStudents } from "./studentService";
import { getApplications } from "./applicationService";
import { getInvoices, getExpenses } from "./financeService";

export type { PartnerMetrics };

const COLLECTION_NAME = "partners";

export async function getPartners(forceRefresh: boolean = false): Promise<Partner[]> {
  try {
    const allPartners = await fetchCollectionSynced<Partner>(COLLECTION_NAME, { forceRemote: forceRefresh });
    allPartners.sort((a, b) => a.name.localeCompare(b.name));
    return allPartners;
  } catch (error) {
    console.error("Error in getPartners:", error);
    return getLocalCache<Partner>(COLLECTION_NAME) || [];
  }
}

export async function getPartnerById(id: string): Promise<Partner | null> {
  const cached = getLocalCache<Partner>(COLLECTION_NAME);
  if (cached) {
    const found = cached.find(p => p.id === id);
    if (found) return found;
  }
  const all = await fetchCollectionSynced<Partner>(COLLECTION_NAME);
  return all.find(p => p.id === id) || null;
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
  return await writeDocSynced(COLLECTION_NAME, docRef.id, cleaned);
}

export async function updatePartner(id: string, updates: Partial<Partner>): Promise<void> {
  const now = new Date().toISOString();
  const cleaned = cleanFirestoreData({
    ...updates,
    updatedAt: now,
  });

  await updateDocSynced(COLLECTION_NAME, id, cleaned);
}

export async function deletePartner(id: string): Promise<void> {
  await deleteDocSynced(COLLECTION_NAME, id);
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

    const partnerApps = allApps.filter(a => studentIds.has(a.studentId));
    const activeApplications = partnerApps.filter(a => 
      !['Completed', 'Rejected', 'Withdrawn'].includes(a.status)
    ).length;

    const convertedStudents = partnerApps.filter(a => 
      ['Admission Received', 'Visa Process', 'Completed'].includes(a.status)
    ).length;

    const partnerInvoices = allInvoices.filter(i => studentIds.has(i.studentId));
    const associatedRevenue: Record<string, number> = {};
    partnerInvoices.forEach(inv => {
      const curr = inv.currency;
      associatedRevenue[curr] = (associatedRevenue[curr] || 0) + (inv.paidAmount || 0);
    });

    const partnerExpenses = allExpenses.filter(e => 
      e.partnerId === partnerId && e.category === 'Partner Commission'
    );

    const commissionPaid: Record<string, number> = {};
    partnerExpenses.forEach(exp => {
      commissionPaid[exp.currency] = (commissionPaid[exp.currency] || 0) + exp.amount;
    });

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
