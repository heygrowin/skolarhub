import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
import { Student, DocumentCategory } from '../../types';
import { uploadDocumentFile } from '../../lib/storageService';
import { createDocumentRecord } from '../../services/documentService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Upload, FileText, CheckCircle2 } from 'lucide-react';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  students: Student[];
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  students,
}) => {
  const { userProfile } = useAuth();
  const { success, error } = useToast();

  const [studentId, setStudentId] = useState<string>('');
  const [category, setCategory] = useState<DocumentCategory>('Passport');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !studentId) return;

    setUploading(true);
    setUploadProgress(10);
    try {
      const student = students.find(s => s.id === studentId);

      const uploadRes = await uploadDocumentFile(
        selectedFile,
        `students/${studentId}`,
        (progress) => setUploadProgress(progress)
      );

      await createDocumentRecord({
        name: selectedFile.name,
        studentId,
        studentName: student?.fullName || 'Student',
        countryCode: student?.countryOfInterest || 'IT',
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
      onSuccess();
      onClose();
    } catch (err: any) {
      error('Upload Failed', err?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setSelectedFile(null);
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
            disabled={!selectedFile || !studentId}
          >
            {uploading ? `Uploading ${uploadProgress}%` : 'Upload to Cloud'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Associate Candidate *"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          required
          options={[
            { value: '', label: '-- Select Candidate --' },
            ...students.map(s => ({ value: s.id, label: `${s.fullName} (${s.email})` }))
          ]}
        />

        <Select
          label="Document Category *"
          value={category}
          onChange={(e) => setCategory(e.target.value as DocumentCategory)}
          options={[
            { value: 'Passport', label: 'Valid Passport' },
            { value: 'Academic Transcripts', label: 'Academic Marksheets / Transcripts' },
            { value: 'Language Certificate', label: 'Language Certificate (IELTS/TOEFL/C1)' },
            { value: 'Visa', label: 'Visa Application Dossier' },
            { value: 'Financial Document', label: 'Bank Statement / Solvency Proof' },
            { value: 'University Offer Letter', label: 'Official University Admission Letter' },
            { value: 'CV/Resume', label: 'CV / Academic Resume' },
            { value: 'Other', label: 'Other Educational Document' },
          ]}
        />

        {/* Drag & Drop File Input Zone */}
        <div>
          <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wider mb-1.5">
            Select Document File *
          </label>
          <div className="relative border-2 border-dashed border-slate-300 hover:border-gold-400 rounded-2xl p-6 text-center transition-colors bg-slate-50/50">
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              required
            />
            {selectedFile ? (
              <div className="flex flex-col items-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                <span className="text-xs font-bold text-navy-950">{selectedFile.name}</span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'Document'}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center text-slate-500">
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-xs font-bold text-navy-950">Click or drag file here to upload</span>
                <span className="text-[11px] text-slate-400 mt-0.5">PDF or High-Resolution Scans</span>
              </div>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};

