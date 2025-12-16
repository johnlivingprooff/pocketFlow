# Wallet Types & Conditional Fields Update

## Summary
This document outlines the changes made to enhance wallet management in pocketFlow by expanding wallet types and adding conditional fields based on wallet type.

## Changes Made

### 1. Wallet Types Update
**File**: `src/types/wallet.ts`

Updated `WalletType` from 3 types to 4 types:
- **Before**: `'Cash' | 'Credit Card' | 'Crypto'`
- **After**: `'Cash' | 'Credit Card' | 'Bank Account' | 'Mobile Money'`

**Reason**: 
- Removed 'Crypto' as it was not actively used
- Added 'Bank Account' for better categorization of traditional banking
- Added 'Mobile Money' for popular payment services in regions like Africa (Mpesa, AirtelMoney, etc.)

### 2. Conditional Fields Added
Enhanced the `Wallet` interface to support wallet-type-specific information:

#### Bank Account Fields
- `accountType?: string` - Type of account (Checking, Savings, Current, Other)
- `accountNumber?: string` - Bank account number

#### Mobile Money Fields
- `phoneNumber?: string` - Phone number associated with mobile money account
- `serviceProvider?: string` - Service provider (AirtelMoney, Mpesa, Mpamba, Other)

### 3. Database Schema Updates
**File**: `src/lib/db/index.ts`

Added four new columns to the `wallets` table:
```sql
ALTER TABLE wallets ADD COLUMN accountType TEXT;
ALTER TABLE wallets ADD COLUMN accountNumber TEXT;
ALTER TABLE wallets ADD COLUMN phoneNumber TEXT;
ALTER TABLE wallets ADD COLUMN serviceProvider TEXT;
```

These columns are automatically created during database initialization if they don't exist, ensuring backward compatibility with existing databases.

### 4. UI Implementation

#### Wallet Edit Screen (`app/wallets/edit.tsx`)

**Added State Variables**:
```tsx
// Bank Account fields
const [accountType, setAccountType] = useState<string>('Checking');
const [accountNumber, setAccountNumber] = useState('');
const [showAccountTypePicker, setShowAccountTypePicker] = useState(false);

// Mobile Money fields
const [phoneNumber, setPhoneNumber] = useState('');
const [serviceProvider, setServiceProvider] = useState<string>('Mpesa');
const [showServiceProviderPicker, setShowServiceProviderPicker] = useState(false);
```

**Conditional Field Rendering**:
- Bank Account fields appear only when `wallet.type === 'Bank Account'`
- Mobile Money fields appear only when `wallet.type === 'Mobile Money'`

**Field Components**:
1. **Account Type Picker** - Dropdown selector for Bank Account types
2. **Account Number Input** - Text input for bank account number
3. **Service Provider Picker** - Dropdown selector for mobile money providers
4. **Phone Number Input** - Phone number field for mobile money accounts

**Validation**:
- Bank Account requires account number to be filled
- Mobile Money requires phone number to be filled
- Both fields are trimmed before saving

**Picker Modals**:
- Account Type Modal with options: Checking, Savings, Current, Other
- Service Provider Modal with options: AirtelMoney, Mpesa, Mpamba, Other

#### Wallet Creation Screen (`app/wallets/create.tsx`)

Similar implementation as edit screen:
- Constants defined: `BANK_ACCOUNT_TYPES` and `MOBILE_MONEY_PROVIDERS`
- State variables for conditional fields
- Conditional rendering based on selected wallet type
- Validation in save handler
- Picker modals for dropdown selections

### 5. Type Definitions

**Bank Account Interface**:
```tsx
export interface BankAccountDetails {
  accountType?: 'Checking' | 'Savings' | 'Current' | 'Other';
  accountNumber?: string;
}
```

**Mobile Money Interface**:
```tsx
export interface MobileMoneyDetails {
  phoneNumber?: string;
  serviceProvider?: 'AirtelMoney' | 'Mpesa' | 'Mpamba' | 'Other';
}
```

## Constants Defined

### Bank Account Types
```tsx
const BANK_ACCOUNT_TYPES = ['Checking', 'Savings', 'Current', 'Other'];
```

### Mobile Money Providers
```tsx
const MOBILE_MONEY_PROVIDERS = ['AirtelMoney', 'Mpesa', 'Mpamba', 'Other'];
```

These constants are defined in both:
- `app/wallets/edit.tsx`
- `app/wallets/create.tsx`

## User Flow

### Creating a New Wallet

1. User selects wallet type
2. Based on selection:
   - **Bank Account**: See Account Type and Account Number inputs
   - **Mobile Money**: See Service Provider and Phone Number inputs
   - **Cash/Credit Card**: No additional fields
3. User fills conditional fields (if applicable)
4. User saves wallet with all data

### Editing a Wallet

1. Wallet loads with existing data
2. Conditional fields populate based on wallet type
3. User can modify all fields
4. Validation ensures required fields are filled
5. Changes are saved to database

## Data Flow

1. **UI Input** → State variables in component
2. **Validation** → Check required fields based on type
3. **Database Write** → Update wallet with conditional fields
4. **Database Read** → Load wallet and populate state
5. **UI Display** → Show conditional fields based on type

## Files Modified

1. **Type Definition**
   - `src/types/wallet.ts` - Added conditional field interfaces and expanded WalletType

2. **Database**
   - `src/lib/db/index.ts` - Added migration for new columns

3. **UI - Edit Screen**
   - `app/wallets/edit.tsx` - Added conditional field inputs and pickers

4. **UI - Create Screen**
   - `app/wallets/create.tsx` - Added conditional field inputs and pickers (existing)

## Backward Compatibility

✅ Fully backward compatible:
- New columns are nullable
- Existing wallets (Cash, Credit Card) continue to work
- Old wallets don't show irrelevant conditional fields
- Database migration is automatic

## Future Enhancements

Potential improvements for future versions:
1. Add more service providers to the Mobile Money list
2. Add account subtypes validation
3. Add phone number format validation
4. Add account number encryption for security
5. Add wallet reconciliation based on account type
6. Add account sync capabilities

## Testing Checklist

- [ ] Create Bank Account wallet with all fields
- [ ] Create Mobile Money wallet with all fields
- [ ] Edit wallet and modify conditional fields
- [ ] Verify Cash and Credit Card wallets don't show conditional fields
- [ ] Test validation (required fields)
- [ ] Test on both iOS and Android
- [ ] Test light and dark themes
- [ ] Verify data persistence after app restart

