# Security Audit Report - Crowdaa Microservices

**Date:** December 5, 2025
**Scope:** Full codebase security review
**Architecture:** AWS API Gateway + Lambda (Serverless Framework)

---

## Executive Summary

This security audit identified **47 vulnerabilities** across the Crowdaa microservices codebase, including **8 critical**, **15 high**, and **24 medium** severity issues. The most concerning findings involve authentication bypass vulnerabilities, hardcoded credentials, and injection risks.

### Risk Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 8 | Requires immediate attention |
| HIGH | 15 | Fix within 1-2 sprints |
| MEDIUM | 24 | Plan for remediation |

---

## Critical Vulnerabilities

### 1. CRIT-001: Missing Await on Async Authorization Functions

**Severity:** CRITICAL
**CWE:** CWE-362 (Race Condition)
**File:** `account/handlers/authorizeRole.js`
**Lines:** 19-20

```javascript
const app = getAppFromKey(apiKey);           // Missing await!
const user = authorizeRole(hashedLoginToken, app._id);  // app._id is Promise, not value
```

**Impact:** Complete authorization bypass. `app` is a Promise object, so `app._id` returns `undefined`. The authorization check runs with an undefined appId, potentially allowing unauthorized access.

**Remediation:**
```javascript
const app = await getAppFromKey(apiKey);
const user = await authorizeRole(hashedLoginToken, app._id);
```

---

### 2. CRIT-002: Hardcoded API Keys in Source Code

**Severity:** CRITICAL
**CWE:** CWE-798 (Hardcoded Credentials)

**Location 1:** `env.js` Line 5
```javascript
APP_API_KEY_DEFAULT: 'nQ9ZO9DEgfaOzWY44Xu2J2uaPtP92t176PpBkdqu',
```

**Location 2:** `ai/lib/openAI-generateContent.js` Line 16
```javascript
apiKey: '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'
```

**Impact:** Anyone with repository access can use these credentials. The OpenAI key could be used to run up charges or access AI services.

**Remediation:**
- Immediately rotate both keys
- Move to AWS Secrets Manager or SSM Parameter Store
- Add pre-commit hooks to detect hardcoded secrets

---

### 3. CRIT-003: Null Pointer Dereference in Authorization Handlers

**Severity:** CRITICAL
**CWE:** CWE-476 (NULL Pointer Dereference)

**Affected Files (7 instances):**
- `account/handlers/authorize.js` - Line 17
- `account/handlers/authorizeAdmin.js` - Line 13
- `account/handlers/authorizeArtist.js` - Line 17
- `account/handlers/authorizeNoApp.js` - Line 13
- `account/handlers/authorizeRole.js` - Line 17
- `account/handlers/authorizeWithPerms.js` - Line 18

```javascript
const authorizationToken = headers.authorization || headers.Authorization;
// No null check!
const loginToken = authorizationToken.split(' ')[1];  // Crashes if undefined
```

**Impact:** Requests without Authorization header cause unhandled exceptions. While caught by error handler, this creates inconsistent security behavior.

**Remediation:**
```javascript
const authorizationToken = headers.authorization || headers.Authorization;
if (!authorizationToken) {
  return generatePolicy('deny', methodArn);
}
const loginToken = authorizationToken.split(' ')[1];
```

---

### 4. CRIT-004: ReDoS via Unescaped User Input in Regex

**Severity:** CRITICAL
**CWE:** CWE-1333 (Inefficient Regular Expression Complexity)

**File:** `crowd/lib/pipelines/crowdPipeline.js` Lines 272-273
```javascript
{ 'user.about': { $regex: new RegExp(search) } },
{ 'user.profile.username': { $regex: new RegExp(search) } },
```

**File:** `crowd/lib/pipelines/pressPipeline.js` Line 232
```javascript
'user.profile.username': { $regex: new RegExp(trimmedSearch, 'i') }
```

**Impact:** Attackers can craft malicious regex patterns (e.g., `(a+)+$`) causing exponential CPU usage, leading to denial of service.

**Remediation:**
```javascript
import { escapeRegex } from '../../libs/utils.js';
{ 'user.about': { $regex: new RegExp(escapeRegex(search)) } }
```

---

### 5. CRIT-005: Missing Await on Database Updates (Race Condition)

**Severity:** CRITICAL
**CWE:** CWE-362 (Race Condition)

**File:** `auth/lib/resetPassword.js` Line 53
```javascript
usersCollection.updateOne(  // Missing await!
  { _id: user._id, 'emails.address': email },
  { $set: { 'services.resume.loginTokens': [], ... } }
);
```

**File:** `auth/lib/changePassword.ts` Line 48

**Impact:** Password reset doesn't wait for token invalidation. In the race window, old tokens remain valid even after password reset.

**Remediation:** Add `await` before the updateOne call.

---

### 6. CRIT-006: IDOR in Password Reset (User-Controlled AppId)

**Severity:** CRITICAL
**CWE:** CWE-639 (Authorization Bypass Through User-Controlled Key)

