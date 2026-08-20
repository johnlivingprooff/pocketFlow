import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { getDriveAccessToken, DriveAuthError } from './driveAuth';
import {
  getDriveBackupFolderId,
  setDriveBackupFolderId,
  clearDriveBackupFolderId,
  getDrivePassphrase,
  setDrivePassphrase,
  clearDrivePassphrase,
  clearDriveTokens,
} from './driveTokenStorage';
import {
  encryptBackupJson,
  decryptBackupJson,
  encryptedPayloadToJson,
  EncryptedBackupPayload,
} from '../../export/backupEncryption';
import { createBackup, restoreFromBackup } from '../../export/backupRestore';
import { log, error } from '../../../utils/logger';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';
const BACKUP_FOLDER_NAME = 'pocketFlowBackups';
const BACKUP_FILE_PREFIX = 'pocketFlow_backup_';
export const MAX_REMOTE_BACKUPS = 20;

export const DRIVE_ERR_NO_PASSPHRASE = 'drive_no_passphrase';

export class DriveBackupError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'DriveBackupError';
    this.code = code;
  }
}

export interface DriveRemoteFile {
  id: string;
  name: string;
  size: number | null;
  createdTime: string | null;
  modifiedTime: string | null;
}

export interface DriveUploadResult {
  id: string;
  name: string;
}

export type DriveBackupProgressStage = 'creating' | 'uploading';
export type DriveBackupProgressCallback = (stage: DriveBackupProgressStage, percent: number) => void;

async function driveRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<{ status: number; body: T | null }> {
  const token = await getDriveAccessToken();
  const res = await fetch(`${DRIVE_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    const message =
      typeof body === 'object' && body !== null && 'error' in body
        ? ((body as { error: { message?: string } }).error?.message ?? `HTTP ${res.status}`)
        : `HTTP ${res.status}`;
    throw new DriveBackupError(`drive_http_${res.status}`, message);
  }
  return { status: res.status, body: body as T | null };
}

/**
 * Finds (or creates) the dedicated backup folder in the user's Drive.
 * The folder id is cached in SecureStore.
 */
async function ensureBackupFolder(): Promise<string> {
  const cached = await getDriveBackupFolderId();
  if (cached) return cached;

  const q = `name='${BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const { body } = await driveRequest<{ files?: { id: string }[] }>(
    `/files?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive&pageSize=10`
  );
  const existing = body?.files?.[0]?.id;
  if (existing) {
    await setDriveBackupFolderId(existing);
    return existing;
  }

  const { body: created } = await driveRequest<{ id: string }>('/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: BACKUP_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'pocketFlow encrypted backups',
    }),
  });
  if (!created?.id) {
    throw new DriveBackupError('drive_folder_create_failed', 'Could not create backup folder.');
  }
  await setDriveBackupFolderId(created.id);
  return created.id;
}

/**
 * Uploads a local file to the Drive backup folder using the resumable protocol.
 */
export async function uploadDriveBackupFile(
  fileUri: string,
  fileName: string,
  onProgress?: DriveBackupProgressCallback
): Promise<DriveUploadResult> {
  if (Platform.OS === 'web') {
    throw new DriveBackupError('drive_unsupported_platform', 'Drive uploads are not supported on web.');
  }
  const token = await getDriveAccessToken();
  const folderId = await ensureBackupFolder();
  const info = await FileSystem.getInfoAsync(fileUri);
  if (!info.exists || typeof info.size !== 'number') {
    throw new DriveBackupError('drive_file_missing', 'Backup file not found on device.');
  }

  // 1. Initialize resumable session with JSON metadata.
  const initRes = await fetch(
    `${DRIVE_UPLOAD_BASE}/files?uploadType=resumable`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': 'application/json',
        'X-Upload-Content-Length': String(info.size),
      },
      body: JSON.stringify({
        name: fileName,
        parents: [folderId],
        mimeType: 'application/json',
        description: 'pocketFlow encrypted backup (AES-256-CBC + HMAC-SHA256)',
      }),
    }
  );
  if (!initRes.ok) {
    let detail = `HTTP ${initRes.status}`;
    try {
      const body = (await initRes.json()) as { error?: { message?: string } };
      detail = body.error?.message ?? detail;
    } catch {
      // keep default detail
    }
    throw new DriveBackupError(`drive_http_${initRes.status}`, `Upload failed: ${detail}`);
  }
  const sessionUri = initRes.headers.get('Location');
  if (!sessionUri) {
    throw new DriveBackupError('drive_upload_init_failed', 'Google did not return an upload session.');
  }

  // 2. Stream the raw file bytes to the session.
  onProgress?.('uploading', 0);
  const task = FileSystem.createUploadTask(
    sessionUri,
    fileUri,
    {
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { Authorization: `Bearer ${token}` },
    },
    (data) => {
      const total = data.totalBytesExpectedToSend;
      const pct = total > 0 ? Math.round((data.totalBytesSent / total) * 100) : 0;
      onProgress?.('uploading', Math.min(100, Math.max(0, pct)));
    }
  );
  const uploadResult = await task.uploadAsync();
  if (!uploadResult) {
    throw new DriveBackupError('drive_upload_failed', 'Upload failed (no response).');
  }
  if (uploadResult.status < 200 || uploadResult.status >= 300) {
    throw new DriveBackupError(
      `drive_http_${uploadResult.status}`,
      `Upload failed with HTTP ${uploadResult.status}`
    );
  }
  const body = uploadResult.body ? JSON.parse(uploadResult.body) as { id?: string; name?: string } : {};
  const id = body.id ?? '';
  const name = body.name ?? fileName;
  onProgress?.('uploading', 100);
  log('[Drive] Uploaded backup', { id, name });
  return { id, name };
}

