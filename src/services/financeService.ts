import { 
  collection, 
  getDocs, 
  doc
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Invoice, Payment, Expense, Currency, StudentFinancialSummary, BusinessFinancialSummary } from "../types";
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

export type { StudentFinancialSummary, BusinessFinancialSummary };

// ==========================================
// 1. INVOICES
// ==========================================
export async function getInvoices(studentId?: string): Promise<Invoice[]> {
  try {
    let allInvoices: Invoice[] = [];
    const cached = getLocalCache<Invoice>("invoices");
    if (cached !== null) {
      allInvoices = [...cached];
    } else {
      try {
        const colRef = collection(db, "invoices");
        const snapshot = await withTimeout(getDocs(colRef), 1200);
        allInvoices = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Invoice));
        setLocalCache("invoices", allInvoices);
      } catch (e) {
        console.debug("Firestore fetch invoices fallback to local store:", e);
        allInvoices = [];
        setLocalCache("invoices", allInvoices);
      }
    }

    allInvoices.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    if (studentId) {
      return allInvoices.filter(i => i.studentId === studentId);
    }
    return allInvoices;
  } catch (error) {
    console.error("Error in getInvoices:", error);
    const cached = getLocalCache<Invoice>("invoices") || [];
    return studentId ? cached.filter(i => i.studentId === studentId) : cached;
  }
}

export async function createInvoice(invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'paidAmount'>): Promise<Invoice> {
  const colRef = collection(db, "invoices");
  const docRef = doc(colRef);
  const now = new Date().toISOString();

  const newInvoice: Invoice = {
    ...invoiceData,
    id: docRef.id,
    paidAmount: 0,
    status: invoiceData.status || 'draft',
    createdAt: now,
    updatedAt: now,
  };

  const cleaned = cleanFirestoreData(newInvoice);

  // 1. Optimistic local store update (< 1ms)
  addToLocalCache("invoices", cleaned);

  // 2. Non-blocking cloud sync in background
  syncDocToFirestore("invoices", docRef.id, cleaned);

  return cleaned;
}

export async function updateInvoice(id: string, updates: Partial<Invoice>): Promise<void> {
  const now = new Date().toISOString();
  const cleaned = cleanFirestoreData({
    ...updates,
    updatedAt: now,
  });

  updateInLocalCache("invoices", id, cleaned);
  syncDocToFirestore("invoices", id, cleaned);
}

export async function deleteInvoice(id: string): Promise<void> {
  removeFromLocalCache("invoices", id);
  syncDocDeleteFromFirestore("invoices", id);
}

// ==========================================
// 2. PAYMENTS
// ==========================================
export async function getPayments(studentId?: string): Promise<Payment[]> {
  try {
    let allPayments: Payment[] = [];
    const cached = getLocalCache<Payment>("payments");
    if (cached !== null) {
      allPayments = [...cached];
    } else {
      try {
        const colRef = collection(db, "payments");
        const snapshot = await withTimeout(getDocs(colRef), 1200);
        allPayments = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
        setLocalCache("payments", allPayments);
      } catch (e) {
        console.debug("Firestore fetch payments fallback to local store:", e);
        allPayments = [];
        setLocalCache("payments", allPayments);
      }
    }

    allPayments.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    if (studentId) {
      return allPayments.filter(p => p.studentId === studentId);
    }
    return allPayments;
  } catch (error) {
    console.error("Error in getPayments:", error);
    const cached = getLocalCache<Payment>("payments") || [];
    return studentId ? cached.filter(p => p.studentId === studentId) : cached;
  }
}

export async function recordPayment(paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Payment> {
  const colRef = collection(db, "payments");
  const payDocRef = doc(colRef);
  const now = new Date().toISOString();

  const newPayment: Payment = {
    ...paymentData,
    id: payDocRef.id,
    createdAt: now,
    updatedAt: now,
  };

  const cleanedPayment = cleanFirestoreData(newPayment);

  // 1. Optimistic local store update for payment (< 1ms)
  addToLocalCache("payments", cleanedPayment);

  // 2. If connected to an invoice, update invoice paidAmount & status immediately in local store
  if (paymentData.invoiceId) {
    const cachedInvoices = getLocalCache<Invoice>("invoices") || [];
    const targetInv = cachedInvoices.find(i => i.id === paymentData.invoiceId);
    if (targetInv) {
      const newPaid = (targetInv.paidAmount || 0) + paymentData.amount;
      const newStatus = newPaid >= targetInv.amount ? 'paid' : 'partial';
      const updatedInv = { paidAmount: newPaid, status: newStatus as any, updatedAt: now };
      updateInLocalCache("invoices", targetInv.id, updatedInv);
      syncDocToFirestore("invoices", targetInv.id, { ...targetInv, ...updatedInv });
    }
  }

  // 3. Non-blocking cloud sync in background
  syncDocToFirestore("payments", payDocRef.id, cleanedPayment);

  return cleanedPayment;
}

export async function deletePayment(id: string): Promise<void> {
  removeFromLocalCache("payments", id);
  syncDocDeleteFromFirestore("payments", id);
}

// ==========================================
// 3. EXPENSES
// ==========================================
export async function getExpenses(studentId?: string, countryCode?: string): Promise<Expense[]> {
  try {
    let allExpenses: Expense[] = [];
    const cached = getLocalCache<Expense>("expenses");
    if (cached !== null) {
      allExpenses = [...cached];
    } else {
      try {
        const colRef = collection(db, "expenses");
        const snapshot = await withTimeout(getDocs(colRef), 1200);
        allExpenses = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Expense));
        setLocalCache("expenses", allExpenses);
      } catch (e) {
        console.debug("Firestore fetch expenses fallback to local store:", e);
        allExpenses = [];
        setLocalCache("expenses", allExpenses);
      }
    }

    allExpenses.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    if (studentId) {
      allExpenses = allExpenses.filter(e => e.studentId === studentId);
    }
    if (countryCode && countryCode !== 'ALL') {
      allExpenses = allExpenses.filter(e => e.countryCode === countryCode);
    }

    return allExpenses;
  } catch (error) {
    console.error("Error in getExpenses:", error);
    const cached = getLocalCache<Expense>("expenses") || [];
    return cached;
  }
}

