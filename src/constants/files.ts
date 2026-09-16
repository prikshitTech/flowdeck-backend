export const ALLOWED_UPLOAD_TYPES = new Set<string>([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/zip',
  'application/json',
  'text/plain',
  'text/csv',
  'text/markdown',
  'video/mp4'
]);

export const FILE_MESSAGES = {
  UPLOADED: 'File uploaded successfully',
  DELETED: 'File deleted successfully',
  NOT_FOUND: 'File not found',
  FILE_REQUIRED: 'A file is required under the "file" field',
  MULTIPART_REQUIRED: 'Uploads must be sent as multipart/form-data',
  TYPE_NOT_ALLOWED: 'This file type is not accepted',
  TOO_LARGE: 'The uploaded file exceeds the maximum allowed size',
  NOT_OWNER: 'Only the uploader or a workspace admin can delete this file'
} as const;