/**
 * Lists remote backups (newest first).
 */
export async function listDriveBackups(): Promise<DriveRemoteFile[]> {
  const folderId = await ensureBackupFolder();
  const q = `'${folderId}' in parents and name contains '${BACKUP_FILE_PREFIX}' and trashed=false`;
  const { body } = await driveRequest<{
    files?: { id: string; name: string; size: string | null; createdTime: string | null; modifiedTime: string | null }[];
  }>(
    `/files?q=${encodeURIComponent(q)}&fields=files(id,name,size,createdTime,modifiedTime)&orderBy=createdTime desc&pageSize=100`
  );
  return (body?.files ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    size: f.size ? parseInt(f.size, 10) : null,
    createdTime: f.createdTime,
    modifiedTime: f.modifiedTime,
  }));
}

/**
 * Downloads a remote backup file to a local cache directory.
 * Returns the local file URI.
 */
export async function downloadDriveBackupFile(
  fileId: string,
  fileName: string
): Promise<string> {
  if (Platform.OS === 'web') {
    throw new DriveBackupError('drive_unsupported_platform', 'Drive downloads are not supported on web.');
  }
  const token = await getDriveAccessToken();
  const dir = `${FileSystem.cacheDirectory}drive_downloads/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => undefined);
  const destUri = `${dir}${fileName}`;
  const res = await FileSystem.downloadAsync(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, destUri, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status < 200 || res.status >= 300) {
    throw new DriveBackupError(`drive_http_${res.status}`, `Download failed with HTTP ${res.status}`);
  }
  return res.uri;
}

/**
 * Deletes a remote backup file.
 */
export async function deleteDriveBackup(fileId: string): Promise<void> {
  await driveRequest<void>(`/files/${fileId}`, { method: 'DELETE' });
}

/**
 * Prunes old remote backups beyond MAX_REMOTE_BACKUPS (newest kept).
 */
export async function pruneDriveBackups(): Promise<void> {
  try {
    const files = await listDriveBackups();
    const toDelete = files.slice(MAX_REMOTE_BACKUPS);
    for (const file of toDelete) {
      try {
        await deleteDriveBackup(file.id);
      } catch (e) {
        error('[Drive] Failed to prune backup', { id: file.id, message: e instanceof Error ? e.message : String(e) });
      }
    }
    if (toDelete.length > 0) {
      log('[Drive] Pruned old backups', { count: toDelete.length });
    }
  } catch (e) {
    error('[Drive] Prune failed', { message: e instanceof Error ? e.message : String(e) });
  }
}

/**
 * Creates a fresh backup of the app database, encrypts it, and uploads it to Drive.
 */
export async function createAndUploadDriveBackup(
  onProgress?: DriveBackupProgressCallback
): Promise<DriveUploadResult> {
  const passphrase = await getDrivePassphrase();
  if (!passphrase) {
    throw new DriveBackupError(
      DRIVE_ERR_NO_PASSPHRASE,
      'Set a backup passphrase first. It protects your data and is required to restore it.'
    );
  }
  onProgress?.('creating', 5);
  const local = await createBackup();
  if (!local.success || !local.uri) {
    throw new DriveBackupError('drive_local_backup_failed', local.error || 'Could not create local backup.');
  }
  onProgress?.('creating', 30);
  const remote = await uploadExistingBackupToDrive(local.uri, passphrase, onProgress);
  await pruneDriveBackups();
  onProgress?.('uploading', 100);
  return remote;
}

/**
 * Reads an existing local backup file, encrypts it, and uploads it.
 */
export async function uploadExistingBackupToDrive(
  backupUri: string,
  passphrase?: string | null,
  onProgress?: DriveBackupProgressCallback
): Promise<DriveUploadResult> {
  const effectivePassphrase = passphrase ?? (await getDrivePassphrase());
  if (!effectivePassphrase) {
    throw new DriveBackupError(
      DRIVE_ERR_NO_PASSPHRASE,
      'Set a backup passphrase first. It protects your data and is required to restore it.'
    );
  }

  const content = await FileSystem.readAsStringAsync(backupUri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  let backupData: unknown;
  try {
    backupData = JSON.parse(content);
  } catch {
    throw new DriveBackupError('drive_local_backup_corrupt', 'Local backup file is corrupted.');
  }
  onProgress?.('creating', 45);

  const payload = await encryptBackupJson(backupData, effectivePassphrase);
  onProgress?.('creating', 70);

  const fileName = backupUri.split('/').pop() || `pocketFlow_backup_${Date.now()}.json`;
  return uploadEncryptedPayloadToDrive(payload, fileName, onProgress);
}

/**
 * Encrypts the given payload envelope and uploads it to the Drive backup folder.
 */
export async function uploadEncryptedPayloadToDrive(
  payload: EncryptedBackupPayload,
  fileName: string,
  onProgress?: DriveBackupProgressCallback
): Promise<DriveUploadResult> {
  const dir = `${FileSystem.cacheDirectory}drive_uploads/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => undefined);
  const tmpUri = `${dir}${fileName}`;
  await FileSystem.writeAsStringAsync(tmpUri, encryptedPayloadToJson(payload), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  onProgress?.('creating', 85);
  try {
    return await uploadDriveBackupFile(tmpUri, fileName, onProgress);
  } finally {
    await FileSystem.deleteAsync(tmpUri, { idempotent: true }).catch(() => undefined);
  }
}

