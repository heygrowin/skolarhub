import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
import { CreatableSelect } from '../common/CreatableSelect';
import { Student, ApplicationStatus } from '../../types';
import { useCountry } from '../../context/CountryContext';
import { useYear } from '../../context/YearContext';
import { useToast } from '../../context/ToastContext';

interface ApplicationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (appData: any) => Promise<void>;
  preselectedStudentId?: string;
  students: Student[];
}

const DEFAULT_COURSES = [
  'Single-Cycle Medicine & Surgery (English IMAT)',
  'MBBS / General Medicine (English Medium)',
  'MSc Computer Science & Engineering',
  'MSc Data Science & AI',
  'BSc Business Economics & Finance',
  'BSc Architecture & Urban Design',
  'MBBS / MD Clinical Medicine',
  'BSc Biotechnology & Pharmacy',
];

const DEFAULT_SESSIONS = [
  'Fall 2025',
  'Spring 2026',
  'Fall 2026',
  'Spring 2027',
  'Fall 2027',
];

const DEFAULT_STATUSES = [
  'New Enquiry',
  'Profile Review',
  'Documents Pending',
  'Application Preparation',
  'Application Submitted',
  'Awaiting University Response',
  'Admission Received',
  'Visa Process',
  'Completed',
];

export const ApplicationFormModal: React.FC<ApplicationFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  preselectedStudentId,
  students,
}) => {
  const { countries } = useCountry();
  const { years, selectedYearFilter } = useYear();
  const { error: toastError } = useToast();
  const [loading, setLoading] = useState<boolean>(false);

  const [studentId, setStudentId] = useState<string>('');
  const [countryCode, setCountryCode] = useState<string>('IT');
  const [intakeYear, setIntakeYear] = useState<string>('2026');
  const [university, setUniversity] = useState<string>('');
  const [course, setCourse] = useState<string>('');
  const [intake, setIntake] = useState<string>('Fall 2026');
  const [status, setStatus] = useState<string>('New Enquiry');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const targetId = preselectedStudentId || students[0]?.id || '';
      setStudentId(targetId);
      const matched = students.find(item => item.id === targetId);
      if (matched) {
        if (matched.countryOfInterest) setCountryCode(matched.countryOfInterest);
        setIntakeYear(
          matched.intakeYear || (selectedYearFilter !== 'ALL' ? selectedYearFilter : String(new Date().getFullYear()))
        );
      } else {
        setIntakeYear(selectedYearFilter !== 'ALL' ? selectedYearFilter : String(new Date().getFullYear()));
      }
      setUniversity('');
      setCourse('');
      setIntake('Fall 2026');
      setStatus('New Enquiry');
      setNotes('');
    }
  }, [isOpen, preselectedStudentId, students, selectedYearFilter]);

  const handleStudentChange = (nextId: string) => {
    setStudentId(nextId);
    const matched = students.find(s => s.id === nextId);
    if (matched) {
      if (matched.countryOfInterest) setCountryCode(matched.countryOfInterest);
      if (matched.intakeYear) setIntakeYear(matched.intakeYear);
    }
  };

  // Selected country universities & stages
  const selectedCountry = countries.find(c => c.code === countryCode);
  const universitiesList = selectedCountry?.settings?.universities || [];
  const stageOptions = selectedCountry?.settings?.applicationStages?.length
    ? selectedCountry.settings.applicationStages
    : DEFAULT_STATUSES;

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
        intakeYear: intakeYear || String(new Date().getFullYear()),
        university: university.trim(),
        course: course.trim(),
        intake: intake.trim() || `Fall ${intakeYear}`,
        status: (status || 'New Enquiry') as ApplicationStatus,
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Select
              label="Select Candidate *"
              value={studentId}
              onChange={(e) => handleStudentChange(e.target.value)}
              required
              options={[
                { value: '', label: '-- Select Student --' },
                ...students.map(s => ({
                  value: s.id,
                  label: `${s.fullName} (${s.countryOfInterest}${s.intakeYear ? ` • ${s.intakeYear}` : ''})`
                }))
              ]}
            />
          </div>

          <CreatableSelect
            label="Intake Year *"
            categoryKey="intake_years"
            value={intakeYear}
            onChange={(val) => setIntakeYear(val)}
            options={years}
            placeholder="Select or add year..."
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Destination Country *"
            value={countryCode}
            onChange={(e) => {
              setCountryCode(e.target.value);
              setUniversity('');
            }}
            required
            options={countries.map(c => ({ value: c.code, label: `${c.flag} ${c.name}` }))}
          />

          <CreatableSelect
            label="University *"
            categoryKey={`universities_${countryCode}`}
            value={university}
            onChange={(val) => setUniversity(val)}
            options={universitiesList}
            placeholder="Tap to pick or type new university..."
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CreatableSelect
            label="Course / Degree Program *"
            categoryKey="courses"
            value={course}
            onChange={(val) => setCourse(val)}
            options={DEFAULT_COURSES}
            placeholder="Select or type new course..."
            required
          />

          <CreatableSelect
            label="Intake Session"
            categoryKey="intake_sessions"
            value={intake}
            onChange={(val) => setIntake(val)}
            options={DEFAULT_SESSIONS}
            placeholder="e.g. Fall 2026..."
          />
        </div>

        <CreatableSelect
          label="Initial Application Stage"
          categoryKey="application_statuses"
          value={status}
          onChange={(val) => setStatus(val)}
          options={stageOptions}
          placeholder="Select or add stage..."
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
