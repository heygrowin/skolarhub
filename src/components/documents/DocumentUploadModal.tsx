import React, { useState, useRef } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
import { CreatableSelect } from '../common/CreatableSelect';
import { Student, DocumentCategory } from '../../types';
import { uploadDocumentFile } from '../../lib/storageService';
import { createDocumentRecord } from '../../services/documentService';
import { useAuth } from '../../context/AuthContext';
import { useYear } from '../../context/YearContext';
import { useToast } from '../../context/ToastContext';
import { Upload, CheckCircle2 } from 'lucide-react';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  students: Student[];
}

const DEFAULT_DOC_CATEGORIES = [
  'Passport',
  'Academic Transcripts',
  'NEET Scorecard',
  'Language Certificate',
  'CIMEA / DOV Statement',
  'Universitaly Pre-Enrolment',
  'Visa Dossier',
  'Financial Document',
  'University Offer Letter',
  'CV/Resume',
  'Other',
];

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  students,
}) => {
  const { userProfile } = useAuth();
  const { years, selectedYearFilter } = useYear();
  const { success, error } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [studentId, setStudentId] = useState<string>('general');
  const [intakeYear, setIntakeYear] = useState<string>('2026');
  const [category, setCategory] = useState<DocumentCategory>('Passport');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  React.useEffect(() => {
    if (isOpen) {
      const targetId = students.length > 0 ? students[0].id : 'general';
      setStudentId(targetId);
      const matched = students.find(s => s.id === targetId);
      setIntakeYear(
        matched?.intakeYear || (selectedYearFilter !== 'ALL' ? selectedYearFilter : String(new Date().getFullYear()))
      );
      setSelectedFile(null);
      setUploadProgress(0);
    }
  }, [isOpen, students, selectedYearFilter]);

  const handleStudentChange = (nextId: string) => {
    setStudentId(nextId);
    const matched = students.find(s => s.id === nextId);
    if (matched?.intakeYear) setIntakeYear(matched.intakeYear);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      error('File Required', 'Please select a file before uploading.');
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    try {
      const isGeneral = !studentId || studentId === 'general';
      const student = isGeneral ? null : students.find(s => s.id === studentId);

      const folderPath = isGeneral ? 'compliance/general' : `students/${studentId}`;

      const uploadRes = await uploadDocumentFile(
        selectedFile,
        folderPath,
        (progress) => setUploadProgress(progress)
      );

      await createDocumentRecord({
        name: selectedFile.name,
        studentId: isGeneral ? 'general_compliance' : studentId,
        studentName: isGeneral ? 'General Compliance / Institutional' : (student?.fullName || 'Student'),
        countryCode: student?.countryOfInterest || 'IT',
        intakeYear: intakeYear || String(new Date().getFullYear()),
        category,
        uploadedBy: userProfile?.uid || 'user',
        uploadedByName: userProfile?.displayName || 'Counsellor',
        uploadDate: new Date().toISOString(),
        storagePath: uploadRes.storagePath,
        fileUrl: uploadRes.url,
        fileSize: uploadRes.fileSize,
        fileType: uploadRes.contentType,
        reviewStatus: 'Pending',
      });

      success('Document Uploaded', `${selectedFile.name} securely archived.`);
      setSelectedFile(null);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Upload modal failure:', err);
      error('Upload Failed', err?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Compliance Document"
      subtitle="Supported formats: PDF, JPG, PNG, WEBP, DOCX (Max 15MB)"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <Button
            variant="gold"
            onClick={handleSubmit}
            loading={uploading}
            disabled={!selectedFile}
          >
            {uploading ? `Uploading ${uploadProgress}%` : 'Upload to Cloud'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Associate Candidate / Scope"
          value={studentId}
          onChange={(e) => handleStudentChange(e.target.value)}
          options={[
            { value: 'general', label: '📁 General Compliance / Institutional Vault' },
            ...students.map(s => ({
              value: s.id,
              label: `👤 ${s.fullName} (${s.countryOfInterest}${s.intakeYear ? ` • ${s.intakeYear}` : ''})`
            }))
          ]}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CreatableSelect
            label="Document Category *"
            categoryKey="document_categories"
            value={category}
            onChange={(val) => setCategory(val)}
            options={DEFAULT_DOC_CATEGORIES}
            placeholder="Select or create category..."
            required
          />

          <CreatableSelect
            label="Intake Year *"
            categoryKey="intake_years"
            value={intakeYear}
            onChange={(val) => setIntakeYear(val)}
            options={years}
            placeholder="Select year..."
          />
        </div>

        {/* Interactive Click & Drag File Zone */}
        <div>
          <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wider mb-1.5">
            Select Document File *
          </label>
          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (!uploading && e.dataTransfer.files?.[0]) {
                setSelectedFile(e.dataTransfer.files[0]);
              }
            }}
            className="relative border-2 border-dashed border-slate-300 hover:border-gold-400 rounded-2xl p-6 text-center transition-colors bg-slate-50/50 cursor-pointer"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            {selectedFile ? (
              <div className="flex flex-col items-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                <span className="text-xs font-bold text-navy-950 break-all">{selectedFile.name}</span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'Document'}
                </span>
                <span className="text-[10px] text-gold-600 font-semibold mt-1">Click to replace file</span>
              </div>
            ) : (
              <div className="flex flex-col items-center text-slate-500">
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-xs font-bold text-navy-950">Click or drop file here to upload</span>
                <span className="text-[11px] text-slate-400 mt-0.5">PDF, Passports, Certificates, DOCX (Max 15MB)</span>
              </div>
            )}
          </div>
          {uploading && (
            <div className="mt-2 space-y-1">
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 text-right">{uploadProgress}% uploaded</p>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
};
