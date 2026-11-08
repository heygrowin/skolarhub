import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Country, Currency } from '../../types';

interface CountryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (countryData: any) => Promise<void>;
  initialData?: Country | null;
}

export const CountryFormModal: React.FC<CountryFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [flag, setFlag] = useState('🌐');
  const [description, setDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [defaultCurrency, setDefaultCurrency] = useState<Currency>('EUR');
  
  // Settings lists (comma or newline separated)
  const [universitiesText, setUniversitiesText] = useState('');
  const [documentsText, setDocumentsText] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setCode(initialData.code || '');
      setFlag(initialData.flag || '🌐');
      setDescription(initialData.description || '');
      setWebsiteUrl(initialData.websiteUrl || '');
      setStatus(initialData.status || 'active');
      setDefaultCurrency(initialData.defaultCurrency || 'EUR');
      setUniversitiesText((initialData.settings?.universities || []).join('\n'));
      setDocumentsText((initialData.settings?.requiredDocuments || []).join('\n'));
    } else {
      setName('');
      setCode('');
      setFlag('🌐');
      setDescription('');
      setWebsiteUrl('');
      setStatus('active');
      setDefaultCurrency('EUR');
      setUniversitiesText('');
      setDocumentsText('');
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;

    setLoading(true);
    try {
      const universities = universitiesText
        .split('\n')
        .map(u => u.trim())
        .filter(Boolean);

      const requiredDocuments = documentsText
        .split('\n')
        .map(d => d.trim())
        .filter(Boolean);

      await onSubmit({
        name,
        code: code.toUpperCase(),
        flag,
        description,
        websiteUrl,
        status,
        defaultCurrency,
        settings: {
          universities,
          requiredDocuments,
        },
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
      title={initialData ? 'Configure Destination Country' : 'Add New Study Destination'}
      subtitle="Expand SKOLAR portfolio dynamically without source code modification"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="gold" onClick={handleSubmit} loading={loading}>
            {initialData ? 'Update Destination' : 'Create Country'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="Country Name *"
              placeholder="e.g. Germany or United Kingdom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="flex gap-2">
            <div className="w-20">
              <Input
                label="Flag"
                placeholder="🇩🇪"
                value={flag}
                onChange={(e) => setFlag(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Input
                label="Code *"
                placeholder="DE"
                maxLength={3}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                disabled={!!initialData}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Website or Country Portal URL"
            placeholder="https://skolar.it/germany"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
          />

          <Select
            label="Default Base Currency"
            value={defaultCurrency}
            onChange={(e) => setDefaultCurrency(e.target.value as Currency)}
            options={[
              { value: 'EUR', label: 'EUR (€) - Euro' },
              { value: 'USD', label: 'USD ($) - US Dollar' },
              { value: 'INR', label: 'INR (₹) - Indian Rupee' },
            ]}
          />
        </div>

        <div>
          <Input
            label="Destination Overview & Value Proposition"
            placeholder="e.g. English-taught STEM courses, no tuition fees at public universities..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Partner Universities List */}
        <div>
          <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wider mb-1.5">
            Partner / Recognized Universities (One per line)
          </label>
          <textarea
            rows={4}
            value={universitiesText}
            onChange={(e) => setUniversitiesText(e.target.value)}
            placeholder="Technical University of Munich&#10;Heidelberg University&#10;RWTH Aachen University"
            className="w-full rounded-xl border border-slate-300 p-3 text-xs text-navy-950 focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20 focus:outline-none font-mono"
          />
        </div>

        {/* Required Documents List */}
        <div>
          <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wider mb-1.5">
            Required Compliance Documents (One per line)
          </label>
          <textarea
            rows={4}
            value={documentsText}
            onChange={(e) => setDocumentsText(e.target.value)}
            placeholder="Passport with 2 Years Validity&#10;APS Certificate&#10;TestAS Scorecard&#10;Blocked Bank Account Statement"
            className="w-full rounded-xl border border-slate-300 p-3 text-xs text-navy-950 focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20 focus:outline-none font-mono"
          />
        </div>
      </form>
    </Modal>
  );
};

