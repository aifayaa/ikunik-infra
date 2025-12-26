# Code Quality & Technical Debt Report

**Date:** December 5, 2025
**Scope:** Full codebase analysis for quality issues, quirks, and potential problems

---

## Executive Summary

The codebase exhibits several patterns that increase maintenance burden and risk of bugs. Key issues include inconsistent error handling, async/await problems, debug code in production, and 50+ unresolved TODO comments. The analysis also identified deprecated dependencies requiring updates.

---

## 1. Error Handling Issues

### 1.1 Silently Swallowed Exceptions (HIGH)

**File:** `auth/lib/oauthCallback.js` Lines 54-59
```javascript
try {
  const parsed = JSON.parse(rawResponse);
  return parsed;
} catch (e) {
  /* do nothing */  // Silent failure!
}
```

**Problem:** JSON parse errors are silently ignored, making debugging impossible.

**Fix:**
```javascript
try {
  return JSON.parse(rawResponse);
} catch (e) {
  console.error('Failed to parse OAuth response:', e.message);
  return rawResponse;  // Return original on failure
}
```

---

### 1.2 Generic Error Handlers Losing Context

**File:** `blast/handlers/blastEmail.js` Lines 43-45
```javascript
catch (e) {
  return response({ code: 500, message: e.message });
}
```

**Problem:** Only message is returned; stack trace and error type lost.

**File:** `purchasableProducts/handlers/validatePurchase.js` Lines 76-88
```javascript
if (typeof e === 'string') {
  try {
    e = JSON.parse(e);
  } catch (error) {
    e = new Error("Can't parse error");
  }
}
```

**Problem:** Complex error type checking suggests inconsistent error formats upstream.

---

### 1.3 Promise.all Without Error Handling

**File:** `pressAutomation/lib/singleTaskRunner.js` Line 120
```javascript
Promise.all(promises)  // One failure fails all!
```

**Better Pattern:** `Promise.allSettled()` is used correctly in some places (`counters/handlers/updateDBCounters.js` Line 37) but not consistently.

---

## 2. Async/Await Issues

### 2.1 Missing Await on Function Call (CRITICAL)

**File:** `pressArticles/lib/sendArticleNotifications.js` Line 160
```javascript
await badgeChecker.init;  // Wrong! Should be: await badgeChecker.init()
```

**Problem:** `init` is a function reference, not a promise. This line does nothing.

---

### 2.2 Infinite Polling Without Timeout

**File:** `auth/lib/oauthCallback.js` Lines 273-284
```javascript
await new Promise((resolve) => {
  const checkAgain = async () => {
    // ...
    if (picture.mediumUrl) resolve(picture.mediumUrl);
    else setTimeout(checkAgain, 500);  // Could loop forever!
  };
  checkAgain();
});
```

**Same issue in:**
- `ghanty/lib/login.js` Lines 194-205
- `pressAutomation/lib/singleTaskRunner.js` Lines 183-204

**Fix:**
```javascript
const MAX_RETRIES = 60;  // 30 seconds at 500ms intervals
let retries = 0;
await new Promise((resolve, reject) => {
  const checkAgain = async () => {
    if (retries++ >= MAX_RETRIES) {
      reject(new Error('Polling timeout'));
      return;
    }
    // ...
  };
  checkAgain();
});
```

---

### 2.3 Array Mutation During Async Processing

**File:** `ai/lib/openAI-generateContent.js` Lines 218-265
```javascript
async function tryNextURL() {
  const url = imagesURLs.shift();  // Mutates array while iterating
```

**Problem:** `shift()` modifies the array, making retry logic unpredictable.

---

## 3. Debug Code in Production

### 3.1 Console Logging with Typos

**File:** `users/lib/editProfile.js`
- Line 22: `console.log('RooUsrena', username);` - Obvious debug code
- Line 84: `console.log('DEBUG', { field, extraFields, optionnal });`

---

### 3.2 DEBUG Statements Throughout

| File | Line | Content |
|------|------|---------|
| `auth/lib/backends/wordpressForgotPassword.js` | 21, 36, 40 | Multiple DEBUG logs |
| `auth/lib/backends/wordpressLogin.js` | 172, 183 | DEBUG in error handling |
| `apps/lib/syncCreateAppBaserow.js` | 45 | DEBUG Baserow error |
| `purchasableProducts/handlers/validatePurchase.js` | 78 | `console.log('Caught error')` |

**Recommendation:** Replace all `console.log` with structured logging that can be filtered by environment.

---

## 4. TODO/FIXME Comments (50+ instances)

### 4.1 Security-Related TODOs (HIGH PRIORITY)

**File:** `pictures/lib/getPicture.js` Line 8
```javascript
// TODO: add a check to user permission to access pictures not published
```

**File:** `videos/lib/getVideos.js` Line 8
```javascript
// TODO: add a check to user permission to access pictures not published
```

**Problem:** Missing permission checks are security vulnerabilities, not just TODOs.

---

### 4.2 Business Logic TODOs (MEDIUM)

| File | Line | TODO |
|------|------|------|
| `purchasableProducts/handlers/validatePurchase.js` | 42 | `@TODO : checks if price is defined ?` |
| `purchasableProducts/lib/cronSubscriptionChecks.js` | 126 | Browse purchases for mass update |
| `blast/lib/sendNotifications.js` | 165 | Check old/stale pending notifications |
| `pressArticles/lib/sendArticleNotifications.js` | 248 | Same stale notifications issue |

---

### 4.3 Access Control TODOs

