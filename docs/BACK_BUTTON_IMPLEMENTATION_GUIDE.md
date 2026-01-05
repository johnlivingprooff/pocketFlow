# Quick Reference: Applying Back Button to Remaining Onboarding Screens

## Pattern Summary
All onboarding screens except `profile.tsx` (which has the full implementation) can be updated with the back button in ~2 minutes each.

## Copy-Paste Steps

### Step 1: Update Imports
Add these imports to each screen file:

```tsx
import { useEffect } from 'react'; // Add to existing React import
import { OnboardingHeader } from '../../src/components/OnboardingHeader';
```

### Step 2: Update useOnboarding Hook
Replace existing:
```tsx
const { setCurrentStep, completeStep } = useOnboarding();
```

With:
```tsx
const { setCurrentStep, completeStep, previousSteps, goBackToPreviousStep, saveFormData, formData } = useOnboarding();
```

### Step 3: Add Back Handler
Add this function before the return statement:

```tsx
const handleBack = () => {
  goBackToPreviousStep();
  router.back();
};
```

### Step 4: Add OnboardingHeader to ScrollView
In the ScrollView's children, add as first element:

```tsx
<ScrollView contentContainerStyle={styles.scrollContent}>
  <OnboardingHeader 
    canGoBack={previousSteps.length > 0}
    onBack={handleBack}
  />
  {/* Rest of existing content */}
```

### Step 5: (Optional) Add Form Data Persistence
For screens that collect input (budget, goal, transaction), add:

```tsx
// After useState declarations:
const [fieldName, setFieldName] = useState(formData.[stepName]?.fieldName || '');

// Add effect:
useEffect(() => {
  saveFormData('[stepName]', {
    fieldName,
    // ... other fields
  });
}, [fieldName, saveFormData]);
```

## Screens to Update

### wallet.tsx
- **Main inputs:** walletName, walletType, initialBalance
- **Form data key:** 'wallet'
- **Estimated time:** 2 minutes

### category.tsx
- **Main inputs:** categoryName, emoji
- **Form data key:** 'category'
- **Estimated time:** 2 minutes

### budget.tsx
- **Main inputs:** budgetName, limitAmount, selectedCategory, periodType
- **Form data key:** 'budget'
- **Estimated time:** 2 minutes

### goal.tsx
- **Main inputs:** goalName, targetAmount, targetMonths
- **Form data key:** 'goal'
- **Estimated time:** 2 minutes

### transaction.tsx
- **Main inputs:** amount, description, transactionType, selectedCategory
- **Form data key:** 'transaction'
- **Estimated time:** 2 minutes

### transfer.tsx
- **Note:** This is an educational screen with no form inputs
- **Only needs:** OnboardingHeader component
- **Estimated time:** 1 minute

## Testing After Each Update

```bash
# Check for TypeScript errors
npx tsc --noEmit app/onboarding/[screen-name].tsx

# Test in simulator
npx expo start --ios
# Navigate to the screen and verify:
# ✓ Back button appears (except on welcome)
# ✓ Back button goes to previous screen
# ✓ Form data is preserved (if applicable)
# ✓ No TypeScript errors
```

## Common Mistakes to Avoid

❌ **Don't:** Forget to add `useEffect` import if not present
❌ **Don't:** Use wrong form data key name
❌ **Don't:** Add OnboardingHeader inside a nested view instead of direct ScrollView child
❌ **Don't:** Forget to pass `previousSteps` from hook
❌ **Don't:** Use `router.replace` instead of `router.back()` for back navigation

✅ **Do:** Copy the exact pattern from `profile.tsx` as reference
✅ **Do:** Add `useEffect` for form data persistence on input screens
✅ **Do:** Test back navigation actually works before moving to next screen
✅ **Do:** Verify no new TypeScript errors are introduced

## Estimated Total Time
- 2 min × 6 screens = **12 minutes**
- Plus testing: **5 minutes**
- **Total: ~17 minutes** to apply back button to all remaining screens

## Already Completed Example
See `app/onboarding/profile.tsx` for the complete, working implementation with:
- Back button integration
- Form data auto-save
- Form data restoration on return
- All imports and hooks properly configured
