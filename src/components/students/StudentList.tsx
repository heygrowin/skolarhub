import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Student, Partner, AcquisitionType } from '../../types';
import { getStudents, deleteStudent, createStudent, updateStudent } from '../../services/studentService';
import { getPartners } from '../../services/partnerService';
import { useCountry } from '../../context/CountryContext';
import { useYear } from '../../context/YearContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { StudentFormModal } from './StudentFormModal';
import { StudentDetailModal } from './StudentDetailModal';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  Eye, 
  Edit3, 
  Mail, 
  Phone, 
  ChevronRight,
  Sparkles,
  RefreshCw,
  Calendar,
  ArrowUpDown,
  GraduationCap,
  Layers,
  List
} from 'lucide-react';

interface StudentListProps {
  onOpenCreateApplication?: (studentId: string) => void;
  onOpenCreateInvoice?: (studentId: string) => void;
  onOpenRecordPayment?: (studentId: string) => void;
  onOpenRecordExpense?: (studentId: string) => void;
  onPreviewDocument?: (doc: any) => void;
}

type SortField = 'year' | 'date' | 'name';
type SortOrder = 'asc' | 'desc';

export const StudentList: React.FC<StudentListProps> = ({
  onOpenCreateApplication = () => {},
  onOpenCreateInvoice = () => {},
  onOpenRecordPayment = () => {},
  onOpenRecordExpense = () => {},
  onPreviewDocument = () => {},
}) => {
  const { countries, selectedCountryFilter, setSelectedCountryFilter } = useCountry();
  const { years, selectedYearFilter, setSelectedYearFilter } = useYear();
  const { hasPermission } = useAuth();
  const { success, error } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [acquisitionFilter, setAcquisitionFilter] = useState<AcquisitionType | 'ALL'>('ALL');
  const [partnerFilter, setPartnerFilter] = useState<string>('');

  // Sorting & Year-wise Grouping
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [groupByYear, setGroupByYear] = useState<boolean>(false);

  // Modals
  const [formModalOpen, setFormModalOpen] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);

  const canCreate = hasPermission('student.create');
  const canEdit = hasPermission('student.edit');
  const canDelete = hasPermission('student.delete');

  const loadData = useCallback(async (forceRefresh: boolean = false) => {
    setLoading(true);
    try {
      const [studentRes, partnerList] = await Promise.all([
        getStudents({
          country: selectedCountryFilter !== 'ALL' ? selectedCountryFilter : undefined,
          acquisitionType: acquisitionFilter !== 'ALL' ? acquisitionFilter : undefined,
          partnerId: partnerFilter || undefined,
          searchQuery: searchTerm,
          forceRefresh,
        }),
        getPartners(forceRefresh),
      ]);

      setStudents(studentRes.students);
      setPartners(partnerList);
    } catch (err: any) {
      console.error(err);
      error('Failed to load students', err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedCountryFilter, acquisitionFilter, partnerFilter, searchTerm, error]);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // Extract distinct years and calculate counts (merging YearContext + live students)
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>(years);
    students.forEach(s => {
      if (s.intakeYear) {
        yearsSet.add(s.intakeYear);
      } else if (s.registrationDate) {
        yearsSet.add(new Date(s.registrationDate).getFullYear().toString());
      }
    });
    return Array.from(yearsSet).sort();
  }, [students, years]);

  const yearCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach(s => {
      const yr = s.intakeYear || (s.registrationDate ? new Date(s.registrationDate).getFullYear().toString() : '2025');
      counts[yr] = (counts[yr] || 0) + 1;
    });
    return counts;
  }, [students]);

  // Filter & Sort students
  const filteredStudents = useMemo(() => {
    let result = [...students];
    if (selectedYearFilter !== 'ALL') {
      result = result.filter(s => {
        const studentYear = s.intakeYear || (s.registrationDate ? new Date(s.registrationDate).getFullYear().toString() : '2025');
        return studentYear === selectedYearFilter;
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      if (sortField === 'year') {
        const yrA = a.intakeYear || (a.registrationDate ? new Date(a.registrationDate).getFullYear().toString() : '2025');
        const yrB = b.intakeYear || (b.registrationDate ? new Date(b.registrationDate).getFullYear().toString() : '2025');
        const cmp = yrA.localeCompare(yrB);
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      if (sortField === 'name') {
        const cmp = a.fullName.localeCompare(b.fullName);
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      const timeA = new Date(a.createdAt || a.registrationDate || 0).getTime();
      const timeB = new Date(b.createdAt || b.registrationDate || 0).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });

    return result;
  }, [students, selectedYearFilter, sortField, sortOrder]);

  // Grouped Year-Wise structure
  const groupedByYearEntries = useMemo(() => {
    const map = new Map<string, Student[]>();
    filteredStudents.forEach(s => {
      const yr = s.intakeYear || (s.registrationDate ? new Date(s.registrationDate).getFullYear().toString() : '2025');
      if (!map.has(yr)) map.set(yr, []);
      map.get(yr)!.push(s);
    });
    return Array.from(map.entries()).sort((a, b) =>
      sortOrder === 'asc' ? a[0].localeCompare(b[0]) : b[0].localeCompare(a[0])
    );
  }, [filteredStudents, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleCreateOrUpdateStudent = async (data: any) => {
    try {
      if (editingStudent) {
        await updateStudent(editingStudent.id, data);
        success('Student Updated', `${data.fullName}'s profile was updated.`);
      } else {
        await createStudent(data);
        success('Student Registered', `${data.fullName} was enrolled in SKOLAR directory.`);
      }
      loadData();
    } catch (err: any) {
      error('Operation Failed', err.message);
      throw err;
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    if (!window.confirm(`Are you sure you want to permanently delete candidate ${student.fullName}?`)) return;
    try {
      await deleteStudent(student.id);
      success('Candidate Deleted', `${student.fullName} has been removed.`);
      loadData();
    } catch (err: any) {
      error('Delete Failed', err.message);
    }
  };

  const handleOpenDetail = (s: Student) => {
    setViewingStudent(s);
    setDetailModalOpen(true);
  };

  const handleOpenEdit = (s: Student) => {
    setEditingStudent(s);
    setFormModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy-950 tracking-tight">Central Student Directory</h2>
          <p className="text-xs text-slate-500">
            {students.length} registered candidates across all destinations & acquisition channels
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant={groupByYear ? 'gold' : 'outline'}
            size="sm"
            onClick={() => setGroupByYear(!groupByYear)}
            icon={groupByYear ? <List className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
          >
            {groupByYear ? 'Unified Table' : 'Group Year-Wise'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadData(true)}
            loading={loading}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>

          {canCreate && (
            <Button
              variant="gold"
              size="sm"
              onClick={() => {
                setEditingStudent(null);
                setFormModalOpen(true);
              }}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Student
            </Button>
          )}
        </div>
      </div>

      {/* TOP-SIDE INTAKE YEAR SELECTOR BUTTONS */}
      <div className="p-3 bg-white rounded-2xl border border-slate-200/90 shadow-soft">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-bold text-navy-950 uppercase tracking-wider shrink-0 flex items-center gap-1.5 px-2">
            <Calendar className="w-4 h-4 text-gold-600" />
            Intake Year:
          </span>

          <button
            onClick={() => setSelectedYearFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedYearFilter === 'ALL'
                ? 'bg-navy-950 text-gold-400 shadow-sm ring-2 ring-gold-400/40'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            All Years ({students.length})
          </button>

          {availableYears.map(yr => {
            const count = yearCounts[yr] || 0;
            const isSelected = selectedYearFilter === yr;
            return (
              <button
                key={yr}
                onClick={() => setSelectedYearFilter(yr)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-gold-500 text-navy-950 shadow-sm ring-2 ring-gold-400'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <span>{yr}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-navy-950/20 text-navy-950' : 'bg-slate-200 text-slate-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by candidate name, email, phone, passport..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-navy-600 bg-slate-50/50"
            />
          </div>

          {/* Acquisition Channel Filter */}
          <div>
            <select
              value={acquisitionFilter}
              onChange={(e) => setAcquisitionFilter(e.target.value as any)}
              className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-navy-600 bg-white font-medium text-navy-950"
            >
              <option value="ALL">All Channels (B2B & B2C)</option>
              <option value="B2C">Direct Students (B2C)</option>
              <option value="B2B">Partner Referrals (B2B)</option>
            </select>
          </div>

          {/* Destination Country Filter */}
          <div>
            <select
              value={selectedCountryFilter}
              onChange={(e) => setSelectedCountryFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-navy-600 bg-white font-medium text-navy-950"
            >
              <option value="ALL">All Destinations</option>
              {countries.map((c) => (
                <option key={c.id} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* B2B Partner Filter (visible when B2B or All selected) */}
        {acquisitionFilter !== 'B2C' && partners.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-400 font-semibold shrink-0">Filter by Partner:</span>
            <select
              value={partnerFilter}
              onChange={(e) => setPartnerFilter(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 px-2.5 py-1 text-navy-950 bg-slate-50 focus:outline-none"
            >
              <option value="">All Partners & Creators</option>
              {partners.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.partnerType})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Students Data Display */}
      {filteredStudents.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="No Students Found"
          description={
            selectedYearFilter !== 'ALL'
              ? `No candidates registered under intake year ${selectedYearFilter}. Try selecting 'All Years' or register a new candidate.`
              : "No students matched your search and filter criteria. You can register a new student or clear filters."
          }
          actionText={canCreate ? "Register Candidate" : undefined}
          onAction={() => {
            setEditingStudent(null);
            setFormModalOpen(true);
          }}
        />
      ) : groupByYear ? (
        /* Year-Wise Segregated Directory View */
        <div className="space-y-6">
          {groupedByYearEntries.map(([year, groupStudents]) => (
            <div key={year} className="bg-white rounded-3xl border border-slate-200/90 shadow-soft overflow-hidden">
              <div className="px-5 py-3.5 bg-gradient-to-r from-navy-950 to-navy-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-xl bg-gold-400/20 text-gold-400">
                    <GraduationCap className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold tracking-tight">Intake Cohort {year}</h3>
                    <p className="text-[11px] text-slate-300">{groupStudents.length} registered candidate{groupStudents.length === 1 ? '' : 's'}</p>
                  </div>
                </div>
                <Badge variant="gold" size="sm">{year}</Badge>
              </div>

              <div className="divide-y divide-slate-100">
                {groupStudents.map((student) => {
                  const countryFlag = student.countryOfInterest === 'IT' ? '🇮🇹' : student.countryOfInterest === 'MN' ? '🇲🇳' : '🌐';
                  const countryName = student.countryOfInterest === 'IT' ? 'Italy' : student.countryOfInterest === 'MN' ? 'Mongolia' : student.countryOfInterest;
                  return (
                    <div
                      key={student.id}
                      onClick={() => handleOpenDetail(student)}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-navy-100 text-navy-900 font-bold flex items-center justify-center shrink-0">
                          {student.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-navy-950 text-sm">{student.fullName}</span>
                            <Badge variant={student.acquisitionType === 'B2B' ? 'gold' : 'blue'} size="sm">
                              {student.acquisitionType}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500">
                            {student.email} {student.phone ? `• ${student.phone}` : ''} • {countryFlag} {countryName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenDetail(student)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-navy-900 hover:bg-slate-100 transition-colors"
                          title="View Dossier"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => handleOpenEdit(student)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-gold-600 hover:bg-gold-50 transition-colors"
                            title="Edit Candidate"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteStudent(student)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th 
                    onClick={() => toggleSort('name')}
                    className="py-3.5 px-5 cursor-pointer hover:text-navy-950 select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Candidate</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    onClick={() => toggleSort('year')}
                    className="py-3.5 px-4 cursor-pointer hover:text-navy-950 select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Intake Year</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">Destination</th>
                  <th className="py-3.5 px-4">Channel & Source</th>
                  <th className="py-3.5 px-4">Academic Background</th>
                  <th 
                    onClick={() => toggleSort('date')}
                    className="py-3.5 px-4 cursor-pointer hover:text-navy-950 select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Registered</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => {
                  const countryFlag = student.countryOfInterest === 'IT' ? '🇮🇹' : student.countryOfInterest === 'MN' ? '🇲🇳' : '🌐';
                  const countryName = student.countryOfInterest === 'IT' ? 'Italy' : student.countryOfInterest === 'MN' ? 'Mongolia' : student.countryOfInterest;
                  const displayYear = student.intakeYear || (student.registrationDate ? new Date(student.registrationDate).getFullYear().toString() : '2025');

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => handleOpenDetail(student)}
                    >
                      {/* Name & Contact */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-navy-100 text-navy-900 font-bold flex items-center justify-center shrink-0">
                            {student.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-navy-950 text-sm group-hover:text-gold-600 transition-colors">
                                {student.fullName}
                              </span>
                              {student.isDemo && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wider">
                                  DEMO
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              {student.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Intake Year */}
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold bg-gold-50 text-gold-900 border border-gold-200/80 shadow-2xs">
                          🎓 {displayYear}
                        </span>
                      </td>

                      {/* Country */}
                      <td className="py-4 px-4 font-semibold text-navy-900">
                        <span className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-xl">
                          <span>{countryFlag}</span>
                          <span>{countryName}</span>
                        </span>
                      </td>

                      {/* Channel & Partner */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <Badge variant={student.acquisitionType === 'B2B' ? 'gold' : 'blue'} size="sm">
                            {student.acquisitionType}
                          </Badge>
                          {student.partnerName && (
                            <span className="text-slate-600 font-semibold truncate max-w-[140px]">
                              {student.partnerName}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{student.leadSource}</span>
                      </td>

                      {/* Academic */}
                      <td className="py-4 px-4 text-slate-600">
                        <span className="font-semibold block truncate max-w-[180px]">{student.schoolOrUniversity || student.previousEducation}</span>
                        <span className="text-[11px] text-slate-400">
                          {student.academicMarks} {student.neetScore ? `• NEET: ${student.neetScore}` : ''}
                        </span>
                      </td>

                      {/* Registered Date */}
                      <td className="py-4 px-4 text-slate-400 font-medium">
                        {new Date(student.registrationDate).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenDetail(student)}
                            title="View Dossier"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-navy-900 hover:bg-slate-100 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => handleOpenEdit(student)}
                              title="Edit Candidate"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-gold-600 hover:bg-gold-50 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteStudent(student)}
                              title="Delete Record"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Grid View */}
          <div className="lg:hidden divide-y divide-slate-100">
            {filteredStudents.map((student) => {
              const displayYear = student.intakeYear || (student.registrationDate ? new Date(student.registrationDate).getFullYear().toString() : '2025');
              return (
                <div
                  key={student.id}
                  onClick={() => handleOpenDetail(student)}
                  className="p-4 space-y-3 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-navy-950 text-sm">{student.fullName}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-gold-50 text-gold-900 border border-gold-200">
                        {displayYear}
                      </span>
                    </div>
                    <Badge variant={student.acquisitionType === 'B2B' ? 'gold' : 'blue'} size="sm">
                      {student.acquisitionType}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-500">
                    <p>{student.email} • {student.phone}</p>
                    <p className="mt-1 text-slate-400">Destination: {student.countryOfInterest} • {student.previousEducation}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <StudentFormModal
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingStudent(null);
        }}
        onSubmit={handleCreateOrUpdateStudent}
        initialData={editingStudent}
        partners={partners}
      />

      <StudentDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setViewingStudent(null);
        }}
        student={viewingStudent}
        onEditStudent={handleOpenEdit}
        onOpenCreateApplication={onOpenCreateApplication}
        onOpenCreateInvoice={onOpenCreateInvoice}
        onOpenRecordPayment={onOpenRecordPayment}
        onOpenRecordExpense={onOpenRecordExpense}
        onPreviewDocument={onPreviewDocument}
      />
    </div>
  );
};
