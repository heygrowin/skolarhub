import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Student, Partner, Currency, ExpenseCategory } from '../../types';
import { useCountry } from '../../context/CountryContext';
import { useToast } from '../../context/ToastContext';

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (expenseData: any) => Promise<void>;
  students: Student[];
  partners: Partner[];
  preselectedStudentId?: string;
  preselectedPartnerId?: string;
}

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  students,
  partners,
  preselectedStudentId,
  preselectedPartnerId,
}) => {
  const { countries } = useCountry();
  const { error: toastError } = useToast();
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number>(100);
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<ExpenseCategory>('University Application Fee');
  const [countryCode, setCountryCode] = useState<string>('IT');
  const [studentId, setStudentId] = useState<string>('');
  const [partnerId, setPartnerId] = useState<string>('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (preselectedStudentId) {
        setStudentId(preselectedStudentId);
        const s = students.find(st => st.id === preselectedStudentId);
        if (s?.countryOfInterest) setCountryCode(s.countryOfInterest);
      }
      if (preselectedPartnerId) {
        setPartnerId(preselectedPartnerId);
        setCategory('Partner Commission');
        const p = partners.find(pr => pr.id === preselectedPartnerId);
        if (p) setTitle(`Creator / Agent Commission - ${p.name}`);
      }
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, preselectedStudentId, preselectedPartnerId, students, partners]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || amount <= 0) {
      toastError('Validation', 'Please enter a title and valid amount.');
      return;
    }

    setLoading(true);
    try {
      const selectedStudent = students.find(s => s.id === studentId);
      const selectedPartner = partners.find(p => p.id === partnerId);

      const payload: any = {
        title: title.trim(),
        amount: Number(amount),
        currency,
        date,
        category,
        countryCode: countryCode || 'IT',
        description: description.trim() || '',
      };

      if (studentId) {
        payload.studentId = studentId;
        payload.studentName = selectedStudent?.fullName || '';
      }

      if (partnerId) {
        payload.partnerId = partnerId;
        payload.partnerName = selectedPartner?.name || '';
      }

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      console.error("ExpenseFormModal error:", err);
      toastError('Save Error', err?.message || 'Failed to record expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Operational Expense"
      subtitle="Log direct university fees, embassy legalization, translation or partner commission"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="gold" onClick={handleSubmit} loading={loading}>
            Record Expense ({currency} {amount.toLocaleString()})
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Expense Title *"
          placeholder="e.g. Politecnico di Milano Evaluation Fee or Apostille Stamp"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Amount *"
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
            label="Category *"
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            options={[
              { value: 'University Application Fee', label: 'University Application Fee' },
              { value: 'Document Translation', label: 'Document Translation' },
              { value: 'Legalization/Apostille', label: 'Legalization / Apostille' },
              { value: 'Visa Processing', label: 'Visa Processing' },
              { value: 'Courier', label: 'DHL / International Courier' },
              { value: 'Partner Commission', label: 'B2B Partner Commission Payout' },
              { value: 'Marketing', label: 'Marketing & Outreach' },
              { value: 'Office/Admin', label: 'Office & Admin' },
              { value: 'Other', label: 'Other Operational Cost' },
            ]}
          />

          <Input
            label="Date of Disbursement"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        {/* Association Blocks */}
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Destination Country"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            options={countries.map(c => ({ value: c.code, label: `${c.flag} ${c.name}` }))}
          />

          <Select
            label="Associate Student (Optional)"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            options={[
              { value: '', label: '-- None (General Overhead) --' },
              ...students.map(s => ({ value: s.id, label: s.fullName }))
            ]}
          />
        </div>

        {category === 'Partner Commission' && (
          <Select
            label="Associate B2B Partner *"
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
            options={[
              { value: '', label: '-- Select Referring Partner --' },
              ...partners.map(p => ({ value: p.id, label: `${p.name} (${p.partnerType})` }))
            ]}
          />
        )}

        <div>
          <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wider mb-1.5">
            Expense Description & Voucher Reference
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Receipt receipt number, payment voucher reference, specific notes..."
            className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-navy-950 focus:border-navy-600 focus:outline-none"
          />
        </div>
      </form>
    </Modal>
  );
};

