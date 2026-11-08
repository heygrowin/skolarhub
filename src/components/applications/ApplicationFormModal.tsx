import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Student, Country, ApplicationStatus } from '../../types';
import { useCountry } from '../../context/CountryContext';
import { useToast } from '../../context/ToastContext';

interface ApplicationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (appData: any) => Promise<void>;
  preselectedStudentId?: string;
  students: Student[];
}

export const ApplicationFormModal: React.FC<ApplicationFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  preselectedStudentId,
  students,
}) => {
  const { countries } = useCountry();
  const { error: toastError } = useToast();
  const [loading, setLoading] = useState<boolean>(false);

  const [studentId, setStudentId] = useState<string>('');
  const [countryCode, setCountryCode] = useState<string>('IT');
  const [university, setUniversity] = useState<string>('');
  const [course, setCourse] = useState<string>('');
  const [intake, setIntake] = useState<string>('Fall 2026');
  const [status, setStatus] = useState<ApplicationStatus>('New Enquiry');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (preselectedStudentId) {
      setStudentId(preselectedStudentId);
      const s = students.find(item => item.id === preselectedStudentId);
      if (s?.countryOfInterest) {
        setCountryCode(s.countryOfInterest);
      }
    } else if (students.length > 0 && !studentId) {
      setStudentId(students[0].id);
    }
  }, [preselectedStudentId, students, studentId]);

  // Selected country universities
  const selectedCountry = countries.find(c => c.code === countryCode);
  const universitiesList = selectedCountry?.settings?.universities || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !university || !course) {
      toastError('Required Fields', 'Candidate, University, and Course are required.');
      return;
    }

    setLoading(true);
    try {
      const selectedStudent = students.find(s => s.id === studentId);

      const payload: any = {
        studentId,
        studentName: selectedStudent?.fullName || 'Student',
        countryId: selectedCountry?.id || `country_${countryCode}`,
        countryCode,
        countryName: selectedCountry?.name || countryCode,
        university: university.trim(),
        course: course.trim(),
        intake: intake.trim() || 'Fall 2026',
        status: status || 'New Enquiry',
        notes: notes.trim() || '',
      };

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      console.error("ApplicationFormModal error:", err);
      toastError('Save Error', err?.message || 'Failed to create application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create University Application"
      subtitle="Open a new admission dossier for a candidate"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="gold" onClick={handleSubmit} loading={loading}>
            Create Application
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Student Selection */}
        <Select
          label="Select Candidate *"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          required
          options={[
            { value: '', label: '-- Select Student --' },
            ...students.map(s => ({
              value: s.id,
              label: `${s.fullName} (${s.email}) - Destination: ${s.countryOfInterest}`
            }))
          ]}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Destination Country *"
            value={countryCode}
            onChange={(e) => {
              setCountryCode(e.target.value);
              setUniversity(''); // reset university
            }}
            required
            options={countries.map(c => ({ value: c.code, label: `${c.flag} ${c.name}` }))}
          />

          <div>
            <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wider mb-1.5">
              University *
            </label>
            {universitiesList.length > 0 ? (
              <div className="space-y-1.5">
                <select
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-navy-950 focus:outline-none focus:ring-2 focus:ring-navy-600 bg-white"
                >
                  <option value="">-- Select from Partner Universities --</option>
                  {universitiesList.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                  <option value="__other">Custom University...</option>
                </select>
                {university === '__other' && (
                  <Input
                    placeholder="Enter Custom University Name"
                    onChange={(e) => setUniversity(e.target.value)}
                    required
                  />
                )}
              </div>
            ) : (
              <Input
                placeholder="e.g. Sapienza Università di Roma"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                required
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Course / Degree Program *"
            placeholder="e.g. Single-Cycle Medicine & Surgery (English)"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            required
          />

          <Input
            label="Intake Session"
            placeholder="e.g. Fall 2026"
            value={intake}
            onChange={(e) => setIntake(e.target.value)}
          />
        </div>

        <Select
          label="Initial Application Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
          options={[
            { value: 'New Enquiry', label: 'New Enquiry' },
            { value: 'Profile Review', label: 'Profile Review' },
            { value: 'Documents Pending', label: 'Documents Pending' },
            { value: 'Application Preparation', label: 'Application Preparation' },
            { value: 'Application Submitted', label: 'Application Submitted' },
            { value: 'Awaiting University Response', label: 'Awaiting University Response' },
            { value: 'Admission Received', label: 'Admission Received' },
            { value: 'Visa Process', label: 'Visa Process' },
          ]}
        />

        <div>
          <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wider mb-1.5">
            Application Notes
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Specific entrance exam dates, admission requirements, deadline notes..."
            className="w-full rounded-xl border border-slate-300 p-3 text-xs text-navy-950 focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20 focus:outline-none"
          />
        </div>
      </form>
    </Modal>
  );
};

