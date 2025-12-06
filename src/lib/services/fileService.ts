import * as FileSystem from 'expo-file-system/legacy';
import { yyyyMmDd } from '../../utils/date';

export async function ensureDir(path: string) {
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(path, { intermediates: true });
    }
  } catch (error) {
    console.error('Error ensuring directory:', error);
    throw new Error(`Failed to create directory: ${path}`);
  }
}

export async function saveReceiptImage(filename: string, base64Data: string) {
  if (!filename || !base64Data) {
    throw new Error('Filename and base64 data are required');
  }

  try {
    const documentDir = FileSystem.documentDirectory;
    if (!documentDir) {
      throw new Error('Document directory not available');
    }
    const dir = `${documentDir}receipts/${yyyyMmDd()}`;
    await ensureDir(dir);
    const fileUri = `${dir}/${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
    return fileUri;
  } catch (error) {
    console.error('Error saving receipt image:', error);
    throw new Error('Failed to save receipt image');
  }
}

export async function exportData(json: any) {
  try {
    const documentDir = FileSystem.documentDirectory;
    if (!documentDir) {
      throw new Error('Document directory not available');
    }
    const dir = `${documentDir}backups`;
    await ensureDir(dir);
    const ts = Date.now();
    const fileUri = `${dir}/pocketFlow_backup_${ts}.json`;
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(json), { encoding: FileSystem.EncodingType.UTF8 });
    return fileUri;
  } catch (error) {
    console.error('Error exporting data:', error);
    throw new Error('Failed to export data');
  }
}

export async function importData(fileUri: string) {
  try {
    const content = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
    return JSON.parse(content);
  } catch (error) {
    console.error('Error importing data:', error);
    throw new Error('Failed to import data');
  }
}
