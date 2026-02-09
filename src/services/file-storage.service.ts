import { put, del, head } from '@vercel/blob';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

export interface FileUploadResult {
  url: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

export interface FileValidationError {
  field: string;
  reason: string;
}

/**
 * Validates file before upload
 */
export function validateFile(
  file: File
): FileValidationError | null {
  if (file.size > MAX_FILE_SIZE) {
    return {
      field: 'file',
      reason: `File size exceeds maximum of 10MB (received ${(file.size / 1024 / 1024).toFixed(2)}MB)`,
    };
  }

  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return {
      field: 'file',
      reason: `File type not allowed. Allowed types: PDF, images, Word, Excel, text, CSV`,
    };
  }

  return null;
}

/**
 * Uploads file to Vercel Blob Storage
 */
export async function uploadFile(
  file: File,
  requisitionId: string
): Promise<FileUploadResult> {
  const validation = validateFile(file);
  if (validation) {
    throw new Error(`Validation failed: ${validation.reason}`);
  }

  const fileName = `${requisitionId}/${Date.now()}-${file.name}`;
  
  const blob = await put(fileName, file, {
    access: 'public',
  });

  return {
    url: blob.url,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
  };
}

/**
 * Deletes file from Vercel Blob Storage
 */
export async function deleteFile(storageUrl: string): Promise<void> {
  await del(storageUrl);
}

/**
 * Gets file metadata from Vercel Blob Storage
 */
export async function getFileMetadata(storageUrl: string) {
  try {
    const metadata = await head(storageUrl);
    return metadata;
  } catch (error) {
    throw new Error(`Failed to get file metadata: ${error}`);
  }
}
