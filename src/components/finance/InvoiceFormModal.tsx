import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { CreatableSelect } from '../common/CreatableSelect';
import { Student, Currency, InvoiceItem, InvoiceStatus, Invoice } from '../../types';
import { useYear } from '../../context/YearContext';
import { useToast } from '../../context/ToastContext';
import { Plus, Trash2, Tag } from 'lucide-react';

interface InvoiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (invoiceData: any, invoiceId?: string) => Promise<void>;
  students: Student[];
  preselectedStudentId?: string;
  initialInvoice?: Invoice | null;
}

const DEFAULT_LINE_ITEMS = [
  'Comprehensive Admission Guidance & Dossier Review',
  'Universitaly Pre-Enrolment & DOV/CIMEA Advisory',
  'University Application Filing & Portfolio Review',
  'Visa Processing, Embassy Filing & Translation Package',
  'MBBS MNUMS Registration & Immigration Package',
  'Post-Arrival Permesso di Soggiorno & Housing Support',
];

const DEFAULT_DISCOUNT_REASONS = [
  'Early Bird Scholarship',
  'Merit Concession',
  'Partner Referral Discount',
  'Sibling / Alumni Waiver',
  'Full Upfront Settlement Discount',
];

export const InvoiceFormModal: React.FC<InvoiceFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  students,
  preselectedStudentId,
  initialInvoice,
}) => {
  const { years, selectedYearFilter } = useYear();
  const { error: toastError } = useToast();
  const [loading, setLoading] = useState(false);

  const [studentId, setStudentId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [intakeYear, setIntakeYear] = useState('2026');
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<InvoiceStatus>('sent');
  const [notes, setNotes] = useState('');

  // Discount & Tax configuration
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'flat' | 'percentage'>('flat');
  const [discountReason, setDiscountReason] = useState<string>('');
  const [taxRate, setTaxRate] = useState<number>(0);

  // Invoice Line Items
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: 'Comprehensive Admission Guidance & Dossier Review', quantity: 1, unitPrice: 1000, total: 1000 },
  ]);

  const isEditMode = !!initialInvoice;

  useEffect(() => {
    if (isOpen) {
      if (initialInvoice) {
        setStudentId(initialInvoice.studentId || '');
        setInvoiceNumber(initialInvoice.invoiceNumber || '');
        setIntakeYear(
          initialInvoice.intakeYear || (selectedYearFilter !== 'ALL' ? selectedYearFilter : String(new Date().getFullYear()))
        );
        setCurrency(initialInvoice.currency || 'EUR');
        setInvoiceDate(initialInvoice.invoiceDate || new Date().toISOString().split('T')[0]);
        setDueDate(initialInvoice.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
        setStatus(initialInvoice.status || 'sent');
        setDiscountType(initialInvoice.discountType || 'flat');
        if (initialInvoice.discountType === 'percentage' && initialInvoice.discountValue !== undefined) {
          setDiscountValue(initialInvoice.discountValue);
        } else {
          setDiscountValue(initialInvoice.discountValue ?? initialInvoice.discount ?? 0);
        }
        setDiscountReason(initialInvoice.discountReason || '');
        setTaxRate(initialInvoice.taxRate || 0);
        setItems(
          initialInvoice.items?.length
            ? initialInvoice.items
            : [{ id: '1', description: 'Educational Consultancy Fee', quantity: 1, unitPrice: initialInvoice.amount, total: initialInvoice.amount }]
        );
        setNotes(initialInvoice.notes || '');
      } else {
        const targetStudentId = preselectedStudentId || (students[0]?.id || '');
        const matched = students.find(s => s.id === targetStudentId);
        setStudentId(targetStudentId);
        setIntakeYear(
          matched?.intakeYear || (selectedYearFilter !== 'ALL' ? selectedYearFilter : String(new Date().getFullYear()))
        );
        const randomSeq = Math.floor(1000 + Math.random() * 9000);
        setInvoiceNumber(`SKL-${new Date().getFullYear()}-${randomSeq}`);
        setCurrency('EUR');
        setInvoiceDate(new Date().toISOString().split('T')[0]);
        setDueDate(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
        setStatus('sent');
        setDiscountValue(0);
        setDiscountType('flat');
        setDiscountReason('');
        setTaxRate(0);
        setItems([
          { id: '1', description: 'Comprehensive Admission Guidance & Dossier Review', quantity: 1, unitPrice: 1000, total: 1000 }
        ]);
        setNotes('');
      }
    }
  }, [isOpen, initialInvoice, preselectedStudentId, students, selectedYearFilter]);

  const handleStudentChange = (nextId: string) => {
    setStudentId(nextId);
    const matched = students.find(s => s.id === nextId);
    if (matched?.intakeYear) setIntakeYear(matched.intakeYear);
  };

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      { id: String(Date.now()), description: '', quantity: 1, unitPrice: 0, total: 0 }
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: 'description' | 'quantity' | 'unitPrice', value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.total = Number(updated.quantity) * Number(updated.unitPrice);
        }
        return updated;
      }
      return item;
    }));
  };

  const subtotal = items.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
  const rawDiscount = discountType === 'percentage'
    ? (subtotal * (Number(discountValue) || 0)) / 100
    : Number(discountValue) || 0;
  const calculatedDiscount = Math.min(subtotal, Math.max(0, Math.round(rawDiscount * 100) / 100));
  const afterDiscount = Math.max(0, subtotal - calculatedDiscount);
  const taxAmount = Math.round(((afterDiscount * (Number(taxRate) || 0)) / 100) * 100) / 100;
  const finalTotal = Math.round((afterDiscount + taxAmount) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !invoiceNumber || finalTotal <= 0) {
      toastError('Validation', 'Please select a candidate and ensure invoice total is greater than 0.');
      return;
    }

    setLoading(true);
    try {
      const selectedStudent = students.find(s => s.id === studentId);

      await onSubmit(
        {
          invoiceNumber: invoiceNumber.trim(),
          studentId,
          studentName: selectedStudent?.fullName || initialInvoice?.studentName || 'Student',
          countryCode: selectedStudent?.countryOfInterest || initialInvoice?.countryCode || 'IT',
          intakeYear: intakeYear || String(new Date().getFullYear()),
          currency,
          subtotal,
          discount: calculatedDiscount,
          discountType,
          discountValue: Number(discountValue) || 0,
          discountReason: discountReason.trim(),
          taxRate: Number(taxRate) || 0,
          taxAmount,
          amount: finalTotal,
          invoiceDate,
          dueDate,
          status,
          items: items.map(i => ({ ...i, description: i.description.trim() || 'Consultancy Service' })),
          notes: notes.trim(),
        },
        initialInvoice?.id
      );

      onClose();
    } catch (err: any) {
      console.error(err);
      toastError('Save Error', err?.message || 'Failed to save invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? `Edit Invoice ${initialInvoice?.invoiceNumber}` : "Create Candidate Invoice"}
      subtitle="Executive billing statement with line items, discounts, and year tracking"
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="gold" onClick={handleSubmit} loading={loading}>
            {isEditMode
              ? `Save Invoice (${currency} ${finalTotal.toLocaleString()})`
              : `Issue Invoice (${currency} ${finalTotal.toLocaleString()})`}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Candidate, Year & Invoice Number */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
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

          <Input
            label="Invoice Number *"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

          <Input
            label="Issue Date"
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            required
          />

          <Input
            label="Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />

          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'sent', label: 'Sent / Open' },
              { value: 'partial', label: 'Partial Paid' },
              { value: 'paid', label: 'Paid' },
              { value: 'overdue', label: 'Overdue' },
            ]}
          />
        </div>

        {/* Line Items Table */}
        <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-navy-950 uppercase tracking-wider">
              Itemized Service Deliverables
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Line Item
            </Button>
          </div>

          <div className="space-y-2.5">
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-12 sm:col-span-6">
                  <CreatableSelect
                    categoryKey="invoice_deliverables"
                    value={item.description}
                    onChange={(val) => handleItemChange(item.id, 'description', val)}
                    options={DEFAULT_LINE_ITEMS}
                    placeholder="Select or type service item..."
                  />
                </div>
                <div className="col-span-3 sm:col-span-2">
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-2.5 py-2 text-xs text-navy-950 text-center focus:outline-none bg-white"
                    required
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="Rate"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(item.id, 'unitPrice', e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-2.5 py-2 text-xs text-navy-950 text-right focus:outline-none bg-white"
                    required
                  />
                </div>
                <div className="col-span-4 sm:col-span-1 text-right text-xs font-bold text-navy-950">
                  {currency} {Number(item.total).toLocaleString()}
                </div>
                <div className="col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={items.length <= 1}
                    className="p-1.5 text-slate-300 hover:text-rose-500 disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Discount & Tax Section */}
          <div className="mt-4 pt-3 border-t border-slate-200 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-5">
                <CreatableSelect
                  label="Discount Label / Concession Reason"
                  categoryKey="discount_reasons"
                  value={discountReason}
                  onChange={(val) => setDiscountReason(val)}
                  options={DEFAULT_DISCOUNT_REASONS}
                  placeholder="Optional (e.g. Early Bird Discount)..."
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-gold-600" />
                  Discount Amount
                </label>
                <div className="flex items-center gap-1.5">
                  <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 text-xs shrink-0">
                    <button
                      type="button"
                      onClick={() => setDiscountType('flat')}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                        discountType === 'flat' ? 'bg-gold-500 text-navy-950' : 'text-slate-500 hover:text-navy-950'
                      }`}
                    >
                      {currency}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('percentage')}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                        discountType === 'percentage' ? 'bg-gold-500 text-navy-950' : 'text-slate-500 hover:text-navy-950'
                      }`}
                    >
                      %
                    </button>
                  </div>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    max={discountType === 'percentage' ? 100 : subtotal}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    placeholder={discountType === 'percentage' ? '10%' : '0'}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-navy-950 text-right focus:outline-none focus:ring-1 focus:ring-gold-500 bg-white"
                  />
                </div>
              </div>

              <div className="md:col-span-3">
                <Input
                  label="Tax / VAT (%)"
                  type="number"
                  min="0"
                  max="50"
                  step="0.1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Live Calculations Summary */}
            <div className="pt-2 border-t border-slate-200/80 space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span className="font-semibold">{currency} {subtotal.toLocaleString()}</span>
              </div>
              {calculatedDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>
                    {discountReason || 'Discount'} ({discountType === 'percentage' ? `${discountValue}%` : 'Flat'}):
                  </span>
                  <span>-{currency} {calculatedDiscount.toLocaleString()}</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>VAT / Tax ({taxRate}%):</span>
                  <span>+{currency} {taxAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm font-extrabold text-navy-950 pt-1.5 border-t border-slate-200">
                <span>Final Payable Total:</span>
                <span className="text-base text-gold-600">
                  {currency} {finalTotal.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wider mb-1.5">
            Payment Terms / Bank & UPI Remittance Instructions
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Custom remittance instructions, UPI handle, installment due milestones, or scholarship terms..."
            className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-navy-950 focus:border-navy-600 focus:outline-none"
          />
        </div>
      </form>
    </Modal>
  );
};
