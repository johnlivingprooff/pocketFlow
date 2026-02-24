import crypto from 'crypto';

export function generateRandomToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function generateShareId(): string {
  return crypto.randomBytes(8).toString('hex');
}
