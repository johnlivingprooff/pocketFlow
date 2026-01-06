# pocketFlow Web - Quick Testing Guide

## Pre-Flight Checklist

```bash
# 1. Install dependencies (critical for sql.js)
npm install

# 2. Start the development server for web
npx expo start --web

# 3. Open in browser at http://localhost:19006
```

## Testing Checklist

### ✅ Data Loading (Immediate)
- [ ] **Home Screen** loads without errors
  - Watch browser console for any errors
  - Verify "Loading..." disappears within 2 seconds
  
- [ ] **Wallets Screen** loads
  - Click "💰 Wallets" in left rail
  - Should see list of wallets (or empty state if first time)
  - Total balance displays correctly
  
- [ ] **Analytics Screen** loads
  - Click "📊 Analytics" in left rail
  - Should see charts and category breakdown
  - No console errors about rendering

### ✅ Navigation (UI)
- [ ] **Left Rail Collapsible**
  - Hamburger button (3 lines) at top-left
  - Click to collapse: rail shrinks to 64px (icons only)
  - Click again to expand: rail grows to 220px (labels visible)
  
- [ ] **All Nav Items Clickable**
  - Home (🏠)
  - Wallets (💰)
  - Analytics (📊)
  - Categories (🏷️)
  - Budgets (💼)
  - Goals (🎯)
  
- [ ] **Add Transaction CTA**
  - Bottom of left rail
  - Click "Add" button
  - Should open transaction form (new screen or modal)

### ✅ Right Panel
- [ ] **Profile Section Visible**
  - Top-right shows user initials in avatar circle
  - Displays default currency (e.g., "MWK")
  
- [ ] **Theme Menu**
  - Click theme toggle (sun/moon icon)
  - Should show 3 options: Light, Dark, System
  - Changing theme updates entire UI colors
  
- [ ] **Storage Mode Toggle**
  - Radio buttons: "Browser" vs "File"
  - Currently uses "Browser" (IndexedDB)
  
- [ ] **Export/Import Buttons**
  - Export: Click → downloads `pocketflow_YYYY-MM-DD.db` file
  - Import: Click → opens file picker → should accept .db files

### ✅ Form Submission
- [ ] **Add Transaction Works**
  - Click left rail "Add" button
  - Fill in: Amount, Category, Description, Date
  - Click Save
  - Transaction appears on Home screen
  - No console errors
  
- [ ] **Form Validation**
  - Try saving without amount
  - Should show error message (not crash)

### ✅ Data Persistence
- [ ] **Data Survives Page Reload**
  - Add a transaction
  - Press F5 (refresh)
  - Page loads, data is still there
  
- [ ] **IndexedDB Actually Used**
  - Open DevTools: F12 → Application → IndexedDB
  - Should see database: `pocketflow_web`
  - Store: `database`
  - Key: `pocketflow` (contains binary data)

### ✅ Responsive Design
- [ ] **Resize Browser < 1024px**
  - Left rail becomes icons-only (64px)
  - Right panel hides behind floating button (bottom-right)
  - Content area takes full width
  
- [ ] **Resize Browser > 1024px**
  - Left rail expands to 220px with labels
  - Right panel shows alongside
  - 3-column layout visible

### ✅ Theme System
- [ ] **Light Mode**
  - Background: light beige/cream
  - Text: dark brown/black
  - Primary color: gold/yellow accent
  
- [ ] **Dark Mode**
  - Background: dark (nearly black)
  - Text: light/white
  - Primary color: bright gold

### ✅ Browser Console
- [ ] **No Critical Errors**
  - Open F12 → Console tab
  - No red error messages
  - Warnings about deprecated APIs are OK
  - sql.js initialization warnings are OK

---

## Common Issues & Solutions

### Issue: "Cannot find module 'sql.js'"
**Solution**: Run `npm install` - sql.js is in package.json but not installed yet

### Issue: "Cannot read property '_array' of undefined"
**Solution**: Check browser console for database initialization errors; may need to clear IndexedDB and reload

### Issue: Data doesn't persist after reload
**Solution**: 
1. Open DevTools → Application → IndexedDB → pocketflow_web
2. Check if data is being saved (look for 'pocketflow' key)
3. Try export/import to verify DB serialization works

### Issue: Left rail not collapsing
**Solution**: Make sure you're viewing at full window width; collapse button is top-left corner

### Issue: Charts/Analytics not showing
**Solution**: Known limitation - react-native-svg may need compatibility work; this is Phase 2

---

## Performance Benchmarks

### Expected Load Times
- **Initial Load**: ~2 seconds (sql.js initialization + IndexedDB read)
- **Page Navigation**: <200ms (in-memory database)
- **Form Submit**: <500ms (write + IndexedDB save)
- **Export DB**: <1 second (serialize binary)

### If Slower:
- Check browser DevTools Network tab (sql.js WASM file might be slow)
- Check IndexedDB size in Application tab (should be < 10MB)

---

## Debugging Tips

### Enable SQL.js Logging
In `webDriver.ts`, uncomment log statements to see all SQL operations:
```typescript
log('[WebDB] Executing:', sql, params);
```

### Check IndexedDB Contents
```javascript
// In browser console:
const db = await indexedDB.databases();
console.log(db); // Should show pocketflow_web

const req = indexedDB.open('pocketflow_web');
req.onsuccess = () => {
  const store = req.result.transaction(['database'], 'readonly').objectStore('database');
  store.get('pocketflow').onsuccess = (e) => console.log('DB size:', e.target.result.byteLength);
};
```

### Test WriteQueue
Add a transaction, watch DevTools console for:
```
[WriteQueue] Enqueued write: insertTransaction
[WriteQueue] Write queue depth: 1
[WriteQueue] Completed insertTransaction in 50ms
```

---

## What to Report as Bugs

- [ ] Any red errors in console
- [ ] Data not persisting after reload
- [ ] Form submissions failing silently
- [ ] Navigation not working (buttons don't respond)
- [ ] UI freezing or becoming unresponsive
- [ ] Export/Import not triggering file operations
- [ ] Specific error messages with full stack traces

---

## Success Criteria (When to Say "It Works!")

✅ **Core Functionality**
- Data loads on all screens (Home, Wallets, Analytics)
- Forms submit without errors
- Data persists after browser reload

✅ **Navigation & UI**
- All left rail items navigate correctly
- Right panel displays and can be toggled
- Theme switching works

✅ **Storage**
- Export downloads a .db file
- Import file picker accepts files
- After import, data is restored

✅ **No Blockers**
- No red errors in console
- App doesn't crash during normal use
- No "undefined" or "null" crashes

---

## Next Steps After Testing

If all above passes:
1. Move to Phase 2: Replace remaining Alert.alert calls in onboarding
2. Verify analytics charts work on web
3. Test on mobile (should still work normally)
4. Performance optimization if needed

If issues found:
1. Document exact steps to reproduce
2. Check console for error messages
3. Check IndexedDB in DevTools (may need manual clear)
4. Report with browser version and exact error text

---

**Happy Testing!** 🚀