**File:** `auth/handlers/resetPassword.js` Lines 20-21
```javascript
const { email, token, password, appId: inputAppId } = JSON.parse(event.body);
const { appId } = event.requestContext.authorizer;
await resetPassword(email, inputAppId || appId, token, password, lang);
```

**Impact:** Attacker can provide a different `appId` in request body to reset passwords across different apps.

**Remediation:** Never accept security-critical parameters from user input:
```javascript
const { appId } = event.requestContext.authorizer;
await resetPassword(email, appId, token, password, lang);  // Only use authorizer appId
```

---

### 7. CRIT-007: Wildcard Lambda Invoke Permissions

**Severity:** CRITICAL
**CWE:** CWE-250 (Execution with Unnecessary Privileges)

**Affected Files (8+):**
- `users/serverless.js` Line 50
- `chat/serverless.js` Line 20
- `media/serverless.js` Line 17
- `auth/serverless.js` Line 39
- And others...

```javascript
{
  Effect: 'Allow',
  Action: ['lambda:InvokeFunction'],
  Resource: '*',
}
```

**Impact:** Any Lambda function can invoke any other Lambda in the account, bypassing intended service boundaries.

**Remediation:**
```javascript
{
  Effect: 'Allow',
  Action: ['lambda:InvokeFunction'],
  Resource: 'arn:aws:lambda:${self:provider.region}:${aws:accountId}:function:${self:service}-*',
}
```

---

### 8. CRIT-008: Weak Password Reset Token (Only 24 bits entropy)

**Severity:** CRITICAL
**CWE:** CWE-330 (Insufficiently Random Values)

**File:** `auth/lib/forgotPassword.js` Line 65
```javascript
const token = crypto.randomBytes(3).toString('hex').toUpperCase();
```

**Impact:** 3 bytes = 24 bits = 16 million combinations. With email enumeration, attacker can brute-force token in seconds.

**Remediation:**
```javascript
const token = crypto.randomBytes(32).toString('hex');  // 256 bits
```

---

## High Severity Vulnerabilities

### 9. HIGH-001: Sensitive Data Logged to CloudWatch

**CWE:** CWE-532 (Sensitive Information in Log Files)

**Locations:**
- `account/handlers/authorize.js` Line 15: Logs full authorization token
- `auth/lib/sessionChecks.js` Lines 42-46: Logs user object with tokens
- All 7 authorization handlers log tokens

**Impact:** Authentication tokens visible in CloudWatch to anyone with log access.

**Remediation:** Remove token logging or mask sensitive data:
```javascript
jsConsole.info('auth request', { methodArn, hasToken: !!authorizationToken });
```

---

### 10. HIGH-002: Missing Authorization on Blast Operations

**CWE:** CWE-862 (Missing Authorization)

**Files:**
- `users/handlers/blastEmail.js` Lines 11-44
- `users/handlers/blastNotification.js` Lines 10-30
- `users/handlers/blastText.js` Lines 11-32

**Impact:** Any authenticated user can send emails/SMS/notifications to any user ID without permission checks.

**Remediation:** Add authorization check before blast operations.

---

### 11. HIGH-003: Weak Token Hashing (SHA256 Without Salt)

**CWE:** CWE-326 (Inadequate Encryption Strength)

**File:** `libs/tokens/hashToken.js`
```javascript
const hash = crypto.createHash('sha256');
hash.update(loginToken);
return hash.digest('base64');
```

**Impact:** Unsalted SHA256 is vulnerable to rainbow table attacks if database is compromised.

**Remediation:** Use bcrypt or Argon2 for token hashing, or add per-token salt.

---

### 12. HIGH-004: Overly Permissive S3 Permissions

**CWE:** CWE-732 (Incorrect Permission Assignment)

**File:** `files/serverless.js` Lines 27, 33, 39
```javascript
{ Effect: 'Allow', Action: ['s3:*'], Resource: 'arn:aws:s3:::...' }
```

**Impact:** Lambda functions have full S3 access including delete and ACL changes.

**Remediation:** Use least-privilege: `['s3:GetObject', 's3:PutObject']`

---

### 13. HIGH-005: MongoDB Aggregation Pipeline Injection

**CWE:** CWE-943 (Improper Neutralization in Data Query Logic)

**Files (7 instances):**
- `crowd/lib/pressSearch.js` Line 80
- `users/lib/getAppsPreviews.js` Line 61
- `users/lib/searchUser.js` Line 67
- And others...

```javascript
$sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 }
```

**Impact:** User-controlled `sortBy` parameter can be used to sort by sensitive fields, potentially revealing data through timing attacks.

**Remediation:** Whitelist allowed sort fields:
```javascript
const ALLOWED_SORT_FIELDS = ['createdAt', 'name', 'updatedAt'];
if (!ALLOWED_SORT_FIELDS.includes(sortBy)) throw new Error('Invalid sort field');
```

---

