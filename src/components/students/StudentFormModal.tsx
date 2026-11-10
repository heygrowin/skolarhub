import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { CreatableSelect } from '../common/CreatableSelect';
import { Student, Country, Partner, CustomFieldDefinition } from '../../types';
import { getCustomFields } from '../../services/customFieldService';
import { useCountry } from '../../context/CountryContext';
import { useYear } from '../../context/YearContext';
import { useToast } from '../../context/ToastContext';

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (studentData: any) => Promise<void>;
  initialData?: Student | null;
  partners: Partner[];
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  partners,
}) => {
  const { countries } = useCountry();
  const { years, selectedYearFilter } = useYear();
  const { error: toastError } = useToast();
  const [loading, setLoading] = useState<boolean>(false);
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [nationality, setNationality] = useState('Indian');
  const [address, setAddress] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [passportExpiry, setPassportExpiry] = useState('');

  // Academic & Intake
  const [intakeYear, setIntakeYear] = useState('2025');
  const [previousEducation, setPreviousEducation] = useState('High School (12th Grade)');
  const [schoolOrUniversity, setSchoolOrUniversity] = useState('');
  const [academicMarks, setAcademicMarks] = useState('');
  const [neetScore, setNeetScore] = useState('');
  const [neetQualified, setNeetQualified] = useState<boolean>(false);

  // Business
  const [acquisitionType, setAcquisitionType] = useState<'B2C' | 'B2B'>('B2C');
  const [countryOfInterest, setCountryOfInterest] = useState<string>('IT');
  const [partnerId, setPartnerId] = useState<string>('');
  const [leadSource, setLeadSource] = useState('Website Form (skolar.it)');
  const [notes, setNotes] = useState('');

  // Dynamic Custom Field Values
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});

  useEffect(() => {
    if (initialData) {
      setFullName(initialData.fullName || '');
      setEmail(initialData.email || '');
      setPhone(initialData.phone || '');
      setDateOfBirth(initialData.dateOfBirth || '');
      setNationality(initialData.nationality || 'Indian');
      setAddress(initialData.address || '');
      setPassportNumber(initialData.passportNumber || '');
      setPassportExpiry(initialData.passportExpiry || '');
      setIntakeYear(initialData.intakeYear || new Date().getFullYear().toString());
      setPreviousEducation(initialData.previousEducation || 'High School (12th Grade)');
      setSchoolOrUniversity(initialData.schoolOrUniversity || '');
      setAcademicMarks(initialData.academicMarks || '');
      setNeetScore(initialData.neetScore || '');
      setNeetQualified(!!initialData.neetQualified);
      setAcquisitionType(initialData.acquisitionType || 'B2C');
      setCountryOfInterest(initialData.countryOfInterest || 'IT');
      setPartnerId(initialData.partnerId || '');
      setLeadSource(initialData.leadSource || 'Website Form (skolar.it)');
      setNotes(initialData.notes || '');
      setCustomFieldValues(initialData.customFields || {});
    } else {
      // Reset form
      setFullName('');
      setEmail('');
      setPhone('');
      setDateOfBirth('');
      setNationality('Indian');
      setAddress('');
      setPassportNumber('');
      setPassportExpiry('');
      setIntakeYear(selectedYearFilter !== 'ALL' ? selectedYearFilter : String(new Date().getFullYear()));
      setPreviousEducation('High School (12th Grade)');
      setSchoolOrUniversity('');
      setAcademicMarks('');
      setNeetScore('');
      setNeetQualified(false);
      setAcquisitionType('B2C');
      setCountryOfInterest(countries[0]?.code || 'IT');
      setPartnerId('');
      setLeadSource('Website Form (skolar.it)');
      setNotes('');
      setCustomFieldValues({});
    }
  }, [initialData, countries, isOpen, selectedYearFilter]);

  // Load relevant custom fields when countryOfInterest changes
  useEffect(() => {
    async function loadFields() {
      if (countryOfInterest) {
        const fields = await getCustomFields(countryOfInterest);
        setCustomFields(fields);
      }
    }
    loadFields();
  }, [countryOfInterest]);

  const handleCustomFieldChange = (key: string, value: any) => {
    setCustomFieldValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email) {
      toastError('Required Information', 'Full Name and Email are mandatory.');
      return;
    }

    setLoading(true);
    try {
      const selectedPartner = partners.find(p => p.id === partnerId);

      const payload: any = {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        dateOfBirth: dateOfBirth || '',
        nationality: nationality || 'Indian',
        address: address || '',
        passportNumber: passportNumber.trim() || '',
        passportExpiry: passportExpiry || '',
        intakeYear: intakeYear || '2025',
        previousEducation: previousEducation || '',
        schoolOrUniversity: schoolOrUniversity || '',
        academicMarks: academicMarks || '',
        neetQualified: Boolean(neetQualified),
        acquisitionType,
        countryOfInterest,
        leadSource: acquisitionType === 'B2B' ? `Partner: ${selectedPartner?.name || 'Partner'}` : leadSource,
        registrationDate: initialData?.registrationDate || new Date().toISOString(),
        notes: notes || '',
        customFields: customFieldValues || {},
      };

      if (neetScore && neetScore.trim()) {
        payload.neetScore = neetScore.trim();
      }

      if (acquisitionType === 'B2B' && partnerId) {
        payload.partnerId = partnerId;
        payload.partnerName = selectedPartner?.name || '';
      }

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      console.error("Failed to submit student form:", err);
      toastError('Save Error', err?.message || 'Could not save candidate dossier');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Candidate Profile' : 'Register New Student'}
      subtitle="Complete business, academic and country-specific dossier information"
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="gold" onClick={handleSubmit} loading={loading}>
            {initialData ? 'Save Changes' : 'Register Student'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Business & Acquisition Channel */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-gold-500 mb-3 flex items-center gap-2">
            <span>01. Acquisition & Country Selection</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div>
              <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wider mb-1.5">
                Acquisition Channel *
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAcquisitionType('B2C')}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                    acquisitionType === 'B2C'
                      ? 'bg-navy-900 text-white border-navy-900 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Direct (B2C)
                </button>
                <button
                  type="button"
                  onClick={() => setAcquisitionType('B2B')}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                    acquisitionType === 'B2B'
                      ? 'bg-gold-500 text-navy-950 border-gold-500 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Partner (B2B)
                </button>
              </div>
            </div>

            {acquisitionType === 'B2B' ? (
              <Select
                label="Referring B2B Partner *"
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                required
                options={[
                  { value: '', label: '-- Select Agent / Creator --' },
                  ...partners.map(p => ({ value: p.id, label: `${p.name} (${p.partnerType})` }))
                ]}
              />
            ) : (
              <CreatableSelect
                label="Lead Acquisition Source"
                categoryKey="lead_sources"
                value={leadSource}
                onChange={(val) => setLeadSource(val)}
                options={[
                  'Website Form (skolar.it)',
                  'Instagram / Social Media',
                  'Direct Call / WhatsApp',
                  'Google Search',
                  'Education Fair',
                  'Alumni / Word of Mouth',
                  'Direct Walk-in',
                ]}
                placeholder="Select or type new lead source..."
              />
            )}

            <CreatableSelect
              label="Intake Academic Year *"
              categoryKey="intake_years"
              value={intakeYear}
              onChange={(val) => setIntakeYear(val)}
              options={years}
              placeholder="Select or type year (e.g. 2026)..."
              required
              helperText="Tap to view or add custom year"
            />

            <Select
              label="Country of Interest *"
              value={countryOfInterest}
              onChange={(e) => setCountryOfInterest(e.target.value)}
              required
              options={countries.map(c => ({ value: c.code, label: `${c.flag} ${c.name}` }))}
            />
          </div>
        </div>

        {/* Section 2: Personal Information */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-navy-900 mb-3">
            02. Personal & Identity Details
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Full Legal Name"
              required
              placeholder="e.g. Matteo Rossi"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <Input
              label="Email Address"
              type="email"
              required
              placeholder="candidate@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Phone Number"
              placeholder="+39 340 1234567 or +91 98..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              label="Date of Birth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
            <CreatableSelect
              label="Nationality"
              categoryKey="nationalities"
              value={nationality}
              onChange={(val) => setNationality(val)}
              options={['Indian', 'Italian', 'Mongolian', 'Nepalese', 'Bangladeshi', 'Nigerian', 'Sri Lankan', 'Pakistani']}
              placeholder="Select or add nationality..."
            />
            <Input
              label="Passport Number"
              placeholder="Passport alphanumeric ID"
              value={passportNumber}
              onChange={(e) => setPassportNumber(e.target.value)}
            />
          </div>
          <div className="mt-3">
            <Input
              label="Permanent Residential Address"
              placeholder="Street, City, Postal Code, Country"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </div>

        {/* Section 3: Academic Background */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-navy-900 mb-3">
            03. Academic Qualifications
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CreatableSelect
              label="Highest Completed Education"
              categoryKey="education_levels"
              value={previousEducation}
              onChange={(val) => setPreviousEducation(val)}
              options={[
                'High School (12th Grade)',
                'Senior Secondary (12th PCB)',
                'Senior Secondary (12th PCM)',
                'Bachelor Degree (BSc / BTech / BA)',
                'Master Degree (MSc / MBA)',
                'Diploma / Foundation Year',
              ]}
              placeholder="Select or type qualification..."
            />
            <Input
              label="School or Institution Name"
              placeholder="e.g. Liceo Leonardo da Vinci"
              value={schoolOrUniversity}
              onChange={(e) => setSchoolOrUniversity(e.target.value)}
            />
            <Input
              label="Academic Marks / GPA / %"
              placeholder="e.g. 92% or 88/100 or 3.8 GPA"
              value={academicMarks}
              onChange={(e) => setAcademicMarks(e.target.value)}
            />
          </div>

          {/* NEET Fields (Particularly relevant for medical applicants in Mongolia or Italy) */}
          <div className="mt-4 p-4 rounded-xl bg-amber-50/50 border border-amber-200/60">
            <span className="text-xs font-bold text-amber-900 block mb-2">Medical Entrance Test (NEET / IMAT)</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="NEET Score (If Medical Applicant)"
                placeholder="e.g. 542"
                value={neetScore}
                onChange={(e) => setNeetScore(e.target.value)}
              />
              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={neetQualified}
                    onChange={(e) => setNeetQualified(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-gold-500 focus:ring-gold-400"
                  />
                  <span className="text-xs font-semibold text-navy-900">NEET Officially Qualified</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Country-Specific Custom Fields (Dynamic Builder) */}
        {customFields.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gold-500 mb-3 flex items-center justify-between">
              <span>04. Country Custom Fields ({countryOfInterest})</span>
              <span className="text-[10px] text-slate-400 lowercase font-normal">configured in settings</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              {customFields.map((field) => (
                <div key={field.id}>
                  {field.fieldType === 'dropdown' ? (
                    <CreatableSelect
                      label={field.fieldName}
                      categoryKey={`cf_${field.key}`}
                      value={customFieldValues[field.key] || ''}
                      onChange={(val) => handleCustomFieldChange(field.key, val)}
                      required={field.required}
                      options={field.options || []}
                      placeholder={`Select or add ${field.fieldName}...`}
                      helperText={field.description}
                    />
                  ) : field.fieldType === 'boolean' || field.fieldType === 'checkbox' ? (
                    <div className="pt-5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!customFieldValues[field.key]}
                          onChange={(e) => handleCustomFieldChange(field.key, e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-gold-500 focus:ring-gold-400"
                        />
                        <span className="text-xs font-semibold text-navy-900">{field.fieldName}</span>
                      </label>
                      {field.description && <p className="text-[11px] text-slate-500 mt-1">{field.description}</p>}
                    </div>
                  ) : (
                    <Input
                      label={field.fieldName}
                      type={field.fieldType === 'number' ? 'number' : 'text'}
                      value={customFieldValues[field.key] || ''}
                      onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                      required={field.required}
                      helperText={field.description}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 5: Internal Counsellor Notes */}
        <div>
          <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wider mb-1.5">
            Internal Counsellor Notes & Observations
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add background notes on student preferences, language proficiency, budget, or family discussions..."
            className="w-full rounded-xl border border-slate-300 p-3 text-xs text-navy-950 focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20 focus:outline-none"
          />
        </div>
      </form>
    </Modal>
  );
};

