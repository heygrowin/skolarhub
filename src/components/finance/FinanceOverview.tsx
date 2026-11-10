import React, { useState, useEffect, useCallback } from 'react';
import { 
  Invoice, 
  Payment, 
  Expense, 
  Student, 
  Partner, 
  BusinessFinancialSummary, 
  Currency 
} from '../../types';
import { 
  getInvoices, 
  getPayments, 
  getExpenses, 
  calculateBusinessFinancialSummary, 
  createInvoice, 
  updateInvoice,
  recordPayment, 
  updatePayment,
  recordExpense, 
  deleteInvoice, 
  deletePayment, 
  deleteExpense 
} from '../../services/financeService';
import { getStudents } from '../../services/studentService';
import { getPartners } from '../../services/partnerService';
import { useAuth } from '../../context/AuthContext';
import { useYear } from '../../context/YearContext';
import { useCountry } from '../../context/CountryContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { TabNav, TabItem } from '../common/TabNav';
import { EmptyState } from '../common/EmptyState';
import { InvoiceFormModal } from './InvoiceFormModal';
import { PaymentFormModal } from './PaymentFormModal';
import { ExpenseFormModal } from './ExpenseFormModal';
import { InvoicePrintModal } from './InvoicePrintModal';
import { 
  Coins, 
  ReceiptText, 
  CreditCard, 
  Plus, 
  Printer, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Edit3
} from 'lucide-react';

interface FinanceOverviewProps {
  preselectedStudentId?: string;
  preselectedPartnerId?: string;
}

