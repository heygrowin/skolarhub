import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { UserProfile, UserRole, PermissionKey, ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from '../../types';
import { useCountry } from '../../context/CountryContext';

interface TeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: any) => Promise<void>;
  initialData?: UserProfile | null;
}

export const TeamMemberModal: React.FC<TeamMemberModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const { countries } = useCountry();
  const [loading, setLoading] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('counsellor');
  const [assignedCountries, setAssignedCountries] = useState<string[]>(['*']);
  const [permissions, setPermissions] = useState<PermissionKey[]>([]);
  const [isActive, setIsActive] = useState<boolean>(true);

  useEffect(() => {
    if (initialData) {
      setDisplayName(initialData.displayName || '');
      setEmail(initialData.email || '');
      setTitle(initialData.title || '');
      setPhone(initialData.phone || '');
      setRole(initialData.role || 'counsellor');
      setAssignedCountries(initialData.assignedCountries || ['*']);
      setPermissions(initialData.permissions || DEFAULT_ROLE_PERMISSIONS[initialData.role] || []);
      setIsActive(initialData.isActive !== undefined ? initialData.isActive : true);
    } else {
      setDisplayName('');
      setEmail('');
      setTitle('Education Counsellor');
      setPhone('');
      setRole('counsellor');
      setAssignedCountries(['*']);
      setPermissions(DEFAULT_ROLE_PERMISSIONS['counsellor']);
      setIsActive(true);
    }
  }, [initialData, isOpen]);

  // When role changes, if new member, auto-populate role permissions
  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setPermissions(DEFAULT_ROLE_PERMISSIONS[newRole] || []);
  };

  const handleCountryToggle = (code: string) => {
    if (code === '*') {
      setAssignedCountries(['*']);
      return;
    }

    setAssignedCountries(prev => {
      const filtered = prev.filter(c => c !== '*');
      if (filtered.includes(code)) {
        const res = filtered.filter(c => c !== code);
        return res.length === 0 ? ['*'] : res;
      } else {
        return [...filtered, code];
      }
    });
  };

  const handlePermissionToggle = (permKey: PermissionKey) => {
    setPermissions(prev => {
      if (prev.includes(permKey)) {
        return prev.filter(p => p !== permKey);
      } else {
        return [...prev, permKey];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !displayName) return;

    setLoading(true);
    try {
      await onSubmit({
        uid: initialData?.uid || `user_${Date.now()}`,
        displayName,
        email,
        title,
        phone,
        role,
        assignedCountries,
        permissions,
        isActive,
      });

      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Group permissions for matrix view
  const groupedPermissions: { [group: string]: typeof ALL_PERMISSIONS } = {};
  ALL_PERMISSIONS.forEach(p => {
    if (!groupedPermissions[p.group]) groupedPermissions[p.group] = [];
    groupedPermissions[p.group].push(p);
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Configure Team Member' : 'Provision Team Member Account'}
      subtitle="Role-based permissions and regional country assignment"
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="gold" onClick={handleSubmit} loading={loading}>
            {initialData ? 'Save Permissions' : 'Create Team Account'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Full Name *"
            placeholder="e.g. Elena Bianchi"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />

          <Input
            label="Corporate Email *"
            type="email"
            placeholder="elena@skolar.it"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={!!initialData}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Job Title"
            placeholder="e.g. Senior Italian Admissions Counsellor"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <Input
            label="Direct Contact Phone"
            placeholder="+39 340..."
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <Select
            label="System Role *"
            value={role}
            onChange={(e) => handleRoleChange(e.target.value as UserRole)}
            options={[
              { value: 'super_admin', label: 'Super Admin (Full System Access)' },
              { value: 'admin', label: 'Admin (Operations & Finance)' },
              { value: 'manager', label: 'Admissions Manager' },
              { value: 'counsellor', label: 'Education Counsellor' },
              { value: 'finance', label: 'Finance & Ledger Officer' },
              { value: 'custom', label: 'Custom Member' },
            ]}
          />
        </div>

        {/* Country Restrictions */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wider mb-2">
            Permitted Destination Countries
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleCountryToggle('*')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                assignedCountries.includes('*')
                  ? 'bg-navy-900 text-white border-navy-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              🌐 All Countries (Global Access)
            </button>

            {countries.map(c => {
              const isSelected = assignedCountries.includes(c.code) && !assignedCountries.includes('*');
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleCountryToggle(c.code)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    isSelected
                      ? 'bg-gold-500 text-navy-950 border-gold-500 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {c.flag} {c.name}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Counsellors assigned to specific countries cannot view or manage candidates from other destinations.
          </p>
        </div>

        {/* Granular Permissions Matrix */}
        <div>
          <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wider mb-2">
            Granular Permissions Matrix
          </label>
          <div className="space-y-4 max-h-60 overflow-y-auto p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            {Object.entries(groupedPermissions).map(([group, perms]) => (
              <div key={group} className="space-y-2">
                <span className="text-[11px] font-bold text-navy-950 uppercase tracking-wider block border-b border-slate-200 pb-1">
                  {group}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {perms.map((p) => {
                    const isGranted = role === 'super_admin' || permissions.includes(p.key);
                    return (
                      <label key={p.key} className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={isGranted}
                          disabled={role === 'super_admin'}
                          onChange={() => handlePermissionToggle(p.key)}
                          className="w-4 h-4 rounded border-slate-300 text-gold-500 focus:ring-gold-400"
                        />
                        <span className={isGranted ? 'font-semibold text-navy-950' : 'text-slate-500'}>
                          {p.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Account Active Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <div>
            <span className="text-xs font-bold text-navy-950 block">Account Status</span>
            <span className="text-[11px] text-slate-400">Deactivated members cannot access the control center</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
          </label>
        </div>
      </form>
    </Modal>
  );
};

