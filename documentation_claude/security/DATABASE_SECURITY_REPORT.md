# MongoDB Database Security Report

**Date:** December 5, 2025
**Scope:** Database operations, queries, and data handling security analysis

---

## Executive Summary

The MongoDB operations in this codebase contain several injection vulnerabilities, data exposure risks, and race conditions. The most critical issues involve user input being passed directly to regex constructors and aggregation pipeline injection through sort parameters.

---

## 1. Injection Vulnerabilities

### 1.1 ReDoS via Unescaped Regex (CRITICAL)

**File:** `crowd/lib/pipelines/crowdPipeline.js` Lines 272-273
```javascript
{ 'user.about': { $regex: new RegExp(search) } },
{ 'user.profile.username': { $regex: new RegExp(search) } },
```

**File:** `crowd/lib/pipelines/pressPipeline.js` Line 232
```javascript
'user.profile.username': {
  $regex: new RegExp(trimmedSearch, 'i'),
}
```

**Attack Vector:**
```
search = "(a+)+$"  // Exponential backtracking
search = "((a+)+)+$"  // Even worse
```

**Impact:** CPU exhaustion, denial of service, database slowdown.

**Fix:**
```javascript
import { escapeRegex } from '../../libs/utils.js';

{ 'user.about': { $regex: new RegExp(escapeRegex(search), 'i') } }
```

**Note:** The utility function exists in `libs/utils.js`:
```javascript
export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

But it's not consistently used across all search operations.

---

### 1.2 Aggregation Pipeline Injection via Sort (HIGH)

User-controlled `sortBy` parameter used as object key in 7+ locations:

| File | Line | Code |
|------|------|------|
| `crowd/lib/pressSearch.js` | 80 | `$sort: { [sortBy]: sortOrder }` |
| `users/lib/getAppsPreviews.js` | 61 | `{ $sort: { [sortBy]: ... } }` |
| `users/lib/getApps.js` | 19 | `{ $sort: { [sortBy]: ... } }` |
| `users/lib/searchUser.js` | 67 | `$sort = { [sortBy]: order }` |
| `userGeneratedContents/lib/getAllUserGeneratedContents.js` | 136 | `$sort[sortBy] = ...` |
| `pressArticles/lib/getArticlesFrom.js` | 87, 92 | `{ [sortBy]: 1 }` |
| `blast/lib/getBlasts.js` | 23 | `{ [sortBy]: ... }` |

**Attack Vector:**
```
sortBy = "services.resume.loginTokens"  // Sort by auth tokens
sortBy = "services.password.bcrypt"      // Sort by password hashes
```

**Impact:** Information disclosure through sort-based inference attacks.

**Fix:**
```javascript
const ALLOWED_SORT_FIELDS = ['createdAt', 'updatedAt', 'name', 'title'];

if (!ALLOWED_SORT_FIELDS.includes(sortBy)) {
  throw new CrowdaaError('invalid_sort_field', 'Invalid sort parameter');
}
```

---

### 1.3 Query Field Name Injection (HIGH)

**File:** `pressArticles/lib/getArticlesFrom.js` Line 92
```javascript
matchArticles[sortBy] = { $gte: from };
```

**Attack Vector:**
```
sortBy = "$where"
from = "function() { ... }"  // Arbitrary JS execution
```

**Impact:** Potential NoSQL injection with arbitrary query operators.

---

## 2. Data Exposure Risks

### 2.1 Missing Projections (HIGH)

Queries that return full documents without excluding sensitive fields:

**File:** `users/lib/editProfile.js` Lines 44-46
```javascript
const user = await db
  .collection(COLL_USERS)
  .findOne({ _id: userId, appId });
// Returns entire user including services.resume.loginTokens!
```

**File:** `auth/lib/getUserByApple.js` Line 117
```javascript
// updateOne without projection on returned document
```

**Sensitive Fields That Should Be Excluded:**
```javascript
{
  'services.resume.loginTokens': 0,
  'services.password.bcrypt': 0,
  'services.apple.accessToken': 0,
  'services.facebook.accessToken': 0,
  'services.apiTokens': 0,
}
```

---

### 2.2 Inadequate Field Projection in Aggregations

**File:** `userGeneratedContents/lib/getAllUserGeneratedContents.js` Lines 193-198

Returns `user` object in results - verify no sensitive fields leak through `$lookup` operations.

---

## 3. Connection & Session Security

### 3.1 Connection Pool Management (MEDIUM)

**File:** `libs/mongoClient.js` Lines 36-38
```javascript
client.close = function closeOverload() {
  /* Do nothing, let connections timeout */
};
```

**Issues:**
1. Connections cached globally by URL hash
2. Close method disabled (intentionally for Lambda)
3. No connection lifecycle management

**Risks:**
- Connection pool exhaustion in high traffic
- Stale connections after credential rotation
- Memory accumulation in long-running processes

**Recommendation:** For Lambda, this pattern is acceptable but should be documented. Consider implementing connection validation on reuse.

---

### 3.2 Connection String Handling (MEDIUM)

MongoDB connection strings are passed through environment variables. Ensure:
1. Strings use `mongodb+srv://` with TLS
2. Authentication database is specified
3. Read preferences are set appropriately

---

## 4. Race Conditions

### 4.1 TOCTOU in Content Reporting (MEDIUM)