export async function recordExpense(expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<Expense> {
  const colRef = collection(db, "expenses");
  const docRef = doc(colRef);
  const now = new Date().toISOString();

  const newExpense: Expense = {
    ...expenseData,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  };

  const cleaned = cleanFirestoreData(newExpense);

  // 1. Optimistic local store update (< 1ms)
  addToLocalCache("expenses", cleaned);

  // 2. Non-blocking cloud sync in background
  syncDocToFirestore("expenses", docRef.id, cleaned);

  return cleaned;
}

export async function updateExpense(id: string, updates: Partial<Expense>): Promise<void> {
  const now = new Date().toISOString();
  const cleaned = cleanFirestoreData({
    ...updates,
    updatedAt: now,
  });

  updateInLocalCache("expenses", id, cleaned);
  syncDocToFirestore("expenses", id, cleaned);
}

export async function deleteExpense(id: string): Promise<void> {
  removeFromLocalCache("expenses", id);
  syncDocDeleteFromFirestore("expenses", id);
}

// ==========================================
// 4. FINANCIAL CALCULATIONS & REPORTS
// ==========================================
export function calculateStudentFinancialSummary(
  invoices: Invoice[],
  payments: Payment[],
  expenses: Expense[]
): StudentFinancialSummary {
  const invoiced: { [c in Currency]?: number } = {};
  const paid: { [c in Currency]?: number } = {};
  const balance: { [c in Currency]?: number } = {};
  const expMap: { [c in Currency]?: number } = {};

  invoices.forEach(inv => {
    invoiced[inv.currency] = (invoiced[inv.currency] || 0) + inv.amount;
  });

  payments.forEach(p => {
    paid[p.currency] = (paid[p.currency] || 0) + p.amount;
  });

  const currencies = new Set<Currency>([
    ...Object.keys(invoiced) as Currency[],
    ...Object.keys(paid) as Currency[],
  ]);

  currencies.forEach(curr => {
    const inv = invoiced[curr] || 0;
    const pd = paid[curr] || 0;
    balance[curr] = Math.max(0, inv - pd);
  });

  expenses.forEach(e => {
    expMap[e.currency] = (expMap[e.currency] || 0) + e.amount;
  });

  return { invoiced, paid, balance, expenses: expMap };
}

export async function getStudentFinancialSummary(studentId: string): Promise<StudentFinancialSummary> {
  const [invoices, payments, expenses] = await Promise.all([
    getInvoices(studentId),
    getPayments(studentId),
    getExpenses(studentId),
  ]);
  return calculateStudentFinancialSummary(invoices, payments, expenses);
}

export async function getBusinessFinancialSummary(): Promise<BusinessFinancialSummary> {
  const [invoices, payments, expenses] = await Promise.all([
    getInvoices(),
    getPayments(),
    getExpenses(),
  ]);
  return calculateBusinessFinancialSummary(invoices, payments, expenses);
}

export function calculateBusinessFinancialSummary(
  invoices: Invoice[],
  payments: Payment[],
  expenses: Expense[]
): BusinessFinancialSummary {
  const totalInvoiced: Record<string, number> = {};
  const totalCollected: Record<string, number> = {};
  const totalOutstanding: Record<string, number> = {};
  const totalExpenses: Record<string, number> = {};
  const netProfit: Record<string, number> = {};

  invoices.forEach(inv => {
    const curr = inv.currency;
    totalInvoiced[curr] = (totalInvoiced[curr] || 0) + inv.amount;
  });

  payments.forEach(pay => {
    const curr = pay.currency;
    totalCollected[curr] = (totalCollected[curr] || 0) + pay.amount;
  });

  const revenueCurrencies = new Set([
    ...Object.keys(totalInvoiced),
    ...Object.keys(totalCollected),
  ]);

  revenueCurrencies.forEach(curr => {
    const inv = totalInvoiced[curr] || 0;
    const coll = totalCollected[curr] || 0;
    totalOutstanding[curr] = Math.max(0, inv - coll);
  });

  expenses.forEach(exp => {
    const curr = exp.currency;
    totalExpenses[curr] = (totalExpenses[curr] || 0) + exp.amount;
  });

  const profitCurrencies = new Set([
    ...Object.keys(totalCollected),
    ...Object.keys(totalExpenses),
  ]);

  profitCurrencies.forEach(curr => {
    const coll = totalCollected[curr] || 0;
    const exp = totalExpenses[curr] || 0;
    netProfit[curr] = coll - exp;
  });

  return {
    totalInvoiced,
    totalCollected,
    totalOutstanding,
    totalExpenses,
    netProfit,
  };
}
