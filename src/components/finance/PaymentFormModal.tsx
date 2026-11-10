import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { CreatableSelect } from '../common/CreatableSelect';
import { Student, Invoice, Currency, Payment } from '../../types';
import { useYear } from '../../context/YearContext';
import { useToast } from '../../context/ToastContext';

interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (paymentData: any, paymentId?: string) => Promise<void>;
  students: Student[];
  invoices: Invoice[];
  preselectedStudentId?: string;
  initialPayment?: Payment | null;
}

const DEFAULT_PAYMENT_METHODS = [
  'UPI',
  'UPI - Google Pay',
  'UPI - PhonePe',
  'UPI - Paytm',
  'UPI - Office',
  'Bank Transfer',
  'Cash',
  'Credit Card',
  'SWIFT Wire',
  'Cheque / DD',
];

export const PaymentFormModal: React.FC<PaymentFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  students,
  invoices,
  preselectedStudentId,
  initialPayment,
}) => {
  const { years, selectedYearFilter } = useYear();
  const { error: toastError } = useToast();
  const [loading, setLoading] = useState(false);

  const [studentId, setStudentId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [intakeYear, setIntakeYear] = useState('2026');
  const [amount, setAmount] = useState<number>(500);
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>('UPI');
  const [transactionReference, setTransactionReference] = useState('');
  const [notes, setNotes] = useState('');

  const isEditMode = !!initialPayment;

  useEffect(() => {
    if (isOpen) {
      if (initialPayment) {
        setStudentId(initialPayment.studentId || '');
        setInvoiceId(initialPayment.invoiceId || '');
        setIntakeYear(
          initialPayment.intakeYear || (selectedYearFilter !== 'ALL' ? selectedYearFilter : String(new Date().getFullYear()))
        );
        setAmount(initialPayment.amount || 0);
        setCurrency(initialPayment.currency || 'EUR');
        setPaymentDate(initialPayment.paymentDate || new Date().toISOString().split('T')[0]);
        setPaymentMethod(initialPayment.paymentMethod || 'UPI');
        setTransactionReference(initialPayment.transactionReference || '');
        setNotes(initialPayment.notes || '');
      } else {
        const targetStudentId = preselectedStudentId || (students[0]?.id || '');
        const matched = students.find(s => s.id === targetStudentId);
        setStudentId(targetStudentId);
        setInvoiceId('');
        setIntakeYear(
          matched?.intakeYear || (selectedYearFilter !== 'ALL' ? selectedYearFilter : String(new Date().getFullYear()))
        );
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setAmount(500);
        setCurrency('EUR');
        setPaymentMethod('UPI');
        setTransactionReference('');
        setNotes('');
      }
    }
  }, [isOpen, initialPayment, preselectedStudentId, students, selectedYearFilter]);

  const handleStudentChange = (nextId: string) => {
    setStudentId(nextId);
    if (!isEditMode) setInvoiceId('');
    const matched = students.find(s => s.id === nextId);
    if (matched?.intakeYear) setIntakeYear(matched.intakeYear);
  };

  // Filter invoices for selected student
  const studentInvoices = invoices.filter(
    i => i.studentId === studentId && (i.status !== 'paid' || i.id === invoiceId)
  );

  // Auto-fill currency and amount when an invoice is selected in create mode
  useEffect(() => {
    if (!isEditMode && invoiceId) {
      const inv = invoices.find(i => i.id === invoiceId);
      if (inv) {
        setCurrency(inv.currency);
        if (inv.intakeYear) setIntakeYear(inv.intakeYear);
        const remaining = Math.max(0, inv.amount - (inv.paidAmount || 0));
        setAmount(remaining);
      }
    }
  }, [invoiceId, invoices, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || amount <= 0) {
      toastError('Validation', 'Please select a candidate and enter a valid amount.');
      return;
    }

    setLoading(true);
    try {
      const selectedStudent = students.find(s => s.id === studentId);
      const selectedInvoice = invoices.find(i => i.id === invoiceId);

      const payload: any = {
        studentId,
        studentName: selectedStudent?.fullName || initialPayment?.studentName || 'Student',
        intakeYear: intakeYear || String(new Date().getFullYear()),
        amount: Number(amount),
        currency,
        paymentDate,
        paymentMethod: paymentMethod || 'UPI',
        transactionReference: transactionReference.trim() || 'Direct Transfer',
        notes: notes.trim() || '',
      };

      if (invoiceId) {
        payload.invoiceId = invoiceId;
        payload.invoiceNumber = selectedInvoice?.invoiceNumber || initialPayment?.invoiceNumber || '';
      } else {
        payload.invoiceId = '';
        payload.invoiceNumber = '';
      }

      await onSubmit(payload, initialPayment?.id);
      onClose();
    } catch (err: any) {
      console.error("PaymentFormModal error:", err);
      toastError('Save Error', err?.message || 'Failed to save payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? "Edit Payment Record" : "Record Received Payment"}
      subtitle={
        isEditMode
          ? `Editing transaction ${initialPayment?.transactionReference || initialPayment?.id}`
          : "Log incoming tuition, processing or consultancy remittance"
      }
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="gold" onClick={handleSubmit} loading={loading}>
            {isEditMode ? "Save Changes" : `Confirm Payment (${currency} ${amount.toLocaleString()})`}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Select
              label="Candidate *"
              value={studentId}
              onChange={(e) => handleStudentChange(e.target.value)}
              required
              options={[
                { value: '', label: '-- Select Candidate --' },
                ...students.map(s => ({
                  value: s.id,
                  label: `${s.fullName} (${s.countryOfInterest}${s.intakeYear ? ` • ${s.intakeYear}` : ''})`
                }))
              ]}
            />
          </div>

          <CreatableSelect
            label="Intake Year *"
            categoryKey="intake_years"
            value={intakeYear}
            onChange={(val) => setIntakeYear(val)}
            options={years}
            placeholder="Year..."
          />
        </div>

        {studentInvoices.length > 0 && (
          <Select
            label="Apply to Open Invoice (Optional)"
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)}
            options={[
              { value: '', label: '-- Unallocated / General Advance --' },
              ...studentInvoices.map(inv => ({
                value: inv.id,
                label: `${inv.invoiceNumber} (Total: ${inv.currency} ${inv.amount} • Due: ${inv.currency} ${Math.max(0, inv.amount - (inv.paidAmount || 0))})`
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CreatableSelect
            label="Payment Method *"
            categoryKey="payment_methods"
            value={paymentMethod}
            onChange={(val) => setPaymentMethod(val)}
            options={DEFAULT_PAYMENT_METHODS}
            placeholder="Select or type (e.g. UPI - Ansh)..."
            required
            helperText="Tap to pick or type new (e.g. UPI - Name)"
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
          label="Bank Transaction ID / UTR / Reference *"
          placeholder="e.g. UPI-43219847 or SWIFT-EUR-102"
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
            placeholder="Payer account holder name, UPI handle, installment note..."
            className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-navy-950 focus:border-navy-600 focus:outline-none"
          />
        </div>
      </form>
    </Modal>
  );
};
