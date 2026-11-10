import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { CreatableSelect } from '../common/CreatableSelect';
import { Partner, PartnerType, Currency } from '../../types';

interface PartnerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (partnerData: any) => Promise<void>;
  initialData?: Partner | null;
}

export const PartnerFormModal: React.FC<PartnerFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [partnerType, setPartnerType] = useState<PartnerType>('Content Creator');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [country, setCountry] = useState('India');
  const [commissionType, setCommissionType] = useState<'percentage' | 'fixed'>('percentage');
  const [commissionRate, setCommissionRate] = useState<number>(15);
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [notes, setNotes] = useState('');
  const [agreementDetails, setAgreementDetails] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setPartnerType(initialData.partnerType || 'Content Creator');
      setContactPerson(initialData.contactPerson || '');
      setEmail(initialData.email || '');
      setPhone(initialData.phone || '');
      setCompany(initialData.company || '');
      setCountry(initialData.country || 'India');
      setCommissionType(initialData.commissionType || 'percentage');
      setCommissionRate(initialData.commissionRate || 15);
      setCurrency(initialData.currency || 'EUR');
      setStatus(initialData.status || 'active');
      setNotes(initialData.notes || '');
      setAgreementDetails(initialData.agreementDetails || '');
    } else {
      setName('');
      setPartnerType('Content Creator');
      setContactPerson('');
      setEmail('');
      setPhone('');
      setCompany('');
      setCountry('India');
      setCommissionType('percentage');
      setCommissionRate(15);
      setCurrency('EUR');
      setStatus('active');
      setNotes('');
      setAgreementDetails('');
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    setLoading(true);
    try {
      await onSubmit({
        name,
        partnerType,
        contactPerson,
        email,
        phone,
        company,
        country,
        commissionType,
        commissionRate: Number(commissionRate),
        currency,
        status,
        notes,
        agreementDetails,
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
      title={initialData ? 'Edit B2B Partner Profile' : 'Onboard New B2B Partner'}
      subtitle="Establish referral agreement, contact details and commission structure"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="gold" onClick={handleSubmit} loading={loading}>
            {initialData ? 'Save Partner Profile' : 'Register Partner'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Partner Entity Name *"
            placeholder="e.g. Harshit / EduVlog or Apex Global"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <CreatableSelect
            label="Partner Category *"
            categoryKey="partner_types"
            value={partnerType}
            onChange={(val) => setPartnerType(val as PartnerType)}
            options={[
              'Content Creator',
              'Education Agent',
              'Referral Partner',
              'Business Partner',
              'Institutional Partner',
              'Other',
            ]}
            placeholder="Select or add type..."
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Contact Person"
            placeholder="e.g. Harshit Sharma"
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
          />

          <Input
            label="Official Email *"
            type="email"
            placeholder="partner@network.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Phone / WhatsApp"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Company / Agency Name"
            placeholder="e.g. EduVlog Media Pvt Ltd"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />

          <CreatableSelect
            label="Operating Country / Region"
            categoryKey="operating_countries"
            value={country}
            onChange={(val) => setCountry(val)}
            options={['India', 'Italy', 'Mongolia', 'UAE', 'UK', 'Germany', 'Nepal', 'Nigeria']}
            placeholder="Select or add country..."
          />
        </div>

        {/* Commission Arrangement Section */}
        <div className="p-4 rounded-2xl bg-gold-50/50 border border-gold-200/60 space-y-3">
          <span className="text-xs font-bold text-navy-950 uppercase tracking-wider block">
            Commission Arrangement & Financial Terms
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Commission Model"
              value={commissionType}
              onChange={(e) => setCommissionType(e.target.value as 'percentage' | 'fixed')}
              options={[
                { value: 'percentage', label: 'Percentage (%) of Consultancy' },
                { value: 'fixed', label: 'Fixed Fee per Enrolled Student' },
              ]}
            />

            <Input
              label={commissionType === 'percentage' ? 'Commission Rate (%)' : 'Fixed Amount'}
              type="number"
              value={commissionRate}
              onChange={(e) => setCommissionRate(Number(e.target.value))}
              required
            />

            <Select
              label="Settlement Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              options={[
                { value: 'EUR', label: 'EUR (€)' },
                { value: 'USD', label: 'USD ($)' },
                { value: 'INR', label: 'INR (₹)' },
              ]}
            />
          </div>

          <p className="text-[11px] text-slate-500">
            {commissionType === 'percentage'
              ? `Partner receives ${commissionRate}% of collected consultancy revenue for each referred student.`
              : `Partner receives flat ${currency} ${commissionRate} per admitted and enrolled student.`}
          </p>
        </div>

        <div>
          <Input
            label="Contract & Agreement Summary"
            placeholder="e.g. Signed 1-year MOU expiring Dec 2026. Paid net 30 days post university registration."
            value={agreementDetails}
            onChange={(e) => setAgreementDetails(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wider mb-1.5">
            Internal Partner Notes
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Audience demographics, YouTube subscriber count, special requirements..."
            className="w-full rounded-xl border border-slate-300 p-3 text-xs text-navy-950 focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20 focus:outline-none"
          />
        </div>
      </form>
    </Modal>
  );
};

