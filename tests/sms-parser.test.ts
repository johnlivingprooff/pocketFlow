/**
 * Unit tests for the SMS parser (src/lib/services/smsParser.ts).
 *
 * Covers Airtel Money, TNM Mpamba and generic Malawian bank SMS formats,
 * plus negative cases (non-financial messages must not parse).
 */

import {
  buildDedupeKey,
  detectProvider,
  parseIncomingSms,
  parseSmsTransaction,
} from '../src/lib/services/smsParser';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

describe('SMS Parser Suite', () => {
  describe('detectProvider', () => {
    test('detects Airtel Money from sender name', () => {
      assert(detectProvider('AIRTELMONEY') === 'airtel_money', 'AIRTELMONEY sender');
      assert(detectProvider('Airtel Money') === 'airtel_money', 'Airtel Money sender');
    });

    test('detects TNM Mpamba from sender name', () => {
      assert(detectProvider('Mpamba') === 'tnm_mpamba', 'Mpamba sender');
      assert(detectProvider('TNM Mpamba') === 'tnm_mpamba', 'TNM Mpamba sender');
      assert(detectProvider('MPAMBA') === 'tnm_mpamba', 'MPAMBA sender');
    });

    test('detects banks from sender keywords', () => {
      assert(detectProvider('National Bank') === 'bank', 'National Bank');
      assert(detectProvider('Standard Bank') === 'bank', 'Standard Bank');
      assert(detectProvider('NBS Bank') === 'bank', 'NBS Bank');
    });

    test('falls back to body keywords for unknown senders', () => {
      assert(
        detectProvider('8855112233', 'Debit alert: Your account was debited with MK500.00') === 'bank',
        'body fallback'
      );
    });

    test('rejects unrelated senders', () => {
      assert(detectProvider('MTN', 'Get 50% off data bundles today!') === null, 'marketing SMS');
      assert(detectProvider('+265991234567', 'Hi, are we still meeting tomorrow?') === null, 'personal SMS');
    });
  });

  describe('parseSmsTransaction', () => {
    test('parses Airtel Money received message', () => {
      const result = parseSmsTransaction(
        'You have received MWK 5,000.00 from +265 881 234 567. New balance: MWK 15,000.00. Trx ID: 8D9F2A1C.'
      );
      assert(result !== null, 'should parse');
      assert(result!.amount === 5000, `amount should be 5000, got ${result!.amount}`);
      assert(result!.direction === 'income', `direction should be income, got ${result!.direction}`);
      assert(result!.balanceAfter === 15000, `balance should be 15000, got ${result!.balanceAfter}`);
      assert(result!.reference === '8D9F2A1C', `ref should be 8D9F2A1C, got ${result!.reference}`);
    });

    test('parses Airtel Money sent message with date', () => {
      const result = parseSmsTransaction(
        'You have sent MWK 1,200.00 to JOHN BANDA on 25/07/2026. Airtel Money balance: MWK 8,000.00.'
      );
      assert(result !== null, 'should parse');
      assert(result!.amount === 1200, `amount should be 1200, got ${result!.amount}`);
      assert(result!.direction === 'expense', `direction should be expense, got ${result!.direction}`);
      assert(result!.occurredAt === '2026-07-25', `date should be 2026-07-25, got ${result!.occurredAt}`);
    });

    test('parses TNM Mpamba received message (K amounts)', () => {
      const result = parseSmsTransaction(
        'TNM Mpamba: You have received K500.00 from 0991234567. New balance: K10,500.00. Ref: 123456.'
      );
      assert(result !== null, 'should parse');
      assert(result!.amount === 500, `amount should be 500, got ${result!.amount}`);
      assert(result!.direction === 'income', 'direction should be income');
      assert(result!.balanceAfter === 10500, `balance should be 10500, got ${result!.balanceAfter}`);
      assert(result!.reference === '123456', `ref should be 123456, got ${result!.reference}`);
    });

    test('parses TNM Mpamba sent message', () => {
      const result = parseSmsTransaction(
        'Mpamba: Transaction successful. You sent K1,000.00 to CHIMWEMWE M. Available balance K20,000.00.'
      );
      assert(result !== null, 'should parse');
      assert(result!.amount === 1000, `amount should be 1000, got ${result!.amount}`);
      assert(result!.direction === 'expense', 'direction should be expense');
    });

    test('parses bank credit alert (MK amounts)', () => {
      const result = parseSmsTransaction(
        'NB: Transaction alert. Account *1564 was credited with MK15,000.00 on 25-07-2026. Available balance MK45,000.00.'
      );
      assert(result !== null, 'should parse');
      assert(result!.amount === 15000, `amount should be 15000, got ${result!.amount}`);
      assert(result!.direction === 'income', 'direction should be income');
      assert(result!.occurredAt === '2026-07-25', 'date should be 2026-07-25');
    });

    test('parses bank debit alert', () => {
      const result = parseSmsTransaction(
        'Standard Bank: Debit notification. Amount MK3,200.00 spent on card ending 4567. Balance MK12,800.00.'
      );
      assert(result !== null, 'should parse');
      assert(result!.amount === 3200, `amount should be 3200, got ${result!.amount}`);
      assert(result!.direction === 'expense', 'direction should be expense');
    });

    test('handles amounts without decimals', () => {
      const result = parseSmsTransaction('You have received MWK 500 from AIRTEL. Balance: MWK 2000.');
      assert(result !== null, 'should parse');
      assert(result!.amount === 500, `amount should be 500, got ${result!.amount}`);
    });

    test('rejects non-financial messages', () => {
      assert(parseSmsTransaction('Your OTP for login is 482913. Do not share it.') === null, 'OTP SMS');
      assert(parseSmsTransaction('Happy birthday! Hope you have a great day') === null, 'personal SMS');
      assert(parseSmsTransaction('') === null, 'empty SMS');
    });

    test('rejects messages without a direction keyword', () => {
      assert(parseSmsTransaction('Balance enquiry: MWK 5,000.00. Thank you for using our service.') === null, 'no direction');
    });
  });

  describe('parseIncomingSms (full pipeline)', () => {
    test('combines provider detection with parsing', () => {
      const result = parseIncomingSms(
        'AIRTELMONEY',
        'You have received MWK 5,000.00 from +265 881 234 567. New balance: MWK 15,000.00.'
      );
      assert(result !== null, 'should parse');
      assert(result!.provider === 'airtel_money', `provider should be airtel_money, got ${result!.provider}`);
    });

    test('returns null when provider is unknown', () => {
      const result = parseIncomingSms(
        '+265991234567',
        'You have received MWK 5,000.00 from +265 881 234 567.'
      );
      assert(result === null, 'personal sender must not parse');
    });

    test('returns null when financial-looking body comes from unknown sender', () => {
      const result = parseIncomingSms(
        'LUCKY LOTTO',
        'Congratulations! You won K50,000.00. Call 0987 to claim.'
      );
      assert(result === null, 'scam SMS must not parse');
    });
  });

  describe('buildDedupeKey', () => {
    test('is stable for identical messages', () => {
      const first = buildDedupeKey('AIRTELMONEY', 'You have received MWK 5,000.00.', '2026-07-25');
      const second = buildDedupeKey('AIRTELMONEY', 'You have received MWK 5,000.00.', '2026-07-25');
      assert(first === second, 'dedupe keys must match');
    });

    test('differs when the message changes', () => {
      const first = buildDedupeKey('AIRTELMONEY', 'You have received MWK 5,000.00.', '2026-07-25');
      const second = buildDedupeKey('AIRTELMONEY', 'You have received MWK 5,000.00.', '2026-07-26');
      assert(first !== second, 'dedupe keys must differ');
    });
  });
});