/**
 * Downloads + decrypts + restores a remote backup. Requires the passphrase
 * (prompted from the user; needed on a fresh device where SecureStore is empty).
 */
export async function restoreFromDriveBackup(
  fileId: string,
  fileName: string,
  passphrase: string
): Promise<{ success: boolean; error?: string }> {
  const localUri = await downloadDriveBackupFile(fileId, fileName);
  const content = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const backupData = decryptBackupJson(content, passphrase);

  const restoreUri = `${FileSystem.cacheDirectory}drive_restore.json`;
  await FileSystem.writeAsStringAsync(restoreUri, JSON.stringify(backupData), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return restoreFromBackup(restoreUri);
}

/**
 * Updates the stored backup passphrase.
 */
export async function saveDrivePassphrase(passphrase: string): Promise<void> {
  if (passphrase.length < 8) {
    throw new DriveBackupError('drive_passphrase_too_short', 'Passphrase must be at least 8 characters.');
  }
  await setDrivePassphrase(passphrase);
}

export async function hasDrivePassphrase(): Promise<boolean> {
  return (await getDrivePassphrase()) !== null;
}

export async function removeDrivePassphrase(): Promise<void> {
  await clearDrivePassphrase();
}

export async function resetDriveFolderCache(): Promise<void> {
  await clearDriveBackupFolderId();
}

/**
 * Shared error formatting for the settings UI.
 */
export function describeDriveError(e: unknown): string {
  if (e instanceof DriveAuthError) return e.message;
  if (e instanceof DriveBackupError) return e.message;
  if (e instanceof Error) return e.message;
  return String(e);
}

/**
 * Clears every Drive credential (tokens, folder cache, passphrase).
 */
export async function clearAllDriveData(): Promise<void> {
  await clearDriveTokens();
  await clearDriveBackupFolderId();
  await clearDrivePassphrase();
}