**File:** `invitations/lib/classes/invitation.js`
- Line 40: `// TODO allow access for organization admins and superAdmins`
- Line 48: `// TODO: should we filter expired invitations ?`
- Line 315-316: Missing sorting and index

---

## 5. Naming Inconsistencies

### 5.1 Typos in Variable Names

**File:** `users/lib/editProfile.js` Line 73
```javascript
optionnal  // Should be: optional
```
This typo appears twice in the forEach callback.

---

### 5.2 Inconsistent Field Names

**File:** `account/lib/authorizeRole.js` Line 35
```javascript
if (user && user.profil_ID) user.roles.push('artist');
```

`profil_ID` uses French spelling and inconsistent casing (should be `profileId` or `profile_id`).

---

## 6. Deprecated Dependencies

**File:** `package.json`

| Package | Current | Issue |
|---------|---------|-------|
| `request` | Line 61 | **DEPRECATED** - Use `fetch` or `axios` |
| `request-promise-native` | Line 62 | **DEPRECATED** - Depends on `request` |
| `mongodb` | 3.5.3 | **OUTDATED** - Current is 6.x |
| `moment` | Line 50 | **DEPRECATED** - Use `date-fns` or `dayjs` |
| `uuid` | 3.4.0 | **OUTDATED** - Current is 9.x |
| `async` | 3.1.0 | Consider native Promise patterns |

**Recommendation:** Create migration plan for deprecated packages.

---

## 7. ESLint Disables (100+ instances)

### 7.1 Systematic Rule Bypasses

```javascript
/* eslint-disable import/no-relative-packages */  // 50+ files
/* eslint-disable no-await-in-loop */  // documents, videos
/* eslint-disable no-console */  // Production logging
```

**Problem:** Extensive eslint-disable comments suggest:
1. Project structure issues (relative imports)
2. Performance patterns not matching linter expectations
3. Lack of proper logging infrastructure

---

## 8. Race Conditions

### 8.1 Check-Then-Act Without Atomicity

**File:** `reportedContents/lib/reportContent.ts` Lines 26-36
```javascript
const alreadyBlocked = await collection.findOne(toFind);
if (alreadyBlocked) {
  throw new CrowdaaError(...);
}
// Window for race condition here!
const result = await collection.insertOne(toInsert);
```

**Fix:** Use unique index with duplicate key error handling:
```javascript
try {
  await collection.insertOne(toInsert);
} catch (e) {
  if (e.code === 11000) {  // Duplicate key
    throw new CrowdaaError('already_exists', ...);
  }
  throw e;
}
```

---

### 8.2 Badge Status Race

**File:** `purchasableProducts/lib/cronSubscriptionChecks.js` Lines 128-222
```javascript
userPurchasesMap[userId]  // Map-based deduplication
```

Multiple concurrent badge updates for same user could race.

---

## 9. Type Safety Issues

### 9.1 Loose Type Checking

**File:** `purchasableProducts/handlers/validatePurchase.js` Line 44
```javascript
parseFloat(price)  // No validation that price is numeric
```

---

### 9.2 Missing Null Checks

**File:** `ghanty/lib/login.js` Line 200
```javascript
picture.mediumUrl  // Could crash if picture undefined
```

---

## 10. Legacy Code Markers

**File:** `userBadges/lib/badgeFieldsChecks.js` Line 34
```javascript
// Legacy field, kept until the old dashboard is removed
```

**File:** `ssr/lib/redirect.js` Line 16
```javascript
// Comment about old protocols before 2024/10/10
```

---

## 11. Hardcoded Values

### 11.1 Email Addresses

**File:** `apps/lib/inviteAppAdmin.js` Lines 15-21
```javascript
const BCC_EMAILS_BASE = [
  'example1@redacted.example.com',
  // ...
];
```

Should be in environment configuration.

---

### 11.2 Environment Checks

**File:** `invitations/lib/classes/methods/internalMethod.js` Line 43
```javascript
if (process.env.STAGE === 'dev')  // Debug logging
```

Should use proper logger with log levels.

---

## 12. Callback Pattern Overuse

### 12.1 Callback Hell

**File:** `blast/lib/blastEmail.js` Lines 13-27
```javascript
// Nested callback-based promises
```

**File:** `pressArticles/lib/sendArticleNotifications.js` Lines 203-217
```javascript
// Wrapping callback in Promise
```

**Recommendation:** Convert to async/await patterns.

---

## Summary Table

| Category | Count | Priority |
|----------|-------|----------|
| Critical async issues | 3 | P0 |
| Security TODOs | 3 | P0 |
| Silent error handling | 4 | P1 |
| Debug console.log | 15+ | P1 |
| Business TODOs | 10+ | P2 |
| Deprecated dependencies | 6 | P2 |
| ESLint disables | 100+ | P3 |
| Naming issues | 2 | P3 |
| Race conditions | 2 | P2 |

---

## Remediation Roadmap

### Phase 1: Critical Fixes (1 week)
1. Fix missing await parentheses
2. Add timeout to polling loops
3. Address security-related TODOs
4. Remove hardcoded credentials

### Phase 2: Error Handling (2 weeks)
1. Implement consistent error handling pattern
2. Replace console.log with structured logging
3. Add proper error context preservation
4. Convert Promise.all to Promise.allSettled where appropriate

### Phase 3: Dependency Updates (2 weeks)
1. Replace `request` with `axios` or `fetch`
2. Upgrade `mongodb` to v6.x
3. Replace `moment` with `date-fns`
4. Update `uuid` to v9.x

### Phase 4: Code Quality (ongoing)
1. Resolve or document TODO comments
2. Fix ESLint issues and remove disables
3. Add TypeScript strict mode
4. Implement pre-commit hooks