export const FinanceOverview: React.FC<FinanceOverviewProps> = ({
  preselectedStudentId,
  preselectedPartnerId,
}) => {
  const { hasPermission } = useAuth();
  const { selectedYearFilter } = useYear();
  const { selectedCountryFilter } = useCountry();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'invoices' | 'payments' | 'expenses'>('invoices');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [summary, setSummary] = useState<BusinessFinancialSummary>({
    totalInvoiced: {},
    totalCollected: {},
    totalOutstanding: {},
    totalExpenses: {},
    netProfit: {},
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [printInvoiceModalOpen, setPrintInvoiceModalOpen] = useState(false);
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<Invoice | null>(null);

  const canCreateInvoice = hasPermission('finance.create_invoice');
  const canRecordPayment = hasPermission('finance.record_payment');
  const canRecordExpense = hasPermission('finance.record_expense');
  const canDeleteFinance = hasPermission('finance.delete');

  const loadFinanceData = useCallback(async (forceRefresh: boolean = false) => {
    setLoading(true);
    try {
      const [invList, payList, expList, studentRes, partnerList] = await Promise.all([
        getInvoices(undefined, forceRefresh),
        getPayments(undefined, forceRefresh),
        getExpenses(undefined, undefined, forceRefresh),
        getStudents({ forceRefresh }),
        getPartners(forceRefresh),
      ]);

      const studentMap = new Map(studentRes.students.map(s => [s.id, s]));

      const matchesYear = (itemYr?: string, fallbackDate?: string, sId?: string) => {
        if (selectedYearFilter === 'ALL') return true;
        const st = sId ? studentMap.get(sId) : undefined;
        const resolved = itemYr || st?.intakeYear || (fallbackDate ? new Date(fallbackDate).getFullYear().toString() : '');
        return resolved === selectedYearFilter;
      };

      const matchesCountry = (cCode?: string, sId?: string) => {
        if (selectedCountryFilter === 'ALL') return true;
        const st = sId ? studentMap.get(sId) : undefined;
        const resolved = cCode || st?.countryOfInterest;
        return resolved === selectedCountryFilter;
      };

      const filteredInvoices = invList.filter(
        i => matchesYear(i.intakeYear, i.invoiceDate, i.studentId) && matchesCountry(i.countryCode, i.studentId)
      );
      const filteredPayments = payList.filter(
        p => matchesYear(p.intakeYear, p.paymentDate, p.studentId) && matchesCountry(undefined, p.studentId)
      );
      const filteredExpenses = expList.filter(
        e => matchesYear(e.intakeYear, e.date, e.studentId) && matchesCountry(e.countryCode, e.studentId)
      );

      setInvoices(filteredInvoices);
      setPayments(filteredPayments);
      setExpenses(filteredExpenses);
      setStudents(studentRes.students);
      setPartners(partnerList);
      setSummary(calculateBusinessFinancialSummary(filteredInvoices, filteredPayments, filteredExpenses));
    } catch (err: any) {
      error('Failed to load finance ledgers', err.message);
    } finally {
      setLoading(false);
    }
  }, [error, selectedYearFilter, selectedCountryFilter]);

  useEffect(() => {
    loadFinanceData(false);
  }, [loadFinanceData]);

  const handleSaveInvoice = async (data: any, invoiceId?: string) => {
    try {
      if (invoiceId) {
        await updateInvoice(invoiceId, data);
        success('Invoice Updated', `Invoice ${data.invoiceNumber} updated.`);
      } else {
        await createInvoice(data);
        success('Invoice Issued', `Invoice ${data.invoiceNumber} recorded.`);
      }
      loadFinanceData(false);
    } catch (err: any) {
      error('Failed to save invoice', err.message);
      throw err;
    }
  };

  const handleOpenEditInvoice = (inv: Invoice) => {
    setEditingInvoice(inv);
    setInvoiceModalOpen(true);
  };

  const handleSavePayment = async (data: any, paymentId?: string) => {
    try {
      if (paymentId) {
        await updatePayment(paymentId, data);
        success('Payment Updated', `Payment record ${data.transactionReference || ''} updated.`);
      } else {
        await recordPayment(data);
        success('Payment Recorded', `Payment of ${data.currency} ${data.amount} credited.`);
      }
      loadFinanceData();
    } catch (err: any) {
      error('Failed to save payment', err.message);
      throw err;
    }
  };

  const handleOpenEditPayment = (p: Payment) => {
    setEditingPayment(p);
    setPaymentModalOpen(true);
  };

  const handleRecordExpense = async (data: any) => {
    try {
      await recordExpense(data);
      success('Expense Logged', `Expense of ${data.currency} ${data.amount} recorded.`);
      loadFinanceData();
    } catch (err: any) {
      error('Failed to record expense', err.message);
      throw err;
    }
  };

  const handleDeleteInvoice = async (inv: Invoice) => {
    if (!window.confirm(`Delete invoice ${inv.invoiceNumber}?`)) return;
    try {
      await deleteInvoice(inv.id);
      success('Invoice Deleted', `${inv.invoiceNumber} removed.`);
      loadFinanceData();
    } catch (err: any) {
      error('Delete Failed', err.message);
    }
  };

  const handleDeletePayment = async (p: Payment) => {
    if (!window.confirm(`Delete payment of ${p.currency} ${p.amount}?`)) return;
    try {
      await deletePayment(p.id);
      success('Payment Deleted', 'Transaction removed.');
      loadFinanceData();
    } catch (err: any) {
      error('Delete Failed', err.message);
    }
  };

  const handleDeleteExpense = async (exp: Expense) => {
    if (!window.confirm(`Delete expense "${exp.title}"?`)) return;
    try {
      await deleteExpense(exp.id);
      success('Expense Deleted', 'Disbursement removed.');
      loadFinanceData();
    } catch (err: any) {
      error('Delete Failed', err.message);
    }
  };

  const tabs: TabItem[] = [
    { id: 'invoices', label: 'Candidate Invoices', icon: <ReceiptText className="w-4 h-4" />, count: invoices.length },
    { id: 'payments', label: 'Received Payments', icon: <Coins className="w-4 h-4" />, count: payments.length },
    { id: 'expenses', label: 'Disbursements & Expenses', icon: <CreditCard className="w-4 h-4" />, count: expenses.length },
  ];

  const currencySymbols = { EUR: '€', USD: '$', INR: '₹' };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy-950 tracking-tight">Multi-Currency Financial Ledger</h2>
          <p className="text-xs text-slate-500">
            Strictly segregated accounting for EUR, USD, and INR consultancy transactions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadFinanceData(true)}
            loading={loading}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>

          {canCreateInvoice && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingInvoice(null);
                setInvoiceModalOpen(true);
              }}
              icon={<ReceiptText className="w-4 h-4" />}
            >
              New Invoice
            </Button>
          )}

          {canRecordPayment && (
            <Button
              variant="gold"
              size="sm"
              onClick={() => setPaymentModalOpen(true)}
              icon={<Coins className="w-4 h-4" />}
            >
              Record Payment
            </Button>
          )}

          {canRecordExpense && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setExpenseModalOpen(true)}
              icon={<CreditCard className="w-4 h-4" />}
            >
              Log Expense
            </Button>
          )}
        </div>
      </div>

      {/* Multi-Currency Balances Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['EUR', 'USD', 'INR'] as Currency[]).map((curr) => {
          const sym = currencySymbols[curr];
          const invoiced = summary.totalInvoiced[curr] || 0;
          const collected = summary.totalCollected[curr] || 0;
          const outstanding = summary.totalOutstanding[curr] || 0;
          const exp = summary.totalExpenses[curr] || 0;
          const net = summary.netProfit[curr] || 0;

          return (
            <div key={curr} className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-soft">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-navy-950 uppercase tracking-wider flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${curr === 'EUR' ? 'bg-emerald-500' : curr === 'USD' ? 'bg-sky-500' : 'bg-amber-500'}`} />
                  {curr} Ledger Account
                </span>
                <Badge variant={net >= 0 ? 'green' : 'red'} size="sm">
                  {net >= 0 ? 'Positive Margin' : 'Deficit'}
                </Badge>
              </div>

              <div className="flex items-baseline justify-between mb-4">
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Net Operating Balance</span>
                  <span className="text-2xl font-extrabold text-navy-950">
                    {sym}{net.toLocaleString()}
                  </span>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                  {sym}{collected.toLocaleString()} in
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Invoiced</span>
                  <strong className="text-navy-900">{sym}{invoiced.toLocaleString()}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Disbursed</span>
                  <strong className="text-rose-600">{sym}{exp.toLocaleString()}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Receivable</span>
                  <strong className="text-amber-600">{sym}{outstanding.toLocaleString()}</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft p-5 space-y-4">
        <TabNav tabs={tabs} activeTab={activeTab} onChange={(id) => setActiveTab(id as any)} />

        {/* Tab 1: Invoices */}
        {activeTab === 'invoices' && (
          <div>
            {invoices.length === 0 ? (
              <EmptyState
                icon={<ReceiptText className="w-8 h-8" />}
                title="No Invoices Issued"
                description="Issue an invoice to a candidate for university guidance or processing fees."
                actionText={canCreateInvoice ? "Create Invoice" : undefined}
                onAction={() => setInvoiceModalOpen(true)}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Candidate</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Paid / Balance</th>
                      <th className="py-3 px-4">Issue Date</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.map((inv) => {
                      const sym = currencySymbols[inv.currency] || inv.currency;
                      const balance = Math.max(0, inv.amount - (inv.paidAmount || 0));

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-navy-950">
                            <span className="block">{inv.invoiceNumber}</span>
                            {inv.intakeYear && (
                              <span className="text-[10px] font-semibold text-gold-700 bg-gold-50 px-1.5 py-0.5 rounded border border-gold-200/60">
                                {inv.intakeYear}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-navy-900">{inv.studentName}</td>
                          <td className="py-3.5 px-4 font-extrabold text-navy-950">
                            <span className="block">{sym}{inv.amount.toLocaleString()}</span>
                            {(inv.discount || 0) > 0 && (
                              <span className="text-[10px] text-emerald-600 font-semibold">
                                Disc: -{sym}{inv.discount?.toLocaleString()}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-emerald-600 font-bold block">{sym}{(inv.paidAmount || 0).toLocaleString()}</span>
                            {balance > 0 && <span className="text-amber-600 text-[10px]">Due: {sym}{balance.toLocaleString()}</span>}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">{inv.invoiceDate}</td>
                          <td className="py-3.5 px-4 text-slate-500">{inv.dueDate}</td>
                          <td className="py-3.5 px-4">
                            <Badge
                              variant={inv.status === 'paid' ? 'green' : inv.status === 'partial' ? 'yellow' : 'navy'}
                              size="sm"
                            >
                              {inv.status}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setSelectedInvoiceForPrint(inv);
                                  setPrintInvoiceModalOpen(true);
                                }}
                                title="Print / PDF"
                                className="p-1.5 text-slate-400 hover:text-navy-950 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              {canCreateInvoice && (
                                <button
                                  onClick={() => handleOpenEditInvoice(inv)}
                                  title="Edit Invoice & Discount"
                                  className="p-1.5 text-slate-400 hover:text-gold-600 hover:bg-gold-50 rounded-lg transition-colors"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              )}
                              {canDeleteFinance && (
                                <button
                                  onClick={() => handleDeleteInvoice(inv)}
                                  title="Delete"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Payments */}
        {activeTab === 'payments' && (
          <div>
            {payments.length === 0 ? (
              <EmptyState
                icon={<Coins className="w-8 h-8" />}
                title="No Payments Recorded"
                description="Log student fee installments and bank remittances."
                actionText={canRecordPayment ? "Record Payment" : undefined}
                onAction={() => setPaymentModalOpen(true)}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Transaction ID</th>
                      <th className="py-3 px-4">Candidate</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Invoice Ref</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p) => {
                      const sym = currencySymbols[p.currency] || p.currency;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-xs font-bold text-navy-900">
                            {p.transactionReference || 'Direct Wire'}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-navy-950">{p.studentName}</td>
                          <td className="py-3.5 px-4 font-extrabold text-emerald-600 text-sm">
                            +{sym}{p.amount.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700">{p.paymentMethod}</td>
                          <td className="py-3.5 px-4 text-slate-500">{p.paymentDate}</td>
                          <td className="py-3.5 px-4 text-slate-400">
                            {p.invoiceNumber ? <Badge variant="navy" size="sm">{p.invoiceNumber}</Badge> : 'Unlinked'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenEditPayment(p)}
                                title="Edit Payment"
                                className="p-1.5 text-slate-400 hover:text-navy-950 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              {canDeleteFinance && (
                                <button
                                  onClick={() => handleDeletePayment(p)}
                                  title="Delete"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Expenses */}
        {activeTab === 'expenses' && (
          <div>
            {expenses.length === 0 ? (
              <EmptyState
                icon={<CreditCard className="w-8 h-8" />}
                title="No Expenses Logged"
                description="Record university admission fees, embassy legalizations or partner commission payouts."
                actionText={canRecordExpense ? "Log Expense" : undefined}
                onAction={() => setExpenseModalOpen(true)}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Title / Purpose</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Disbursed Amount</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Candidate / Partner</th>
                      <th className="py-3 px-4">Country</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expenses.map((exp) => {
                      const sym = currencySymbols[exp.currency] || exp.currency;

                      return (
                        <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-navy-950 block">{exp.title}</span>
                            {exp.description && <span className="text-[11px] text-slate-400 truncate max-w-xs block">{exp.description}</span>}
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge variant={exp.category === 'Partner Commission' ? 'gold' : 'slate'} size="sm">
                              {exp.category}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-rose-600 text-sm">
                            -{sym}{exp.amount.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">{exp.date}</td>
                          <td className="py-3.5 px-4 text-slate-700">
                            {exp.studentName ? `Candidate: ${exp.studentName}` : exp.partnerName ? `Partner: ${exp.partnerName}` : 'General Overhead'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 font-semibold">{exp.countryCode || '—'}</td>
                          <td className="py-3.5 px-4 text-right">
                            {canDeleteFinance && (
                              <button
                                onClick={() => handleDeleteExpense(exp)}
                                title="Delete"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invoice Creation / Editing Modal */}
      <InvoiceFormModal
        isOpen={invoiceModalOpen}
        onClose={() => {
          setInvoiceModalOpen(false);
          setEditingInvoice(null);
        }}
        onSubmit={handleSaveInvoice}
        students={students}
        preselectedStudentId={preselectedStudentId}
        initialInvoice={editingInvoice}
      />

      {/* Payment Recording / Editing Modal */}
      <PaymentFormModal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setEditingPayment(null);
        }}
        onSubmit={handleSavePayment}
        students={students}
        invoices={invoices}
        preselectedStudentId={preselectedStudentId}
        initialPayment={editingPayment}
      />

      {/* Expense Recording Modal */}
      <ExpenseFormModal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onSubmit={handleRecordExpense}
        students={students}
        partners={partners}
        preselectedStudentId={preselectedStudentId}
        preselectedPartnerId={preselectedPartnerId}
      />

      {/* Printable Invoice Modal */}
      <InvoicePrintModal
        isOpen={printInvoiceModalOpen}
        onClose={() => setPrintInvoiceModalOpen(false)}
        invoice={selectedInvoiceForPrint}
        student={students.find(s => s.id === selectedInvoiceForPrint?.studentId)}
        payments={payments}
      />
    </div>
  );
};

