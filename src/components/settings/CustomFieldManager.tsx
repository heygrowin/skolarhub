import React, { useState, useEffect, useCallback } from 'react';
import { CustomFieldDefinition, CustomFieldType } from '../../types';
import { getCustomFields, createCustomField, updateCustomField, deleteCustomField } from '../../services/customFieldService';
import { useCountry } from '../../context/CountryContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Plus, Trash2, Edit3, Settings2 } from 'lucide-react';

export const CustomFieldManager: React.FC = () => {
  const { countries } = useCountry();
  const { hasPermission } = useAuth();
  const { success, error } = useToast();

  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);

  // Field Form State
  const [fieldName, setFieldName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [fieldType, setFieldType] = useState<CustomFieldType>('text');
  const [required, setRequired] = useState(false);
  const [optionsText, setOptionsText] = useState('');
  const [countryCode, setCountryCode] = useState('*');
  const [displayOrder, setDisplayOrder] = useState(1);

  const canManageSettings = hasPermission('settings.manage');

  const loadFields = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getCustomFields();
      setFields(list);
    } catch (err: any) {
      error('Failed to load custom fields', err.message);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadFields();
  }, [loadFields]);

  useEffect(() => {
    if (editingField) {
      setFieldName(editingField.fieldName);
      setKey(editingField.key);
      setDescription(editingField.description || '');
      setFieldType(editingField.fieldType);
      setRequired(editingField.required);
      setOptionsText((editingField.options || []).join('\n'));
      setCountryCode(editingField.countryCode);
      setDisplayOrder(editingField.displayOrder || 1);
    } else {
      setFieldName('');
      setKey('');
      setDescription('');
      setFieldType('text');
      setRequired(false);
      setOptionsText('');
      setCountryCode('*');
      setDisplayOrder(fields.length + 1);
    }
  }, [editingField, fields.length]);

  const handleNameChange = (nameVal: string) => {
    setFieldName(nameVal);
    if (!editingField) {
      // Auto-generate camelCase key
      const camel = nameVal
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .split(' ')
        .map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join('');
      setKey(camel);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldName || !key) return;

    try {
      const options = optionsText.split('\n').map(o => o.trim()).filter(Boolean);

      const payload = {
        fieldName,
        key,
        description,
        fieldType,
        required,
        options: (fieldType === 'dropdown' || fieldType === 'multiselect') ? options : undefined,
        countryCode,
        displayOrder: Number(displayOrder),
      };

      if (editingField) {
        await updateCustomField(editingField.id, payload);
        success('Custom Field Updated', `${fieldName} has been updated.`);
      } else {
        await createCustomField(payload);
        success('Custom Field Created', `${fieldName} is now active.`);
      }

      setModalOpen(false);
      loadFields();
    } catch (err: any) {
      error('Failed to save field', err.message);
    }
  };

  const handleDelete = async (f: CustomFieldDefinition) => {
    if (!window.confirm(`Delete custom field "${f.fieldName}"?`)) return;
    try {
      await deleteCustomField(f.id);
      success('Field Deleted', `${f.fieldName} removed.`);
      loadFields();
    } catch (err: any) {
      error('Delete Failed', err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-navy-950 flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-gold-500" />
            Dynamic Custom Field Builder
          </h3>
          <p className="text-xs text-slate-400">
            Create country-specific candidate fields without editing application source code
          </p>
        </div>

        {canManageSettings && (
          <Button
            variant="gold"
            size="sm"
            onClick={() => {
              setEditingField(null);
              setModalOpen(true);
            }}
            icon={<Plus className="w-4 h-4" />}
          >
            Add Field
          </Button>
        )}
      </div>

      {fields.length === 0 ? (
        <p className="text-xs text-slate-400 py-6 text-center bg-white rounded-2xl border border-slate-200">
          No custom fields configured. Click "Add Field" to create one.
        </p>
      ) : (
        <div className="divide-y divide-slate-100 rounded-2xl bg-white border border-slate-200/80 overflow-hidden">
          {fields.map((f) => (
            <div key={f.id} className="p-4 flex items-center justify-between gap-4 text-xs hover:bg-slate-50/50">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-navy-950">{f.fieldName}</span>
                  <Badge variant="navy" size="sm">key: {f.key}</Badge>
                  <Badge variant="slate" size="sm">{f.fieldType}</Badge>
                  {f.required && <Badge variant="yellow" size="sm">Required</Badge>}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                  <span>Scope: <strong className="text-slate-700">{f.countryCode === '*' ? '🌐 All Countries' : `Destination: ${f.countryCode}`}</strong></span>
                  {f.description && <span>• {f.description}</span>}
                </div>
              </div>

              {canManageSettings && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingField(f);
                      setModalOpen(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-gold-600 rounded-lg hover:bg-gold-50"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(f)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Field Editor Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingField ? 'Edit Dynamic Field' : 'Build Custom Field'}
        subtitle="Configure field properties and destination assignment"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="gold" onClick={handleSubmit}>
              {editingField ? 'Save Field' : 'Create Field'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Field Label / Display Name *"
            placeholder="e.g. Codice Fiscale or NEET Roll Number"
            value={fieldName}
            onChange={(e) => handleNameChange(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Internal Key *"
              placeholder="e.g. codiceFiscale"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              required
            />

            <Select
              label="Field Type *"
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value as CustomFieldType)}
              options={[
                { value: 'text', label: 'Short Text' },
                { value: 'textarea', label: 'Long Text' },
                { value: 'number', label: 'Number' },
                { value: 'date', label: 'Date' },
                { value: 'dropdown', label: 'Dropdown Selection' },
                { value: 'boolean', label: 'Yes / No Checkbox' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Country Assignment *"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              options={[
                { value: '*', label: '🌐 All Destinations (Global)' },
                ...countries.map(c => ({ value: c.code, label: `${c.flag} ${c.name} Only` }))
              ]}
            />

            <Input
              label="Display Order"
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(Number(e.target.value))}
            />
          </div>

          <Input
            label="Field Helper Description"
            placeholder="e.g. 16 alphanumeric characters as issued by Italian Agenzia delle Entrate"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {(fieldType === 'dropdown' || fieldType === 'multiselect') && (
            <div>
              <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wider mb-1.5">
                Dropdown Options (One per line) *
              </label>
              <textarea
                rows={3}
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder="Option 1&#10;Option 2&#10;Option 3"
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-navy-950 focus:border-navy-600 focus:outline-none"
                required
              />
            </div>
          )}

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-gold-500 focus:ring-gold-400"
              />
              <span className="text-xs font-semibold text-navy-900">Make this field mandatory</span>
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
};

