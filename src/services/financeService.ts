import { 
  collection, 
  doc
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Invoice, Payment, Expense, Currency, StudentFinancialSummary, BusinessFinancialSummary, InvoiceStatus } from "../types";
import { 
  cleanFirestoreData, 
  fetchCollectionSynced,
  getLocalCache,
  writeDocSynced,
  updateDocSynced,
  deleteDocSynced
} from "../lib/firestoreUtils";

export type { StudentFinancialSummary, BusinessFinancialSummary };

// ==========================================
// 1. INVOICES
// ==========================================
export async function getInvoices(studentId?: string, forceRefresh: boolean = false): Promise<Invoice[]> {
  try {
    let allInvoices = await fetchCollectionSynced<Invoice>("invoices", {
      forceRemote: forceRefresh,
    });

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
    intakeYear: invoiceData.intakeYear || new Date().getFullYear().toString(),
    id: docRef.id,
    paidAmount: 0,
    status: invoiceData.status || 'sent',
    createdAt: now,
    updatedAt: now,
  };

  const cleaned = cleanFirestoreData(newInvoice);
  return await writeDocSynced("invoices", docRef.id, cleaned);
}

export async function updateInvoice(id: string, updates: Partial<Invoice>): Promise<void> {
  const now = new Date().toISOString();
  const existing = (await getInvoices()).find(i => i.id === id);

  const mergedUpdates: Partial<Invoice> = {
    ...updates,
    updatedAt: now,
  };

  // Re-evaluate status if invoice total amount changed
  if (existing && updates.amount !== undefined) {
    const paid = updates.paidAmount ?? existing.paidAmount ?? 0;
    if (paid >= updates.amount) {
      mergedUpdates.status = 'paid';
    } else if (paid > 0) {
      mergedUpdates.status = 'partial';
    } else if (existing.status === 'paid' || existing.status === 'partial') {
      mergedUpdates.status = 'sent';
    }
  }

  const cleaned = cleanFirestoreData(mergedUpdates);
  await updateDocSynced("invoices", id, cleaned);
}

export async function deleteInvoice(id: string): Promise<void> {
  await deleteDocSynced("invoices", id);
}

/**
 * Recomputes an invoice's exact paidAmount & status from all currently stored payments linked to it.
 */
async function recalculateInvoiceFromPayments(invoiceId: string): Promise<void> {
  if (!invoiceId) return;
  try {
    const [allInvoices, allPayments] = await Promise.all([
      getInvoices(),
      getPayments(),
    ]);
    const targetInv = allInvoices.find(i => i.id === invoiceId);
    if (!targetInv) return;

    const totalPaid = allPayments
      .filter(p => p.invoiceId === invoiceId)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    let newStatus: InvoiceStatus = targetInv.status;
    if (totalPaid >= targetInv.amount) {
      newStatus = 'paid';
    } else if (totalPaid > 0) {
      newStatus = 'partial';
    } else if (targetInv.status === 'paid' || targetInv.status === 'partial') {
      newStatus = 'sent';
    }

    await updateDocSynced<Invoice>("invoices", invoiceId, {
      paidAmount: totalPaid,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("Failed to recalculate invoice balance:", e);
  }
}

// ==========================================
// 2. PAYMENTS
// ==========================================
export async function getPayments(studentId?: string, forceRefresh: boolean = false): Promise<Payment[]> {
  try {
    let allPayments = await fetchCollectionSynced<Payment>("payments", {
      forceRemote: forceRefresh,
    });

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
    intakeYear: paymentData.intakeYear || new Date().getFullYear().toString(),
    id: payDocRef.id,
    createdAt: now,
    updatedAt: now,
  };

  const cleanedPayment = cleanFirestoreData(newPayment);
  await writeDocSynced("payments", payDocRef.id, cleanedPayment);

  if (paymentData.invoiceId) {
    await recalculateInvoiceFromPayments(paymentData.invoiceId);
  }

  return cleanedPayment;
}

export async function updatePayment(id: string, updates: Partial<Payment>): Promise<void> {
  const now = new Date().toISOString();
  const existingPayments = await getPayments();
  const previousPayment = existingPayments.find(p => p.id === id);

  const cleanedUpdates = cleanFirestoreData({
    ...updates,
    updatedAt: now,
  });

  await updateDocSynced("payments", id, cleanedUpdates);

  // Recalculate both old invoice (if unlinked/changed) and new invoice
  const prevInvoiceId = previousPayment?.invoiceId;
  const nextInvoiceId = updates.invoiceId !== undefined ? updates.invoiceId : prevInvoiceId;

  if (prevInvoiceId) {
    await recalculateInvoiceFromPayments(prevInvoiceId);
  }
  if (nextInvoiceId && nextInvoiceId !== prevInvoiceId) {
    await recalculateInvoiceFromPayments(nextInvoiceId);
  }
}

export async function deletePayment(id: string): Promise<void> {
  const existingPayments = await getPayments();
  const target = existingPayments.find(p => p.id === id);

  await deleteDocSynced("payments", id);

  if (target?.invoiceId) {
    await recalculateInvoiceFromPayments(target.invoiceId);
  }
}

// ==========================================
// 3. EXPENSES
// ==========================================
export async function getExpenses(studentId?: string, countryCode?: string, forceRefresh: boolean = false): Promise<Expense[]> {
  try {
    let allExpenses = await fetchCollectionSynced<Expense>("expenses", {
      forceRemote: forceRefresh,
    });

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
    return getLocalCache<Expense>("expenses") || [];
  }
}

export async function recordExpense(expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<Expense> {
  const colRef = collection(db, "expenses");
  const docRef = doc(colRef);
  const now = new Date().toISOString();

  const newExpense: Expense = {
    ...expenseData,
    intakeYear: expenseData.intakeYear || new Date().getFullYear().toString(),
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  };

  const cleaned = cleanFirestoreData(newExpense);
  return await writeDocSynced("expenses", docRef.id, cleaned);
}

export async function updateExpense(id: string, updates: Partial<Expense>): Promise<void> {
  const now = new Date().toISOString();
  const cleaned = cleanFirestoreData({
    ...updates,
    updatedAt: now,
  });

  await updateDocSynced("expenses", id, cleaned);
}

export async function deleteExpense(id: string): Promise<void> {
  await deleteDocSynced("expenses", id);
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
