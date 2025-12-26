# Crowdaa Microservices - Architecture Guide

**A comprehensive guide to understanding and navigating this codebase**

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Directory Structure](#2-directory-structure)
3. [Technology Stack](#3-technology-stack)
4. [Core Concepts](#4-core-concepts)
5. [How to Read the Code](#5-how-to-read-the-code)
6. [Common Patterns](#6-common-patterns)
7. [Configuration System](#7-configuration-system)
8. [Database Access](#8-database-access)
9. [Error Handling](#9-error-handling)
10. [Testing](#10-testing)
11. [Deployment](#11-deployment)

---

## 1. Project Overview

This is a **serverless microservices platform** built on AWS Lambda using the Serverless Framework. The application serves as the backend for the Crowdaa platform - a multi-tenant mobile app platform supporting:

- User management and authentication
- Content publishing (press/blog articles)
- E-commerce (in-app purchases, subscriptions)
- Real-time chat
- Push notifications and mass communications
- Media management (images, videos, documents)
- Live streaming

### Key Characteristics

- **62+ microservices** deployed as independent Lambda functions
- **Multi-tenant** architecture with app-based isolation
- **Multi-region** deployment (US and EU)
- **Event-driven** processing with AWS Step Functions
- **MongoDB** as the primary database

---

## 2. Directory Structure

```
crowdaa_microservices/
│
├── libs/                          # Shared libraries (THE FOUNDATION)
│   ├── httpResponses/            # Response formatting, errors
│   ├── perms/                    # Permission system
│   ├── schemas/                  # Zod validation schemas
│   ├── tokens/                   # Token generation/hashing
│   ├── email/                    # Email utilities
│   ├── mongoClient.js            # DB connection pool
│   ├── mongoCollections.json     # Collection name registry
│   └── utils.js                  # General utilities
│
├── env.js                         # Environment configuration
├── tsconfig.json                  # TypeScript configuration
├── package.json                   # Root dependencies
├── deploy.sh                      # Deployment script
│
├── api-v1/                        # API Gateway root configuration
├── account/                       # Authorization Lambda authorizers
├── auth/                          # Authentication handlers
│
├── users/                         # User management service
│   ├── serverless.js             # Service configuration
│   ├── package.json              # Service dependencies
│   ├── handlers/                 # Lambda handler functions
│   │   ├── searchUser.js
│   │   ├── getUser.js
│   │   └── ...
│   ├── lib/                      # Business logic
│   │   ├── searchUser.js
│   │   ├── getUser.js
│   │   └── ...
│   └── test/                     # Tests
│
├── files/                         # File upload service
├── chat/                          # Chat service
├── notifications/                 # Notifications service
├── blast/                         # Mass communication service
├── press/                         # Press management
├── pressArticles/                 # Article management
├── purchases/                     # Purchase handling
├── purchasableProducts/           # Product catalog
├── crowd/                         # Audience targeting
└── ... (50+ more services)
```

### Service Structure Pattern

Every service follows the same structure:

```
<service-name>/
├── serverless.js          # AWS Lambda + API Gateway config
├── package.json           # Service-specific dependencies
├── handlers/              # Entry points (Lambda handlers)
│   └── <operation>.js     # One file per operation
├── lib/                   # Business logic (called by handlers)
│   └── <operation>.js     # Matching lib for each handler
└── test/                  # Unit tests (mirrors handler/lib structure)
```

---

## 3. Technology Stack

### Runtime & Languages
- **Node.js 16.x** - Lambda runtime
- **TypeScript 5.4** - Gradually being adopted (`.ts` files)
- **JavaScript ES2017** - Legacy code (`.js` files)

### AWS Services
| Service | Purpose |
|---------|---------|
| Lambda | Serverless compute |
| API Gateway | HTTP endpoints |
| S3 | File storage |
| SNS | Push notifications, events |
| Step Functions | Workflow orchestration |
| MediaConvert | Video encoding |
| IVS | Live streaming |
| CloudFront | CDN |
| CloudWatch | Logging |
| SSM Parameter Store | Secrets |

### Key Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `mongodb` | 3.5.3 | Database driver |
| `zod` | 3.22.5 | Schema validation |
| `stripe` | 16.8.0 | Payments |
| `firebase-admin` | 13.4.0 | Firebase/Chat |
| `jsonwebtoken` | 8.5.1 | JWT handling |
| `bcryptjs` | 2.4.3 | Password hashing |
| `sharp` | 0.31.2 | Image processing |
| `nodemailer` | 6.4.14 | Email |

### Build & Deploy
- **Serverless Framework 3.38** - Infrastructure as code
- **ESBuild** - TypeScript/ES6 bundling
- **GitLab CI/CD** - Deployment pipeline

---

## 4. Core Concepts

### 4.1 Multi-Tenancy

The platform serves multiple apps. Every request includes an `appId` that isolates data:

```javascript
// Every database query includes appId
const user = await collection.findOne({ _id: userId, appId });
```

### 4.2 Authorization Model

**7 Custom Authorizers** control API access:

| Authorizer | Use Case |
|------------|----------|
| `authorize` | Standard user requests |
| `authorizeWithPerms` | When checking permissions |
| `authorizeRole` | When checking roles |
| `authorizeArtist` | Artist-only endpoints |
| `authorizePublic` | Public/optional auth |
| `authorizeAdmin` | Admin-only endpoints |
| `authorizeNoApp` | System-level endpoints |

### 4.3 Permission System

Users have roles and permissions:

```javascript
user.perms = {
  apps: [{ _id: 'app-id', roles: ['owner', 'admin', 'editor'] }],
  organizations: [{ _id: 'org-id', roles: ['admin'] }]
};
```

**Role Hierarchy:** `owner > admin > editor > moderator > viewer`

### 4.4 Feature Plans

Apps have feature plans that control quotas and capabilities:

```javascript
// Check if app plan allows more users
const allowed = await checkAppPlanForLimitIncrease(app, 'activeUsers', ...);
```

---

## 5. How to Read the Code

### 5.1 Start with the Handler

When investigating a feature, start with the handler file:

```javascript
// handlers/getPurchasableProduct.js
export default async (event) => {
  // 1. Extract context from authorizer
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const productId = event.pathParameters.id;

  try {
    // 2. Check permissions
    await checkPermsForApp(userId, appId, ['admin']);

    // 3. Call business logic
    const result = await getPurchasableProduct(appId, productId);

    // 4. Return response
    return response({ code: 200, body: result });
  } catch (e) {
    return response(errorMessage(e));
  }
};
```

### 5.2 Then Check the Lib

The corresponding lib file contains the actual logic:

```javascript
// lib/getPurchasableProduct.js
export const getPurchasableProduct = async (appId, productId) => {
  const client = await MongoClient.connect();

  try {
    const product = await client
      .db()
      .collection(COLL_PURCHASABLE_PRODUCT)
      .findOne({ appId, _id: productId });

    return product;
  } finally {
    client.close();
  }
};
```

### 5.3 Understand the Event Structure

Lambda handlers receive an `event` object from API Gateway:

```javascript
{
  requestContext: {
    authorizer: {
      appId: 'app-123',        // From authorization
      principalId: 'user-456', // User ID (called principalId for AWS reasons)
      perms: '{}',             // Serialized permissions
      superAdmin: false
    }
  },
  pathParameters: { id: 'resource-id' },
  queryStringParameters: { limit: '10', search: 'query' },
  body: '{"key": "value"}',    // JSON string
  headers: { Authorization: 'Bearer token' }
}
```

### 5.4 Follow the Imports

Imports tell you which shared utilities are used:

```javascript
/* eslint-disable import/no-relative-packages */
// Business logic
import { getPurchasableProduct } from '../lib/getPurchasableProduct';

// Shared utilities
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
```

### 5.5 Check serverless.js for Configuration

The `serverless.js` file defines:
- HTTP routes and methods
- Which authorizer to use
- Timeout and memory settings
- IAM permissions
- Environment variables

```javascript
// serverless.js
functions: {
  getPurchasableProduct: {
    handler: 'handlers/getPurchasableProduct.default',
    events: [{
      http: {
        path: 'purchasableProducts/{id}',
        method: 'get',
        authorizer: {
          type: 'CUSTOM',
          authorizerId: '${cf:account-${self:provider.stage}.ApiGatewayAuthorizerId}'
        }
      }
    }]
  }
}
```

---

## 6. Common Patterns

### 6.1 Handler Pattern (Standard)

```javascript
export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    // Permission check
    await checkPermsForApp(userId, appId, ['admin']);

    // Business logic
    const result = await doSomething();

    // Success response
    return response({ code: 200, body: result });
  } catch (e) {
    // Error response
    return response(errorMessage(e));
  }
};
```

### 6.2 Database Query Pattern

```javascript
const client = await MongoClient.connect();

try {
  const result = await client
    .db()
    .collection(COLL_COLLECTION_NAME)
    .findOne({ appId, _id: documentId });

  return result;
} finally {
  client.close();  // Actually does nothing (connection pooling)
}
```

### 6.3 Validation Pattern (Modern - Zod)

```javascript
import { parseAPIRequestBody } from '../../libs/httpRequests/requestParsing';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  age: z.number().positive().optional()
});

export default async (event) => {
  const data = parseAPIRequestBody(schema, event.body);
  // data is now typed and validated
};
```

### 6.4 Validation Pattern (Legacy - Manual)

```javascript
if (!event.body) {
  throw new Error('missing_payload');
}

const { field1, field2 } = JSON.parse(event.body);

if (!field1 || typeof field1 !== 'string') {
  throw new Error('wrong_argument_type');
}
```

### 6.5 Error Throwing Pattern

```javascript
// New style - CrowdaaError
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';

throw new CrowdaaError(
  ERROR_TYPE_NOT_FOUND,
  USER_NOT_FOUND_CODE,
  `User '${userId}' not found`,
  { httpCode: 404 }
);

// Legacy style - Error with message
throw new Error('user_not_found');
```

### 6.6 Permission Check Pattern

```javascript
// Check app-level permission
await checkPermsForApp(userId, appId, ['admin', 'editor']);

// Check with feature permissions (badges)
try {
  await checkFeaturePermsForApp(userId, appId, ['articlesEditor']);
} catch (e) {
  // Fallback to admin
  await checkPermsForApp(userId, appId, ['admin']);
}

// Silent check (returns boolean)
const isAdmin = await checkPermsForApp(userId, appId, ['admin'], { dontThrow: true });
```

---

## 7. Configuration System

### 7.1 Environment Variables (env.js)

All services share the same `env.js`:

```javascript
module.exports = {
  // Database
  MONGO_URL: '${cf:api-v1-${self:provider.stage}.MongoURL}',
  DB_NAME: 'redactedDatabaseName',

  // Storage
  S3_BUCKET: 'crowdaa-user-content',
  S3_REGION: 'us-east-1',

  // Notifications
  SNS_PLATFORM_ANDROID_ARN: '...',
  SNS_PLATFORM_IOS_ARN: '...',

  // Email
  MAILGUN_API_KEY: '...',
  MAILGUN_DOMAIN: '...',

  // Platform
  STAGE: '${self:provider.stage}',
  REGION: '${self:provider.region}',
  DEFAULT_LIMIT: 15,
};
```

### 7.2 Stages and Regions

| Stage | Region | Purpose |
|-------|--------|---------|
| `dev` | us-east-1 | Development |
| `preprod` | eu-west-3 | Pre-production |
| `prod` | us-east-1 | Production US |
| `prod` | eu-west-3 | Production EU |
| `awax` | eu-west-1 | Partner deployment |

### 7.3 CloudFormation References

Values are shared between services via CloudFormation:

```javascript
// Reference another stack's output
MONGO_URL: '${cf:api-v1-${self:provider.stage}.MongoURL}'

// Reference SSM parameter (for secrets)
ENCRYPTION_KEY: '${ssm:/crowdaa/${self:provider.stage}/encryption-key}'
```

---

## 8. Database Access

### 8.1 MongoDB Connection

```javascript
import MongoClient from '../../libs/mongoClient';

const client = await MongoClient.connect();
const db = client.db();  // Uses DB_NAME from env
```

**Key Point:** Connections are pooled and reused across Lambda invocations.

### 8.2 Collection Names

Always use the constants from `mongoCollections.json`:

```javascript
import mongoCollections from '../../libs/mongoCollections.json';
const { COLL_USERS, COLL_APPS } = mongoCollections;

// Never do this:
// collection.collection('users')  // BAD

// Always do this:
collection.collection(COLL_USERS)  // GOOD
```

### 8.3 Common Collections

| Constant | Collection | Purpose |
|----------|------------|---------|
| `COLL_USERS` | users | User accounts |
| `COLL_APPS` | apps | Application configs |
| `COLL_ORGANIZATIONS` | organizations | Organizations |
| `COLL_PRESS_ARTICLES` | pressArticles | Blog posts |
| `COLL_PURCHASES` | purchases | Purchase records |
| `COLL_PURCHASABLE_PRODUCT` | purchasableProducts | Product catalog |
| `COLL_NOTIFICATIONS` | notifications | In-app notifications |
| `COLL_PICTURES` | pictures | Image metadata |
| `COLL_VIDEOS` | video | Video metadata |

---

## 9. Error Handling

### 9.1 Error Types

Defined in `libs/httpResponses/errorCodes.ts`:

```javascript
// Error types
ERROR_TYPE_NOT_FOUND
ERROR_TYPE_VALIDATION_ERROR
ERROR_TYPE_ACCESS
ERROR_TYPE_NOT_ALLOWED
ERROR_TYPE_CONFLICT
ERROR_TYPE_INTERNAL_EXCEPTION
ERROR_TYPE_STRIPE
ERROR_TYPE_SETUP
```

### 9.2 Creating Errors

```javascript
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import { ERROR_TYPE_NOT_FOUND, USER_NOT_FOUND_CODE } from '../../libs/httpResponses/errorCodes';

throw new CrowdaaError(
  ERROR_TYPE_NOT_FOUND,     // type
  USER_NOT_FOUND_CODE,       // code
  'User not found',          // message
  { httpCode: 404, details: { userId } }  // options
);
```

### 9.3 Handling Errors

```javascript
import response from '../../libs/httpResponses/response.ts';
import errorMessage from '../../libs/httpResponses/errorMessage';

try {
  // ...
} catch (e) {
  // Legacy style
  return response(errorMessage(e));

  // OR modern style
  return handleException(e);
}
```

### 9.4 Standard Error Messages

| Message | HTTP Code | Meaning |
|---------|-----------|---------|
| `missing_payload` | 400 | Request body missing |
| `missing_argument` | 400 | Required field missing |
| `wrong_argument_type` | 400 | Invalid field type |
| `access_forbidden` | 403 | Permission denied |
| `user_not_found` | 404 | User doesn't exist |
| `app_not_found` | 404 | App doesn't exist |
| `already_exists` | 409 | Duplicate resource |

---

## 10. Testing

### 10.1 Test Framework

- **Mocha** - Test runner
- **Chai** - Assertions
- **Sinon** - Mocks/stubs

### 10.2 Running Tests

```bash
# Per service
cd users
npm test

# Test command (from package.json)
sls export-env && env-cmd mocha --require esm --recursive --timeout 10000
```

### 10.3 Test Structure

```
users/
└── test/
    ├── handlers/
    │   └── searchUser.test.js
    └── lib/
        └── searchUser.test.js
```

---

## 11. Deployment

### 11.1 Deploy Script

```bash
./deploy.sh <STAGE> <REGION> [ALL]

# Examples
./deploy.sh dev us-east-1           # Deploy core services
./deploy.sh prod eu-west-3 ALL      # Deploy all services
```

### 11.2 Deployment Order

Services are deployed in phases due to dependencies:

1. **Phase 1:** api-v1, account, apps, admin, organizations
2. **Phase 2:** auth, maintenance, ssr
3. **Phase 3:** All other services

### 11.3 Per-Service Deploy

```bash
cd users
sls deploy --stage dev --region us-east-1
```

### 11.4 CI/CD Pipeline

GitLab CI handles:
1. Linting
2. Testing
3. Version bumping
4. Deployment to preprod/prod

---

## Quick Reference Card

### Finding Things

| What | Where |
|------|-------|
| API endpoint definition | `<service>/serverless.js` → `functions` |
| Request handler | `<service>/handlers/<operation>.js` |
| Business logic | `<service>/lib/<operation>.js` |
| Shared utilities | `libs/` |
| Collection names | `libs/mongoCollections.json` |
| Error codes | `libs/httpResponses/errorCodes.ts` |
| Environment config | `env.js` |
| Permission logic | `libs/perms/checkPermsFor.ts` |

### Common Tasks

| Task | How |
|------|-----|
| Add new endpoint | 1. Create handler in `handlers/` 2. Create lib in `lib/` 3. Add to `serverless.js` |
| Add new collection | 1. Add to `mongoCollections.json` 2. Import constant where needed |
| Check permissions | `await checkPermsForApp(userId, appId, ['admin'])` |
| Parse request body | `parseAPIRequestBody(zodSchema, event.body)` |
| Return success | `return response({ code: 200, body: data })` |
| Return error | `throw new CrowdaaError(type, code, message)` |
| Query database | `await client.db().collection(COLL_X).findOne({ appId, ... })` |

---

*This guide covers the foundational concepts. For module-specific documentation, see the individual module guides.*