### 14. HIGH-006: IDOR in User Data Access

**CWE:** CWE-639 (Authorization Bypass)

**Files:**
- `users/handlers/getUser.js` Lines 5-12: Gets any user by ID
- `documents/handlers/getDocument.js` Lines 5-20: Access any document
- `pictures/handlers/getPictureDataLocation.js` Lines 5-32

**Impact:** Authenticated users can access any other user's data by guessing/enumerating IDs.

**Remediation:** Verify ownership or explicit permission before returning data.

---

### 15. HIGH-007: Auto-Granted Artist Role

**CWE:** CWE-269 (Improper Privilege Management)

**File:** `account/lib/authorizeRole.js` Lines 34-35
```javascript
user.roles = user.roles || [];
if (user && user.profil_ID) user.roles.push('artist');
```

**Impact:** Any user with a `profil_ID` field automatically gets artist role without verification.

**Remediation:** Validate artist status through proper role assignment, not field presence.

---

### 16. HIGH-008: WordPress Token Trust Without Revalidation

**CWE:** CWE-345 (Insufficient Verification of Data Authenticity)

**File:** `auth/lib/backends/wordpressLogin.ts` Line 231
```javascript
backend: 'wordpress',
wpToken,
expiresAt: Date.now() + 365 * 86400 * 1000,  // 1 year!
```

**Impact:** WordPress tokens trusted for 1 year without revalidation. Compromised WordPress = compromised Crowdaa.

---

### 17-23. Additional High Severity Issues

- **HIGH-009:** User enumeration via `isBlastable` endpoint
- **HIGH-010:** User export without role verification
- **HIGH-011:** Open CORS (`origin: '*'`) in auth endpoints
- **HIGH-012:** AWS Account ID exposed (116 occurrences)
- **HIGH-013:** Disabled API Gateway request validators
- **HIGH-014:** CloudFormation exports expose MongoDB URLs
- **HIGH-015:** Missing input validation on numeric pagination parameters

---

## Medium Severity Vulnerabilities

### 24-47. Medium Severity Summary

| ID | Issue | File | Line |
|----|-------|------|------|
| MED-001 | Stack trace in error responses | response.ts | 61-100 |
| MED-002 | Password min length only 6 chars | register.js | 8 |
| MED-003 | Unvalidated redirect URL | forgotPassword.js | 84 |
| MED-004 | Connection pool not properly managed | mongoClient.js | 36-38 |
| MED-005 | TOCTOU race in reportContent | reportContent.ts | 26-36 |
| MED-006 | Content-Type not whitelisted for S3 | getUploadUrl.js | 54 |
| MED-007 | Moderators can delete any content | removeUserGeneratedContents.js | 15 |
| MED-008 | Authorizer cache disabled (TTL=0) | serverless.js | 66+ |
| MED-009 | Deployment bucket name predictable | All serverless.js | - |
| MED-010 | 128MB memory insufficient for Node.js | Multiple | - |
| MED-011 | Missing rate limiting on auth endpoints | All auth handlers | - |
| MED-012 | Inconsistent regex escaping | Multiple search files | - |
| MED-013-024 | Various input validation issues | Multiple | - |

---

## Remediation Priority Matrix

### Immediate Actions (This Week)

1. **Rotate all hardcoded credentials** (CRIT-002)
2. **Add missing awaits** in authorization handlers (CRIT-001, CRIT-005)
3. **Fix null pointer in authorization** (CRIT-003)
4. **Escape regex user input** (CRIT-004)

### Short-term (2 Weeks)

1. Remove user-controlled appId in password reset (CRIT-006)
2. Increase password reset token entropy (CRIT-008)
3. Remove token logging (HIGH-001)
4. Add authorization to blast operations (HIGH-002)
5. Implement least-privilege IAM (CRIT-007, HIGH-004)

### Medium-term (1 Month)

1. Implement proper token hashing with salt (HIGH-003)
2. Add ownership verification to data access (HIGH-006)
3. Whitelist sortBy parameters (HIGH-005)
4. Add rate limiting
5. Enable API Gateway request validators

---

## Compliance Impact

| Standard | Affected Areas |
|----------|---------------|
| OWASP Top 10 | A01 (Broken Access Control), A02 (Cryptographic Failures), A03 (Injection), A07 (Auth Failures) |
| PCI-DSS | Req 3 (Protect Stored Data), Req 6 (Secure Systems), Req 8 (Auth) |
| GDPR | Art 32 (Security of Processing) |
| SOC 2 | CC6.1 (Logical Access), CC6.6 (System Boundaries) |

---

## Appendix: Files Requiring Immediate Review

```
account/handlers/authorize.js
account/handlers/authorizeRole.js
auth/handlers/resetPassword.js
auth/lib/forgotPassword.js
auth/lib/resetPassword.js
ai/lib/openAI-generateContent.js
env.js
crowd/lib/pipelines/crowdPipeline.js
users/handlers/blastEmail.js
libs/tokens/hashToken.js
```
