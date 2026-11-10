import React, { useState, useEffect, useCallback } from 'react';
import { Student, Invoice, Payment, Expense, StudentFinancialSummary, Currency } from '../../types';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { ReceiptText, CreditCard, Coins, Edit3, Trash2, Printer } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PaymentFormModal } from '../finance/PaymentFormModal';
import { InvoiceFormModal } from '../finance/InvoiceFormModal';
import { InvoicePrintModal } from '../finance/InvoicePrintModal';
import { updatePayment, deletePayment, updateInvoice, deleteInvoice } from '../../services/financeService';

interface StudentFinanceTabProps {
  student: Student;
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  summary: StudentFinancialSummary;
  onOpenCreateInvoice: () => void;
  onOpenRecordPayment: () => void;
  onOpenRecordExpense: () => void;
  onRefresh?: () => void;
}

export const StudentFinanceTab: React.FC<StudentFinanceTabProps> = ({
  student,
  invoices,
  payments,
  expenses,
  summary,
  onOpenCreateInvoice,
  onOpenRecordPayment,
  onOpenRecordExpense,
  onRefresh = () => {},
}) => {
  const { hasPermission } = useAuth();
  const { success, error } = useToast();

  const canViewFinance = hasPermission('finance.view');
  const canCreateInvoice = hasPermission('finance.create_invoice');
  const canRecordPayment = hasPermission('finance.record_payment');
  const canRecordExpense = hasPermission('finance.record_expense');
  const canDeleteFinance = hasPermission('finance.delete');

  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);

  if (!canViewFinance) {
    return (
      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
        You do not have permission to view financial ledgers for this candidate.
      </div>
    );
  }

  const currencies: Currency[] = ['EUR', 'USD', 'INR'];
  const currencySymbols = { EUR: '€', USD: '$', INR: '₹' };

  const handleSavePaymentEdit = async (data: any, paymentId?: string) => {
    if (!paymentId) return;
    await updatePayment(paymentId, data);
    success('Payment Updated', `Updated ${data.currency} ${data.amount} record.`);
    onRefresh();
  };

  const handleDeletePayment = async (p: Payment) => {
    if (!window.confirm(`Delete payment of ${p.currency} ${p.amount}?`)) return;
    try {
      await deletePayment(p.id);
      success('Payment Deleted', 'Payment entry removed.');
      onRefresh();
    } catch (err: any) {
      error('Delete Failed', err.message);
    }
  };

  const handleSaveInvoiceEdit = async (data: any, invoiceId?: string) => {
    if (!invoiceId) return;
    await updateInvoice(invoiceId, data);
    success('Invoice Updated', `${data.invoiceNumber} updated.`);
    onRefresh();
  };

  const handleDeleteInvoice = async (inv: Invoice) => {
    if (!window.confirm(`Delete invoice ${inv.invoiceNumber}?`)) return;
    try {
      await deleteInvoice(inv.id);
      success('Invoice Deleted', `${inv.invoiceNumber} removed.`);
      onRefresh();
    } catch (err: any) {
      error('Delete Failed', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Student-wise Financial Summary Cards (Segregated by Currency) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {currencies.map((curr) => {
          const invoiced = summary.invoiced[curr] || 0;
          const paid = summary.paid[curr] || 0;
          const balance = summary.balance[curr] || 0;
          const exp = summary.expenses[curr] || 0;
          const sym = currencySymbols[curr];

          if (invoiced === 0 && paid === 0 && exp === 0) return null;

          return (
            <div key={curr} className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-soft">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-navy-950 uppercase tracking-wider">{curr} Balance</span>
                <Badge variant={balance > 0 ? 'yellow' : 'green'} size="sm">
                  {balance > 0 ? 'Balance Pending' : 'Settled'}
                </Badge>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Invoiced:</span>
                  <span className="font-bold text-navy-900">{sym}{invoiced.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Received:</span>
                  <span className="font-bold text-emerald-600">{sym}{paid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-1">
                  <span className="font-semibold text-slate-600">Remaining Due:</span>
                  <span className="font-extrabold text-amber-600">{sym}{balance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-1">
                  <span className="text-slate-400">Student Expenses:</span>
                  <span className="font-semibold text-rose-600">{sym}{exp.toLocaleString()}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
        <span className="text-xs font-bold text-navy-950">Financial Transactions</span>
        <div className="flex flex-wrap items-center gap-2">
          {canCreateInvoice && (
            <Button variant="secondary" size="sm" onClick={onOpenCreateInvoice} icon={<ReceiptText className="w-4 h-4" />}>
              Create Invoice
            </Button>
          )}
          {canRecordPayment && (
            <Button variant="gold" size="sm" onClick={onOpenRecordPayment} icon={<Coins className="w-4 h-4" />}>
              Record Payment
            </Button>
          )}
          {canRecordExpense && (
            <Button variant="outline" size="sm" onClick={onOpenRecordExpense} icon={<CreditCard className="w-4 h-4" />}>
              Record Expense
            </Button>
          )}
        </div>
      </div>

      {/* 2. Invoices List */}
      <div>
        <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider mb-2">Invoices Issued</h4>
        {invoices.length === 0 ? (
          <p className="text-xs text-slate-400 py-3">No invoices issued for this student yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 rounded-2xl bg-white border border-slate-200/80 overflow-hidden">
            {invoices.map((inv) => (
              <div key={inv.id} className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/50">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-navy-950">{inv.invoiceNumber}</span>
                    <Badge variant={inv.status === 'paid' ? 'green' : inv.status === 'partial' ? 'yellow' : 'navy'} size="sm">
                      {inv.status}
                    </Badge>
                    {(inv.discount || 0) > 0 && (
                      <Badge variant="gold" size="sm">
                        -{currencySymbols[inv.currency]}{inv.discount} off
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Date: {inv.invoiceDate} • Due: {inv.dueDate}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="font-extrabold text-navy-950 block">
                      {currencySymbols[inv.currency]}{inv.amount.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-emerald-600">
                      Paid: {currencySymbols[inv.currency]}{(inv.paidAmount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPrintingInvoice(inv)}
                      title="Print / View Official PDF"
                      className="p-1.5 text-slate-400 hover:text-navy-950 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    {canCreateInvoice && (
                      <button
                        onClick={() => setEditingInvoice(inv)}
                        title="Edit Invoice"
                        className="p-1.5 text-slate-400 hover:text-gold-600 hover:bg-gold-50 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                    {canDeleteFinance && (
                      <button
                        onClick={() => handleDeleteInvoice(inv)}
                        title="Delete Invoice"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Payments Received */}
      <div>
        <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider mb-2">Payments Received</h4>
        {payments.length === 0 ? (
          <p className="text-xs text-slate-400 py-3">No payments received yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 rounded-2xl bg-white border border-slate-200/80 overflow-hidden">
            {payments.map((p) => (
              <div key={p.id} className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/50">
                <div>
                  <span className="font-bold text-navy-950 block">
                    {p.paymentMethod} ({p.transactionReference || 'Direct'})
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {p.paymentDate} {p.invoiceNumber ? `• ${p.invoiceNumber}` : ''} {p.notes ? `• ${p.notes}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-emerald-600 text-sm">
                    +{currencySymbols[p.currency]}{p.amount.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-1">
                    {canRecordPayment && (
                      <button
                        onClick={() => setEditingPayment(p)}
                        title="Edit Payment"
                        className="p-1.5 text-slate-400 hover:text-gold-600 hover:bg-gold-50 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                    {canDeleteFinance && (
                      <button
                        onClick={() => handleDeletePayment(p)}
                        title="Delete Payment"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Student Associated Expenses */}
      <div>
        <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider mb-2">Associated Expenses & Disbursements</h4>
        {expenses.length === 0 ? (
          <p className="text-xs text-slate-400 py-3">No expenses recorded for this student.</p>
        ) : (
          <div className="divide-y divide-slate-100 rounded-2xl bg-white border border-slate-200/80 overflow-hidden">
            {expenses.map((exp) => (
              <div key={exp.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50/50">
                <div>
                  <span className="font-bold text-navy-950 block">{exp.title}</span>
                  <span className="text-[11px] text-slate-400">{exp.category} • {exp.date}</span>
                </div>
                <span className="font-bold text-rose-600">
                  -{currencySymbols[exp.currency]}{exp.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inline Modals for Editing Payments & Invoices directly inside Student Dossier */}
      <PaymentFormModal
        isOpen={!!editingPayment}
        onClose={() => setEditingPayment(null)}
        onSubmit={handleSavePaymentEdit}
        students={[student]}
        invoices={invoices}
        initialPayment={editingPayment}
      />

      <InvoiceFormModal
        isOpen={!!editingInvoice}
        onClose={() => setEditingInvoice(null)}
        onSubmit={handleSaveInvoiceEdit}
        students={[student]}
        initialInvoice={editingInvoice}
      />

      <InvoicePrintModal
        isOpen={!!printingInvoice}
        onClose={() => setPrintingInvoice(null)}
        invoice={printingInvoice}
        student={student}
        payments={payments}
      />
    </div>
  );
};
