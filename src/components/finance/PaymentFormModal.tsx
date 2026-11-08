import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Student, Invoice, Currency, PaymentMethod } from '../../types';
import { useToast } from '../../context/ToastContext';

interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (paymentData: any) => Promise<void>;
  students: Student[];
  invoices: Invoice[];
  preselectedStudentId?: string;
}

export const PaymentFormModal: React.FC<PaymentFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  students,
  invoices,
  preselectedStudentId,
}) => {
  const { error: toastError } = useToast();
  const [loading, setLoading] = useState(false);

  const [studentId, setStudentId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState<number>(500);
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer');
  const [transactionReference, setTransactionReference] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      const targetStudent = preselectedStudentId || (students[0]?.id || '');
      setStudentId(targetStudent);
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setAmount(500);
      setTransactionReference('');
      setNotes('');
    }
  }, [isOpen, preselectedStudentId, students]);

  // Filter invoices for selected student
  const studentInvoices = invoices.filter(i => i.studentId === studentId && i.status !== 'paid');

  // Auto-fill currency and amount when an invoice is selected
  useEffect(() => {
    if (invoiceId) {
      const inv = invoices.find(i => i.id === invoiceId);
      if (inv) {
        setCurrency(inv.currency);
        const remaining = Math.max(0, inv.amount - (inv.paidAmount || 0));
        setAmount(remaining);
      }
    }
  }, [invoiceId, invoices]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || amount <= 0) {
      toastError('Validation', 'Please select a candidate and valid amount.');
      return;
    }

    setLoading(true);
    try {
      const selectedStudent = students.find(s => s.id === studentId);
      const selectedInvoice = invoices.find(i => i.id === invoiceId);

      const payload: any = {
        studentId,
        studentName: selectedStudent?.fullName || 'Student',
        amount: Number(amount),
        currency,
        paymentDate,
        paymentMethod,
        transactionReference: transactionReference.trim() || 'Direct Wire',
        notes: notes.trim() || '',
      };

      if (invoiceId) {
        payload.invoiceId = invoiceId;
        payload.invoiceNumber = selectedInvoice?.invoiceNumber || '';
      }

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      console.error("PaymentFormModal error:", err);
      toastError('Save Error', err?.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Received Payment"
      subtitle="Log incoming tuition, processing or consultancy remittance"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="gold" onClick={handleSubmit} loading={loading}>
            Confirm Payment ({currency} {amount.toLocaleString()})
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Candidate *"
          value={studentId}
          onChange={(e) => {
            setStudentId(e.target.value);
            setInvoiceId('');
          }}
          required
          options={[
            { value: '', label: '-- Select Candidate --' },
            ...students.map(s => ({
              value: s.id,
              label: `${s.fullName} (${s.email})`
            }))
          ]}
        />

        {studentInvoices.length > 0 && (
          <Select
            label="Apply to Open Invoice (Optional)"
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)}
            options={[
              { value: '', label: '-- Unallocated / General Advance --' },
              ...studentInvoices.map(inv => ({
                value: inv.id,
                label: `${inv.invoiceNumber} (Total: ${inv.currency} ${inv.amount} • Due: ${inv.currency} ${inv.amount - (inv.paidAmount || 0)})`
              }))
            ]}
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Amount Paid *"
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            required
          />

          <Select
            label="Currency *"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            options={[
              { value: 'EUR', label: 'EUR (€)' },
              { value: 'USD', label: 'USD ($)' },
              { value: 'INR', label: 'INR (₹)' },
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Payment Method *"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            options={[
              { value: 'Bank Transfer', label: 'Bank Transfer (SEPA / Wire)' },
              { value: 'Credit Card', label: 'Credit / Debit Card' },
              { value: 'UPI/Other', label: 'UPI / Online Portal' },
              { value: 'Cash', label: 'Cash Receipt' },
            ]}
          />

          <Input
            label="Date Received"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
          />
        </div>

        <Input
          label="Bank Transaction ID / Reference *"
          placeholder="e.g. SEPA-98214 or SWIFT-EUR-102"
          value={transactionReference}
          onChange={(e) => setTransactionReference(e.target.value)}
          required
        />

        <div>
          <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wider mb-1.5">
            Internal Accounting Notes
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Payer account holder name, bank branch, installment notes..."
            className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-navy-950 focus:border-navy-600 focus:outline-none"
          />
        </div>
      </form>
    </Modal>
  );
};

