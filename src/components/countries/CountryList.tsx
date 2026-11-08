import React, { useState, useEffect, useCallback } from 'react';
import { Country, Student, Application } from '../../types';
import { getCountries, createCountry, updateCountry, deleteCountry } from '../../services/countryService';
import { getStudents } from '../../services/studentService';
import { getApplications } from '../../services/applicationService';
import { useCountry } from '../../context/CountryContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { CountryFormModal } from './CountryFormModal';
import { 
  Globe2, 
  Plus, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  GraduationCap, 
  FileCheck2, 
  Users, 
  RefreshCw 
} from 'lucide-react';

export const CountryList: React.FC = () => {
  const { refreshCountries } = useCountry();
  const { hasPermission } = useAuth();
  const { success, error } = useToast();

  const [countries, setCountries] = useState<Country[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);

  const canManageCountry = hasPermission('country.manage');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [countryList, studentRes, appList] = await Promise.all([
        getCountries(),
        getStudents(),
        getApplications(),
      ]);

      setCountries(countryList);
      setStudents(studentRes.students);
      setApplications(appList);
    } catch (err: any) {
      error('Failed to load countries', err.message);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveCountry = async (data: any) => {
    try {
      if (editingCountry) {
        await updateCountry(editingCountry.id, data);
        success('Country Updated', `${data.name} configuration saved.`);
      } else {
        await createCountry(data);
        success('Destination Added', `${data.name} (${data.code}) is now active.`);
      }
      refreshCountries();
      loadData();
    } catch (err: any) {
      error('Failed to save country', err.message);
      throw err;
    }
  };

  const handleDelete = async (country: Country) => {
    if (['country_IT', 'country_MN'].includes(country.id)) {
      if (!window.confirm(`Warning: ${country.name} is a primary SKOLAR market. Delete anyway?`)) return;
    } else {
      if (!window.confirm(`Are you sure you want to delete ${country.name}?`)) return;
    }

    try {
      await deleteCountry(country.id);
      success('Country Removed', `${country.name} was removed.`);
      refreshCountries();
      loadData();
    } catch (err: any) {
      error('Delete Failed', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy-950 tracking-tight">Country & Destination Portfolio</h2>
          <p className="text-xs text-slate-500">
            Configure universities, required compliance documents and currencies per destination
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={loadData}
            loading={loading}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>

          {canManageCountry && (
            <Button
              variant="gold"
              size="sm"
              onClick={() => {
                setEditingCountry(null);
                setModalOpen(true);
              }}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Country
            </Button>
          )}
        </div>
      </div>

      {/* Country Cards */}
      {countries.length === 0 ? (
        <EmptyState
          icon={<Globe2 className="w-8 h-8" />}
          title="No Destinations Configured"
          description="Initialize Italy, Mongolia or add any country."
          actionText={canManageCountry ? "Add First Destination" : undefined}
          onAction={() => setModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {countries.map((c) => {
            const countryStudents = students.filter(s => s.countryOfInterest === c.code);
            const countryApps = applications.filter(a => a.countryCode === c.code);
            const universities = c.settings?.universities || [];
            const requiredDocs = c.settings?.requiredDocuments || [];

            return (
              <div
                key={c.id}
                className="rounded-3xl bg-white border border-slate-200/90 shadow-soft p-6 flex flex-col justify-between hover:shadow-card transition-all"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl p-2 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm">
                        {c.flag}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-navy-950 tracking-tight">{c.name}</h3>
                          <Badge variant="navy" size="sm">{c.code}</Badge>
                          <Badge variant={c.status === 'active' ? 'green' : 'slate'} size="sm">
                            {c.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Base Currency: <strong className="text-navy-900">{c.defaultCurrency}</strong>
                        </p>
                      </div>
                    </div>

                    {canManageCountry && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingCountry(c);
                            setModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-gold-600 hover:bg-gold-50 transition-colors"
                          title="Edit Country Configuration"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Destination"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {c.description && (
                    <p className="text-xs text-slate-600 leading-relaxed mb-4">
                      {c.description}
                    </p>
                  )}

                  {/* Operational Metrics */}
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 mb-5 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-navy-100/80 text-navy-800">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Enrolled Students</span>
                        <strong className="text-navy-950 text-sm font-extrabold">{countryStudents.length}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-gold-100 text-gold-700">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Active Applications</span>
                        <strong className="text-navy-950 text-sm font-extrabold">{countryApps.length}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Universities List Preview */}
                  <div className="space-y-3">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-gold-500" />
                        Recognized Universities ({universities.length})
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {universities.slice(0, 4).map((u, i) => (
                          <span key={i} className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">
                            {u}
                          </span>
                        ))}
                        {universities.length > 4 && (
                          <span className="text-[11px] px-2 py-1 rounded-lg bg-slate-100 text-slate-500 font-semibold">
                            +{universities.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Required Documents Checklist */}
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                        <FileCheck2 className="w-3.5 h-3.5 text-emerald-500" />
                        Required Compliance Documents ({requiredDocs.length})
                      </span>
                      <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                        {requiredDocs.slice(0, 3).map((d, i) => (
                          <li key={i} className="truncate">{d}</li>
                        ))}
                        {requiredDocs.length > 3 && (
                          <li className="text-slate-400 italic">+{requiredDocs.length - 3} additional documents...</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Footer Portal Link */}
                {c.websiteUrl && (
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Public Portal</span>
                    <a
                      href={c.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-gold-600 hover:text-gold-700 flex items-center gap-1"
                    >
                      <span>{c.websiteUrl.replace('https://', '')}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <CountryFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSaveCountry}
        initialData={editingCountry}
      />
    </div>
  );
};

