import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { storage, BLOB_READ_WRITE_TOKEN } from "./firebase";

export interface UploadProgressCallback {
  (progress: number): void;
}

export interface UploadResult {
  url: string;
  storagePath: string;
  fileSize: number;
  fileName: string;
  contentType: string;
}

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

/**
 * Validates a file for upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: 'File size exceeds 15MB limit' };
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: `Invalid file type (${file.type}). Allowed: PDF, JPG, PNG, WEBP, DOCX` };
  }
  return { valid: true };
}

/**
 * Uploads a document to Firebase Storage with a fallback to Vercel Blob if Firebase Storage fails.
 */
export async function uploadDocumentFile(
  file: File,
  folder: string = 'documents',
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const timestamp = Date.now();
  const storagePath = `${folder}/${timestamp}_${cleanFileName}`;

  try {
    // 1. Attempt upload to Firebase Storage
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });

    return await new Promise<UploadResult>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(Math.round(progress));
        },
        async (error) => {
          console.warn('Firebase Storage upload error, trying Vercel Blob fallback...', error);
          try {
            // Attempt Vercel Blob fallback
            const fallbackResult = await uploadToVercelBlob(file, storagePath, onProgress);
            resolve(fallbackResult);
          } catch (fallbackError) {
            reject(error);
          }
        },
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            url: downloadUrl,
            storagePath: storagePath,
            fileSize: file.size,
            fileName: file.name,
            contentType: file.type,
          });
        }
      );
    });
  } catch (err) {
    console.warn('Direct upload error, falling back to Vercel Blob...', err);
    return await uploadToVercelBlob(file, storagePath, onProgress);
  }
}

/**
 * Upload fallback using Vercel Blob REST API
 */
async function uploadToVercelBlob(
  file: File,
  pathname: string,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  if (onProgress) onProgress(30);

  const response = await fetch(`https://blob.vercel-storage.com/${pathname}`, {
    method: 'PUT',
    headers: {
      'authorization': `Bearer ${BLOB_READ_WRITE_TOKEN}`,
      'x-content-type': file.type,
      'x-add-random-suffix': 'false',
    },
    body: file,
  });

  if (onProgress) onProgress(90);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Blob upload failed: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  if (onProgress) onProgress(100);

  return {
    url: data.url,
    storagePath: pathname,
    fileSize: file.size,
    fileName: file.name,
    contentType: file.type,
  };
}

/**
 * Delete a document from storage
 */
export async function deleteDocumentFile(storagePath: string): Promise<void> {
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (error) {
    console.warn('Failed to delete file from Firebase Storage (it may have been stored in Blob):', error);
  }
}

