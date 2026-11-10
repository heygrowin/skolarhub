import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { storage, BLOB_READ_WRITE_TOKEN, waitForAuthReady } from "./firebase";

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
  'text/plain',
];

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

/**
 * Validates a file for upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: 'File size exceeds 15MB limit' };
  }
  const isAllowedExt = /\.(pdf|jpe?g|png|webp|docx?|txt)$/i.test(file.name);
  if (!ALLOWED_MIME_TYPES.includes(file.type) && !isAllowedExt) {
    return {
      valid: false,
      error: `Invalid file type (${file.type || 'unknown'}). Allowed: PDF, JPG, PNG, WEBP, DOCX`,
    };
  }
  return { valid: true };
}

/**
 * Converts a stored document URL into a browser-viewable URL.
 * Translates private Vercel Blob URLs cleanly through our /api/blob authenticated stream endpoint
 * so <img>, <iframe>, and Download links work without HTTP 403.
 */
export function getAccessibleDocumentUrl(rawUrl: string, download: boolean = false): string {
  if (!rawUrl) return '';
  if (rawUrl.includes('.private.blob.vercel-storage.com/')) {
    const cleanUrl = rawUrl.split('?')[0];
    return `/api/blob?url=${encodeURIComponent(cleanUrl)}${download ? '&download=1' : ''}`;
  }
  return rawUrl;
}

/**
 * Convert small file to Base64 Data URL (capped at 450KB to protect Firestore 1MB doc limit)
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Layer 1: Upload via XHR to /api/blob (Vite dev/preview proxy OR Vercel Serverless function)
 */
function uploadViaApiProxy(
  file: File,
  pathname: string,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/blob?pathname=${encodeURIComponent(pathname)}`, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const pct = Math.min(95, Math.max(15, Math.round((event.loaded / event.total) * 95)));
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (onProgress) onProgress(100);
          resolve({
            url: data.url,
            storagePath: data.pathname || pathname,
            fileSize: file.size,
            fileName: file.name,
            contentType: data.contentType || file.type || 'application/octet-stream',
          });
        } catch (parseErr) {
          reject(parseErr);
        }
      } else {
        reject(new Error(`Proxy upload returned ${xhr.status}: ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error reaching /api/blob proxy'));
    xhr.ontimeout = () => reject(new Error('Upload timed out'));
    xhr.timeout = 45000;
    xhr.send(file);
  });
}

/**
 * Layer 2: Direct REST PUT to Vercel Blob (when hosted statically without /api/blob)
 */
async function uploadDirectVercelBlobRest(
  file: File,
  pathname: string,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  if (onProgress) onProgress(45);
  const res = await fetch(`https://blob.vercel-storage.com/${encodeURI(pathname)}`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${BLOB_READ_WRITE_TOKEN}`,
      'x-api-version': '7',
      'x-vercel-blob-access': 'private',
      'x-content-type': file.type || 'application/octet-stream',
      'x-add-random-suffix': '1',
    },
    body: file,
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Direct Vercel Blob PUT failed (${res.status}): ${msg}`);
  }

  const data = await res.json();
  if (onProgress) onProgress(100);
  return {
    url: data.url,
    storagePath: data.pathname || pathname,
    fileSize: file.size,
    fileName: file.name,
    contentType: data.contentType || file.type || 'application/octet-stream',
  };
}

/**
 * Uploads a document to Vercel Blob (via proxy or direct REST), with Firebase Storage fallback.
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

  if (onProgress) onProgress(10);

  // 1. Primary: /api/blob proxy (works identically on localhost Vite & Vercel deployment)
  try {
    return await uploadViaApiProxy(file, storagePath, onProgress);
  } catch (proxyErr: any) {
    console.warn('API Blob proxy notice, trying direct Vercel Blob REST...', proxyErr?.message);
  }

  // 2. Secondary: Direct Vercel Blob REST PUT
  try {
    return await uploadDirectVercelBlobRest(file, storagePath, onProgress);
  } catch (directErr: any) {
    console.warn('Direct Vercel Blob REST notice, trying Firebase Storage...', directErr?.message);
  }

  // 3. Tertiary: Firebase Storage (fast 5s timeout)
  try {
    const authed = await waitForAuthReady();
    if (authed) {
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type || 'application/octet-stream',
        customMetadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
        },
      });

      const fbResult = await new Promise<UploadResult>((resolve, reject) => {
        const timeout = setTimeout(() => {
          try {
            uploadTask.cancel();
          } catch {}
          reject(new Error('Firebase Storage timed out'));
        }, 6000);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            if (onProgress) onProgress(pct);
          },
          (error) => {
            clearTimeout(timeout);
            reject(error);
          },
          async () => {
            clearTimeout(timeout);
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            if (onProgress) onProgress(100);
            resolve({
              url: downloadUrl,
              storagePath,
              fileSize: file.size,
              fileName: file.name,
              contentType: file.type || 'application/octet-stream',
            });
          }
        );
      });

      return fbResult;
    }
  } catch (fbErr: any) {
    console.warn('Firebase Storage fallback notice:', fbErr?.message || fbErr);
  }

  // 4. Compact local fallback only if file <= 450KB (prevents Firestore 1MB / LocalStorage quota crash)
  if (file.size <= 450 * 1024) {
    const dataUrl = await fileToDataUrl(file);
    if (onProgress) onProgress(100);
    return {
      url: dataUrl,
      storagePath,
      fileSize: file.size,
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
    };
  }

  throw new Error(
    'Unable to upload file over 450KB: Vercel Blob & Firebase Storage endpoints could not be reached. Please check your network or Firebase Storage settings.'
  );
}

/**
 * Delete a document from storage
 */
export async function deleteDocumentFile(urlOrPath: string): Promise<void> {
  if (!urlOrPath) return;

  if (urlOrPath.includes('.blob.vercel-storage.com')) {
    try {
      const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
      if (origin && origin.startsWith('http')) {
        await fetch(`${origin}/api/blob?url=${encodeURIComponent(urlOrPath.split('?')[0])}`, {
          method: 'DELETE',
        });
      }
    } catch (e) {
      console.debug('Blob delete notice:', e);
    }
    return;
  }

  if (!urlOrPath.startsWith('data:')) {
    try {
      const storageRef = ref(storage, urlOrPath);
      await deleteObject(storageRef);
    } catch (fbErr) {
      console.debug('Firebase storage delete notice:', fbErr);
    }
  }
}
