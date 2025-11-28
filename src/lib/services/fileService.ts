import * as FileSystem from 'expo-file-system';
import { yyyyMmDd } from '../../utils/date';

export async function ensureDir(path: string) {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
}

export async function saveReceiptImage(filename: string, base64Data: string) {
  const dir = FileSystem.documentDirectory + `receipts/${yyyyMmDd()}`;
  await ensureDir(dir);
  const fileUri = `${dir}/${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
  return fileUri;
}

export async function exportData(json: any) {
  const dir = FileSystem.documentDirectory + `backups`;
  await ensureDir(dir);
  const ts = Date.now();
  const fileUri = `${dir}/pocketFlow_backup_${ts}.json`;
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(json), { encoding: FileSystem.EncodingType.UTF8 });
  return fileUri;
}

export async function importData(fileUri: string) {
  const content = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
  return JSON.parse(content);
}
