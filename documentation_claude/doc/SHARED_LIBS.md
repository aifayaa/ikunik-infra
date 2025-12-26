# Shared Libraries Documentation

**Location:** `libs/`

---

## Overview

The `libs/` directory contains shared code used across all 62+ microservices. Understanding these libraries is essential for working with the codebase.

---

## Table of Contents

1. [HTTP Responses](#1-http-responses)
2. [Database Utilities](#2-database-utilities)
3. [Permission System](#3-permission-system)
4. [Validation & Schemas](#4-validation--schemas)
5. [Token Utilities](#5-token-utilities)
6. [General Utilities](#6-general-utilities)
7. [Email Utilities](#7-email-utilities)
8. [External Backends](#8-external-backends)

---

## 1. HTTP Responses

### Location
`libs/httpResponses/`

### Purpose
Standardized HTTP response handling, error formatting, and error code definitions.

### Files

| File | Purpose |
|------|---------|
| `response.ts` | Main response builder |
| `CrowdaaError.ts` | Custom error class |
| `errorMessage.js` | Legacy error mapper |
| `errorCodes.ts` | Error type/code constants |
| `formatResponseBody.ts` | Response body formatter |
| `formatValidationErrors.ts` | Zod error formatter |
| `checks.ts` | Request validation helpers |

### response.ts

**Main Response Function:**
```javascript
import response from '../../libs/httpResponses/response.ts';

// Success response
return response({
  code: 200,
  body: { data: 'result' }
});

// Error response with message
return response({
  code: 400,
  message: 'Invalid request'
});

// Raw response (body not JSON-stringified)
return response({
  code: 200,
  body: 'plain text',
  raw: true
});
```

**Response Structure:**
```javascript
{
  statusCode: 200,
  body: '{"data": "result"}',  // JSON stringified
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true
  }
}
```

**Exception Handler:**
```javascript
import { handleException } from '../../libs/httpResponses/response.ts';

try {
  // logic
} catch (e) {
  return handleException(e);  // Auto-formats any error type
}
```

### CrowdaaError.ts

**Custom Error Class:**
```javascript
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import { ERROR_TYPE_NOT_FOUND, USER_NOT_FOUND_CODE } from '../../libs/httpResponses/errorCodes';

throw new CrowdaaError(
  ERROR_TYPE_NOT_FOUND,       // type
  USER_NOT_FOUND_CODE,        // code
  'User not found',           // message
  {
    httpCode: 404,            // HTTP status
    details: { userId }       // Additional context
  }
);
```

**Error Structure:**
```javascript
{
  type: 'NotFound',
  code: 'USER_NOT_FOUND',
  message: 'User not found',
  httpCode: 404,
  details: { userId: '123' }
}
```

### errorMessage.js (Legacy)

**Error to HTTP Code Mapping:**
```javascript
import errorMessage from '../../libs/httpResponses/errorMessage';

try {
  throw new Error('user_not_found');
} catch (e) {
  return response(errorMessage(e));
  // Returns: { code: 404, message: 'user_not_found' }
}
```

**Status Code Mappings:**
| Error Message | HTTP Code |
|---------------|-----------|
| `missing_argument` | 400 |
| `missing_payload` | 400 |
| `wrong_argument_type` | 400 |
| `wrong_argument_value` | 400 |
| `access_forbidden` | 403 |
| `forbidden` | 403 |
| `token_expired` | 403 |
| `user_not_found` | 404 |
| `app_not_found` | 404 |
| `content_not_found` | 404 |
| `already_exists` | 409 |
| `not_implemented` | 501 |
| (default) | 500 |

### errorCodes.ts

**Error Types:**
```javascript
import {
  ERROR_TYPE_NOT_FOUND,
  ERROR_TYPE_VALIDATION_ERROR,
  ERROR_TYPE_ACCESS,
  ERROR_TYPE_NOT_ALLOWED,
  ERROR_TYPE_CONFLICT,
  ERROR_TYPE_INTERNAL_EXCEPTION,
  ERROR_TYPE_STRIPE,
  ERROR_TYPE_SETUP,
  ERROR_TYPE_AUTHORIZATION
} from '../../libs/httpResponses/errorCodes';
```

**Common Error Codes:**
```javascript
// Not Found
USER_NOT_FOUND_CODE
APP_NOT_FOUND_CODE
ARTICLE_NOT_FOUND_CODE
PRODUCT_NOT_FOUND_CODE

// Validation
INVALID_TYPE_CODE
TOO_SMALL_CODE
TOO_BIG_CODE
MISSING_BODY_CODE

// Access
APPLICATION_PERMISSION_CODE
INSUFFICIENT_PERMISSION_CODE

// Conflict
ALREADY_EXISTS_CODE
```

### formatResponseBody.ts

**Standard Response Format:**
```javascript
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';

// Success
formatResponseBody({ data: { user: {...} } });
// Returns: { status: 'success', data: { user: {...} } }

// Error
formatResponseBody({
  errors: [{
    type: 'NotFound',
    code: 'USER_NOT_FOUND',
    message: 'User not found'
  }]
});
// Returns: { status: 'error', errors: [...], timestamp: ... }
```

### formatValidationErrors.ts

**Zod Error Formatting:**
```javascript
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import { z } from 'zod';

try {
  schema.parse(data);
} catch (e) {
  if (e instanceof z.ZodError) {
    const errors = formatValidationErrors(e);
    // Returns array of { type, code, message, path, details }
  }
}
```

### checks.ts

**Request Validation:**
```javascript
import { checkBodyIsPresent } from '../../libs/httpResponses/checks';

// Throws if body is null/undefined
checkBodyIsPresent(event.body);
```

---

## 2. Database Utilities

### Location
`libs/mongoClient.js`, `libs/mongoCollections.json`, `libs/mongoUtils.ts`, `libs/mongoEncryption.ts`

### mongoClient.js

**Connection Pooling:**
```javascript
import MongoClient from '../../libs/mongoClient';

const client = await MongoClient.connect();

try {
  const db = client.db();  // Uses DB_NAME from env
  const result = await db.collection('users').findOne({ _id: '123' });
  return result;
} finally {
  client.close();  // Does nothing - connection is reused
}
```

**Key Features:**
- Connections are cached and reused across Lambda invocations
- `client.close()` is overridden to do nothing (prevents connection churn)
- Connections are keyed by connection string + options hash

### mongoCollections.json

**Collection Name Registry:**
```javascript
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_USERS,
  COLL_APPS,
  COLL_PRESS_ARTICLES,
  COLL_PURCHASES,
  COLL_PURCHASABLE_PRODUCT,
  COLL_NOTIFICATIONS,
  // ... 100+ collections
} = mongoCollections;

// Always use constants, never hardcode
await db.collection(COLL_USERS).findOne(...);
```

**Common Collections:**
| Constant | Collection Name | Purpose |
|----------|-----------------|---------|
| `COLL_USERS` | users | User accounts |
| `COLL_APPS` | apps | Application configs |
| `COLL_ORGANIZATIONS` | organizations | Organizations |
| `COLL_PRESS_ARTICLES` | pressArticles | Blog posts |
| `COLL_PURCHASES` | purchases | Purchase records |
| `COLL_PURCHASABLE_PRODUCT` | purchasableProducts | Products |
| `COLL_NOTIFICATIONS` | notifications | Notifications |
| `COLL_PICTURES` | pictures | Image metadata |
| `COLL_VIDEOS` | video | Video metadata |
| `COLL_DOCUMENTS` | documents | Document metadata |
| `COLL_INVITATIONS` | invitations | Invitations |
| `COLL_USER_BADGES` | userBadges | Badge assignments |
| `COLL_PERM_GROUPS` | permGroups | Permission groups |

### mongoEncryption.ts

**Field-Level Encryption:**
```javascript
import { encryptField, decryptField } from '../../libs/mongoEncryption';

// Encrypt sensitive data before storage
const encrypted = await encryptField(sensitiveData);

// Decrypt when reading
const decrypted = await decryptField(encrypted);
```

---

## 3. Permission System

### Location
`libs/perms/checkPermsFor.ts`

### Purpose
Check user permissions for apps, organizations, and features.

### Functions

#### checkPermsForApp
```javascript
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

// Check if user has admin OR editor role on app
await checkPermsForApp(userId, appId, ['admin', 'editor']);

// Silent check (returns boolean, doesn't throw)
const hasAccess = await checkPermsForApp(userId, appId, ['admin'], {
  dontThrow: true
});

// Require ALL permissions (default is ANY)
await checkPermsForApp(userId, appId, ['admin', 'editor'], {
  requireAll: true
});
```

#### checkPermsForOrganization
```javascript
import { checkPermsForOrganization } from '../../libs/perms/checkPermsFor.ts';

await checkPermsForOrganization(userId, orgId, ['admin']);
```

#### checkFeaturePermsForApp
```javascript
import { checkFeaturePermsForApp } from '../../libs/perms/checkPermsFor.ts';

// Check feature-based permissions (uses badges)
await checkFeaturePermsForApp(userId, appId, ['articlesEditor']);
```

#### checkPermsIsSuperAdmin
```javascript
import { checkPermsIsSuperAdmin } from '../../libs/perms/checkPermsFor.ts';

await checkPermsIsSuperAdmin(userId);
```

### Permission Hierarchy

**App Roles:** `owner > admin > editor > moderator > viewer`
**Organization Roles:** `owner > admin > member`
**Website Roles:** `owner > admin`

### User Permission Structure
```javascript
user.perms = {
  apps: [
    { _id: 'app-1', roles: ['owner'] },
    { _id: 'app-2', roles: ['admin', 'editor'] }
  ],
  organizations: [
    { _id: 'org-1', roles: ['admin'] }
  ],
  websites: [
    { _id: 'web-1', roles: ['owner'] }
  ]
};
```

---

## 4. Validation & Schemas

### Location
`libs/schemas/`, `libs/httpRequests/requestParsing.ts`

### Request Parsing with Zod

```javascript
import { parseAPIRequestBody } from '../../libs/httpRequests/requestParsing';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  age: z.number().positive().optional(),
  tags: z.array(z.string()).default([])
});

export default async (event) => {
  // Parses and validates - throws CrowdaaError if invalid
  const data = parseAPIRequestBody(schema, event.body);
  // data is now typed and validated
};
```

### Pagination Schema

```javascript
import { paginationSchema } from '../../libs/schemas/paginationSchema';

// Validates and transforms query string params
const { start, limit } = paginationSchema.parse(event.queryStringParameters);
// start: number (default 0)
// limit: number (positive integer)
```

### ID Schema

```javascript
import { makeIdSchema } from '../../libs/schemas/makeIdSchema';

const idSchema = makeIdSchema();
const validatedId = idSchema.parse(event.pathParameters.id);
```

---

## 5. Token Utilities

### Location
`libs/tokens/`

### generateToken.js

```javascript
import generateToken from '../../libs/tokens/generateToken';

const token = generateToken();  // 22 bytes as hex string
```

### hashToken.js

```javascript
import hashToken from '../../libs/tokens/hashToken';

const hashed = hashToken(rawToken);  // SHA-256 base64
```

**Hashing Implementation:**
```javascript
const hash = crypto.createHash('sha256');
hash.update(loginToken);
return hash.digest('base64');
```

---

## 6. General Utilities

### Location
`libs/utils.js`

### Deep Object Access

```javascript
import { objGet, objSet, objUnset } from '../../libs/utils';

// Get nested value with dot notation
const value = objGet(user, 'profile.settings.theme', 'default');

// Set nested value
objSet(user, 'profile.settings.theme', 'dark');

// Delete nested value
objUnset(user, 'profile.settings.theme');
```

### Array Utilities

```javascript
import { indexObjectArrayWithKey, arrayUniq } from '../../libs/utils';

// Convert array to indexed object
const users = [{ _id: '1', name: 'A' }, { _id: '2', name: 'B' }];
const indexed = indexObjectArrayWithKey(users, '_id');
// Result: { '1': { _id: '1', name: 'A' }, '2': { _id: '2', name: 'B' } }

// Remove duplicates
const unique = arrayUniq([1, 2, 2, 3, 3, 3]);
// Result: [1, 2, 3]
```

### String Utilities

```javascript
import { capitalize, escapeRegex, escapeHtmlEntities } from '../../libs/utils';

capitalize('hello');           // 'Hello'
escapeRegex('hello.world');    // 'hello\\.world'
escapeHtmlEntities('<script>'); // '&lt;script&gt;'
```

### Promise Utilities

```javascript
import { promiseExecUntilTrue, PromiseQueue } from '../../libs/utils';

// Retry until condition is true
await promiseExecUntilTrue(async () => {
  const result = await checkCondition();
  return result.ready;
});

// Concurrent promise execution with limit
const queue = new PromiseQueue(5);  // Max 5 concurrent
await queue.add(() => asyncOperation1());
await queue.add(() => asyncOperation2());
await queue.waitAll();
```

### Object Utilities

```javascript
import { reorderObjectKeys } from '../../libs/utils';

// Ensure consistent key order (useful for MongoDB)
const ordered = reorderObjectKeys(obj, ['_id', 'name', 'createdAt']);
```

---

## 7. Email Utilities

### Location
`libs/email/`

### Sending Email

```javascript
import { sendEmail } from '../../libs/email/sendEmail';

await sendEmail({
  to: 'user@example.com',
  subject: 'Hello',
  html: '<h1>Welcome</h1>',
  from: 'noreply@app.com'
});
```

### Mailgun Integration

```javascript
import { sendEmailMailgun } from '../../libs/email/sendEmailMailgun';

await sendEmailMailgun({
  to: 'user@example.com',
  subject: 'Hello',
  html: '<h1>Welcome</h1>',
  domain: 'mg.example.com',
  apiKey: process.env.MAILGUN_API_KEY
});
```

---

## 8. External Backends

### Location
`libs/backends/`

### WordPress Integration

```javascript
import { wordpressAPI } from '../../libs/backends/wordpress';

const response = await wordpressAPI.get('/wp-json/crowdaa/v1/users');
```

### Ghanty/MyFID Integration

```javascript
import { ghantyAPI } from '../../libs/backends/ghanty-myfid';

const response = await ghantyAPI.call('login', { username, password });
```

### URL Shortening (t.ly)

```javascript
import { shortenUrl } from '../../libs/backends/t.ly';

const shortUrl = await shortenUrl('https://example.com/very/long/url');
```

### News Data (newsdata.io)

```javascript
import { getNews } from '../../libs/backends/newsdata-io';

const articles = await getNews({ query: 'technology' });
```

### AfrikPay (Payment)

```javascript
import { afrikpay } from '../../libs/backends/afrikpay';

const result = await afrikpay.initiatePayment({ ... });
```

---

## Import Patterns

### Standard Import Block

```javascript
/* eslint-disable import/no-relative-packages */

// HTTP Response utilities
import response from '../../libs/httpResponses/response.ts';
import { handleException } from '../../libs/httpResponses/response.ts';
import errorMessage from '../../libs/httpResponses/errorMessage';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import { ERROR_TYPE_NOT_FOUND, USER_NOT_FOUND_CODE } from '../../libs/httpResponses/errorCodes';

// Database
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
const { COLL_USERS, COLL_APPS } = mongoCollections;

// Permissions
import { checkPermsForApp, checkFeaturePermsForApp } from '../../libs/perms/checkPermsFor.ts';

// Validation
import { parseAPIRequestBody } from '../../libs/httpRequests/requestParsing';
import { z } from 'zod';

// Utilities
import { objGet, objSet, escapeRegex } from '../../libs/utils';
```

---

## Quick Reference

| Need | Import |
|------|--------|
| Return HTTP response | `response` from `libs/httpResponses/response.ts` |
| Handle exceptions | `handleException` from `libs/httpResponses/response.ts` |
| Throw custom error | `CrowdaaError` from `libs/httpResponses/CrowdaaError` |
| Error codes | `errorCodes` from `libs/httpResponses/errorCodes` |
| Legacy error handling | `errorMessage` from `libs/httpResponses/errorMessage` |
| Database connection | `MongoClient` from `libs/mongoClient` |
| Collection names | `mongoCollections` from `libs/mongoCollections.json` |
| Check permissions | `checkPermsForApp` from `libs/perms/checkPermsFor.ts` |
| Parse request body | `parseAPIRequestBody` from `libs/httpRequests/requestParsing` |
| Generate token | `generateToken` from `libs/tokens/generateToken` |
| Hash token | `hashToken` from `libs/tokens/hashToken` |
| Object access | `objGet`, `objSet` from `libs/utils` |
| Escape regex | `escapeRegex` from `libs/utils` |
| Send email | `sendEmail` from `libs/email/sendEmail` |
