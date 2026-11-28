import { HttpError } from '../../shared/errors/httpError.js';
import { withGoogle } from './google.client.js';

export const GOOGLE_DOC_MIME = 'application/vnd.google-apps.document';
export const GOOGLE_FOLDER_MIME = 'application/vnd.google-apps.folder';
export const MAX_EXPORT_BYTES = 10 * 1024 * 1024;

export type AccessRole = 'writer' | 'commenter' | 'reader';
export interface AccessEntry {
  email: string;
  role: AccessRole;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType?: string;
  webViewLink?: string;
  headRevisionId?: string;
  modifiedTime?: string;
  parents?: string[];
}

const FILE_FIELDS = 'id,name,mimeType,webViewLink,headRevisionId,modifiedTime,parents';

/** Extracts the file id from a docs.google.com / drive.google.com URL (or accepts a bare id). */
export function parseDocId(url: string): string | null {
  const trimmed = url.trim();
  const match = /\/(?:document|file|spreadsheets|presentation)\/(?:u\/\d+\/)?d\/([A-Za-z0-9_-]{10,})/.exec(trimmed);
  if (match) return match[1];
  const idParam = /[?&]id=([A-Za-z0-9_-]{10,})/.exec(trimmed);
  if (idParam) return idParam[1];
  if (/^[A-Za-z0-9_-]{25,}$/.test(trimmed)) return trimmed;
  return null;
}

function escapeQuery(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export function getFile(fileId: string): Promise<DriveFile> {
  return withGoogle(async ({ drive }) => {
    const { data } = await drive.files.get({ fileId, fields: FILE_FIELDS, supportsAllDrives: true });
    return data as DriveFile;
  });
}

export function copyFile(fileId: string, name: string): Promise<DriveFile> {
  return withGoogle(async ({ drive }) => {
    const { data } = await drive.files.copy({ fileId, requestBody: { name }, fields: FILE_FIELDS, supportsAllDrives: true });
    return data as DriveFile;
  });
}

export function createBlankDoc(name: string, parentId?: string): Promise<DriveFile> {
  return withGoogle(async ({ drive }) => {
    const { data } = await drive.files.create({
      requestBody: { name, mimeType: GOOGLE_DOC_MIME, ...(parentId ? { parents: [parentId] } : {}) },
      fields: FILE_FIELDS,
      supportsAllDrives: true
    });
    return data as DriveFile;
  });
}

export function renameFile(fileId: string, name: string): Promise<DriveFile> {
  return withGoogle(async ({ drive }) => {
    const { data } = await drive.files.update({ fileId, requestBody: { name }, fields: FILE_FIELDS, supportsAllDrives: true });
    return data as DriveFile;
  });
}

/** Finds a folder by name under `parentId` (or the Drive root), creating it if missing. Returns the folder id. */
export function ensureFolder(name: string, parentId?: string): Promise<string> {
  return withGoogle(async ({ drive }) => {
    const q = [
      `mimeType='${GOOGLE_FOLDER_MIME}'`,
      `name='${escapeQuery(name)}'`,
      'trashed=false',
      parentId ? `'${escapeQuery(parentId)}' in parents` : "'root' in parents"
    ].join(' and ');
    const { data } = await drive.files.list({ q, fields: 'files(id)', pageSize: 1, supportsAllDrives: true, includeItemsFromAllDrives: true });
    const existing = data.files?.[0]?.id;
    if (existing) return existing;
    const created = await drive.files.create({
      requestBody: { name, mimeType: GOOGLE_FOLDER_MIME, ...(parentId ? { parents: [parentId] } : {}) },
      fields: 'id',
      supportsAllDrives: true
    });
    if (!created.data.id) throw new HttpError(502, 'Google did not return a folder id');
    return created.data.id;
  });
}

export function moveToFolder(fileId: string, folderId: string): Promise<void> {
  return withGoogle(async ({ drive }) => {
    const { data } = await drive.files.get({ fileId, fields: 'parents', supportsAllDrives: true });
    const previous = (data.parents ?? []).join(',');
    await drive.files.update({
      fileId,
      addParents: folderId,
      ...(previous ? { removeParents: previous } : {}),
      fields: 'id',
      supportsAllDrives: true
    });
  });
}

/** Makes the file's non-owner permissions match `entries` (create/update/delete); no notification emails. */
export function setAccess(fileId: string, entries: AccessEntry[]): Promise<{ email: string; role: AccessRole; permissionId: string }[]> {
  return withGoogle(async ({ drive }) => {
    const { data } = await drive.permissions.list({
      fileId,
      fields: 'permissions(id,type,role,emailAddress)',
      supportsAllDrives: true
    });
    const current = (data.permissions ?? []).filter((permission) => permission.type === 'user' && permission.role !== 'owner');
    const byEmail = new Map(current.map((permission) => [permission.emailAddress?.toLowerCase() ?? '', permission]));
    const wanted = new Map(entries.map((entry) => [entry.email.toLowerCase(), entry]));
    const result: { email: string; role: AccessRole; permissionId: string }[] = [];

    for (const [email, entry] of wanted) {
      const existing = byEmail.get(email);
      if (!existing) {
        const created = await drive.permissions.create({
          fileId,
          sendNotificationEmail: false,
          requestBody: { type: 'user', role: entry.role, emailAddress: entry.email },
          fields: 'id',
          supportsAllDrives: true
        });
        result.push({ email: entry.email, role: entry.role, permissionId: created.data.id ?? '' });
      } else {
        if (existing.role !== entry.role) {
          await drive.permissions.update({ fileId, permissionId: existing.id!, requestBody: { role: entry.role }, supportsAllDrives: true });
        }
        result.push({ email: entry.email, role: entry.role, permissionId: existing.id ?? '' });
      }
    }
    for (const [email, permission] of byEmail) {
      if (!wanted.has(email) && permission.id) {
        await drive.permissions.delete({ fileId, permissionId: permission.id, supportsAllDrives: true });
      }
    }
    return result;
  });
}

/** Locks (read-only for everyone) or unlocks the doc, and restricts re-sharing/copying. */
export function setLocked(fileId: string, locked: boolean): Promise<void> {
  return withGoogle(async ({ drive }) => {
    await drive.files.update({
      fileId,
      requestBody: {
        contentRestrictions: [locked ? { readOnly: true, reason: 'Sent to client' } : { readOnly: false }],
        writersCanShare: false,
        copyRequiresWriterPermission: true
      },
      supportsAllDrives: true
    });
  });
}

export function exportPdf(fileId: string): Promise<Buffer> {
  return withGoogle(async ({ drive }) => {
    try {
      const { data } = await drive.files.export({ fileId, mimeType: 'application/pdf' }, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(data as unknown as ArrayBuffer);
      if (buffer.length > MAX_EXPORT_BYTES) {
        throw new HttpError(413, 'PDF is over Google\'s 10 MB export limit. Download it from Google Docs (File > Download) instead');
      }
      return buffer;
    } catch (error) {
      const message = (error as { message?: string }).message ?? '';
      if (/exportSizeLimitExceeded|too large/i.test(message)) {
        throw new HttpError(413, 'PDF is over Google\'s 10 MB export limit. Download it from Google Docs (File > Download) instead');
      }
      throw error;
    }
  });
}

export function trashFile(fileId: string): Promise<void> {
  return withGoogle(async ({ drive }) => {
    await drive.files.update({ fileId, requestBody: { trashed: true }, supportsAllDrives: true });
  });
}