**File:** `reportedContents/lib/reportContent.ts` Lines 26-36
```javascript
const alreadyBlocked = await collection.findOne(toFind);
if (alreadyBlocked) {
  throw new CrowdaaError(...);
}
// Race window here!
const result = await collection.insertOne(toInsert);
```

**Fix:** Use unique index:
```javascript
// Create unique compound index
db.collection('reportedContents').createIndex(
  { contentId: 1, reporterId: 1 },
  { unique: true }
);

// Then use upsert or catch duplicate key error
try {
  await collection.insertOne(toInsert);
} catch (e) {
  if (e.code === 11000) {
    throw new CrowdaaError('already_reported');
  }
  throw e;
}
```

---

## 5. Input Validation Issues

### 5.1 Missing Pagination Limits (MEDIUM)

**File:** `users/lib/searchUser.js` Lines 51-56
```javascript
if (start && typeof start !== 'number') {
  start = parseInt(start, 10) || 0;
}
if (limit && typeof limit !== 'number') {
  limit = parseInt(limit, 10);
}
```

**Issues:**
1. No upper bound on `limit` (DoS via memory exhaustion)
2. No validation that values are positive
3. `start` could be negative

**Fix:**
```javascript
const MAX_LIMIT = 1000;
const DEFAULT_LIMIT = 50;

limit = Math.min(Math.max(parseInt(limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
start = Math.max(parseInt(start, 10) || 0, 0);
```

---

### 5.2 Type Coercion Issues

ObjectId values from user input should be validated:
```javascript
// Bad
collection.findOne({ _id: userId })

// Good
import { ObjectId } from 'mongodb';
if (!ObjectId.isValid(userId)) {
  throw new CrowdaaError('invalid_id');
}
collection.findOne({ _id: new ObjectId(userId) })
```

---

## 6. Encryption & Sensitive Data

### 6.1 Field-Level Encryption (POSITIVE)

**File:** `libs/mongoEncryption.ts`

The codebase implements field-level encryption using:
- AWS SSM Parameter Store for encryption keys
- MongoDB Client-Side Field Level Encryption (CSFLE)

This is a strong security practice.

### 6.2 Encryption Key Rotation

Ensure:
1. Keys are rotated periodically
2. Key rotation doesn't break existing encrypted data
3. Old keys are retained for decryption only

---

## 7. Operator Injection Risks

### 7.1 Unsafe Query Construction

While not found in this specific codebase, watch for patterns like:
```javascript
// DANGEROUS: User input as query operator
collection.find({ field: userInput })
// If userInput = { "$ne": null } - matches everything!

// SAFE: Explicit value matching
collection.find({ field: { $eq: userInput } })
```

---

## 8. MongoDB Collection Security

### 8.1 Collections Inventory

**File:** `libs/mongoCollections.json` - 80+ collections defined

**Sensitive Collections Requiring Extra Protection:**
- `users` - PII, authentication data
- `artists` - Profile data
- `devices` - Device tokens
- `purchases` - Financial data
- `billing` - Payment information

---

## 9. Recommendations

### Immediate Actions (P0)

1. **Escape all regex user input:**
   ```javascript
   import { escapeRegex } from '../libs/utils.js';
   // Use escapeRegex(search) everywhere
   ```

2. **Whitelist sort fields:**
   ```javascript
   const ALLOWED_SORTS = new Set(['createdAt', 'name', ...]);
   if (!ALLOWED_SORTS.has(sortBy)) throw new Error('Invalid sort');
   ```

3. **Add pagination limits:**
   ```javascript
   limit = Math.min(limit, 1000);
   ```

### Short-term (P1)

4. **Add projections to exclude sensitive fields:**
   ```javascript
   const SAFE_PROJECTION = {
     'services.resume.loginTokens': 0,
     'services.password.bcrypt': 0,
     // ...
   };
   ```

5. **Implement unique indexes for race condition prevention**

6. **Validate ObjectId inputs:**
   ```javascript
   if (!ObjectId.isValid(id)) throw new Error('Invalid ID');
   ```

### Long-term (P2)

7. **Implement query logging and monitoring**
8. **Set up MongoDB audit logging**
9. **Consider MongoDB Atlas Search for text queries (safer than $regex)**

---

## 10. Security Checklist for New Database Code

- [ ] User input escaped before regex
- [ ] Sort fields whitelisted
- [ ] Pagination has upper limits
- [ ] Sensitive fields excluded from projections
- [ ] ObjectIds validated before use
- [ ] No `$where` clauses with user input
- [ ] Race conditions prevented with unique indexes
- [ ] Connection errors handled gracefully
- [ ] Queries logged for audit purposes

---

## Appendix: Files Requiring Changes

### Critical
```
crowd/lib/pipelines/crowdPipeline.js    # Escape regex
crowd/lib/pipelines/pressPipeline.js    # Escape regex
pressArticles/lib/getArticlesFrom.js    # Whitelist sortBy
```

### High Priority
```
users/lib/searchUser.js                  # Whitelist sortBy, add limits
users/lib/getAppsPreviews.js            # Whitelist sortBy
users/lib/editProfile.js                # Add projection
userGeneratedContents/lib/getAllUserGeneratedContents.js  # Whitelist sortBy
blast/lib/getBlasts.js                  # Whitelist sortBy
```

### Medium Priority
```
reportedContents/lib/reportContent.ts   # Use unique index
libs/mongoClient.js                     # Document connection strategy
```
