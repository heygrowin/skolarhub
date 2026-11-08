import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Student, Currency, InvoiceItem, InvoiceStatus } from '../../types';
import { Plus, Trash2 } from 'lucide-react';

interface InvoiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (invoiceData: any) => Promise<void>;
  students: Student[];
  preselectedStudentId?: string;
}

export const InvoiceFormModal: React.FC<InvoiceFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  students,
  preselectedStudentId,
}) => {
  const [loading, setLoading] = useState(false);

  const [studentId, setStudentId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<InvoiceStatus>('sent');
  const [notes, setNotes] = useState('');

  // Invoice Line Items
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: 'Consultancy & University Application Dossier Fee', quantity: 1, unitPrice: 1000, total: 1000 },
  ]);

  useEffect(() => {
    if (isOpen) {
      const targetStudent = preselectedStudentId || (students[0]?.id || '');
      setStudentId(targetStudent);
      const randomSeq = Math.floor(1000 + Math.random() * 9000);
      setInvoiceNumber(`SKL-${new Date().getFullYear()}-${randomSeq}`);
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setDueDate(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
      setStatus('sent');
      setItems([
        { id: '1', description: 'Comprehensive Admission Guidance & Dossier Review', quantity: 1, unitPrice: 1000, total: 1000 }
      ]);
    }
  }, [isOpen, preselectedStudentId, students]);

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

  const totalAmount = items.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !invoiceNumber || totalAmount <= 0) return;

    setLoading(true);
    try {
      const selectedStudent = students.find(s => s.id === studentId);

      await onSubmit({
        invoiceNumber,
        studentId,
        studentName: selectedStudent?.fullName || 'Student',
        countryCode: selectedStudent?.countryOfInterest || 'IT',
        currency,
        amount: totalAmount,
        invoiceDate,
        dueDate,
        status,
        items,
        notes,
      });

      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Student Invoice"
      subtitle="Issue official billing statement linked to candidate dossier"
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="gold" onClick={handleSubmit} loading={loading}>
            Issue Invoice ({currency} {totalAmount.toLocaleString()})
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Candidate Selection */}
        <Select
          label="Bill To Candidate *"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          required
          options={[
            { value: '', label: '-- Select Candidate --' },
            ...students.map(s => ({
              value: s.id,
              label: `${s.fullName} (${s.email}) - Destination: ${s.countryOfInterest}`
            }))
          ]}
        />

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Input
            label="Invoice Number *"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            required
          />

          <Select
            label="Invoice Currency *"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            options={[
              { value: 'EUR', label: 'EUR (€) - Euro' },
              { value: 'USD', label: 'USD ($) - US Dollar' },
              { value: 'INR', label: 'INR (₹) - Indian Rupee' },
            ]}
          />

          <Input
            label="Invoice Date"
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            required
          />

          <Input
            label="Payment Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
        </div>

        {/* Line Items Table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-navy-950 uppercase tracking-wider">
              Service Items & Fees
            </span>
            <button
              type="button"
              onClick={handleAddItem}
              className="text-xs text-gold-600 font-bold hover:text-gold-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Item
            </button>
          </div>

          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Service description (e.g. Visa Processing Fee)"
                  value={item.description}
                  onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                  className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-600"
                  required
                />
                <input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                  className="w-16 rounded-xl border border-slate-300 px-2.5 py-2 text-xs text-navy-950 text-center focus:outline-none"
                  required
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Price"
                  value={item.unitPrice}
                  onChange={(e) => handleItemChange(item.id, 'unitPrice', e.target.value)}
                  className="w-24 rounded-xl border border-slate-300 px-2.5 py-2 text-xs text-navy-950 text-right focus:outline-none"
                  required
                />
                <span className="w-24 text-right text-xs font-bold text-navy-950 pr-2">
                  {currency} {Number(item.total).toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(item.id)}
                  disabled={items.length <= 1}
                  className="p-1.5 text-slate-300 hover:text-rose-500 disabled:opacity-30"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Subtotal */}
          <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center text-sm font-extrabold text-navy-950">
            <span>Total Invoiced Amount:</span>
            <span className="text-base text-gold-600">
              {currency} {totalAmount.toLocaleString()}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wider mb-1.5">
            Payment Terms / Bank Instructions
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Payment instructions, bank wire beneficiary details, reference guidelines..."
            className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-navy-950 focus:border-navy-600 focus:outline-none"
          />
        </div>
      </form>
    </Modal>
  );
};

