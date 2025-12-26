# Authentication & Authorization Module

**Services:** `account/`, `auth/`

---

## Overview

The Crowdaa authentication system is split into two services:

1. **auth/** - Handles user authentication (verifying identity)
2. **account/** - Handles authorization (checking permissions)

The system supports multiple authentication backends including native credentials, WordPress, OAuth providers (Facebook, Apple, Twitter, Instagram), SAML, and OIDC.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Custom Authorizer                             │
│                   (account/ service)                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  1. Extract token from Authorization header              │   │
│  │  2. Hash token (SHA-256)                                 │   │
│  │  3. Query MongoDB for user with matching token           │   │
│  │  4. Generate IAM policy (allow/deny)                     │   │
│  │  5. Attach context (userId, appId, perms, roles)         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Lambda Handler                                │
│  event.requestContext.authorizer contains:                       │
│  - principalId (userId)                                          │
│  - appId                                                         │
│  - perms (serialized JSON)                                       │
│  - roles                                                         │
│  - superAdmin                                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Account Service (Authorization)

### Location
`/account/`

### Purpose
Provides AWS API Gateway Lambda Authorizers that validate tokens and attach user context to requests.

### Authorizer Types

| Authorizer | File | Use Case | Context Provided |
|------------|------|----------|------------------|
| `authorize` | `authorize.js` | Standard user requests | userId, appId, superAdmin, loginToken |
| `authorizeWithPerms` | `authorizeWithPerms.js` | Endpoints needing permission checks | userId, appId, perms, profileId, superAdmin |
| `authorizeRole` | `authorizeRole.js` | Role-based access | userId, appId, roles, profileId, superAdmin |
| `authorizeArtist` | `authorizeArtist.js` | Artist-only endpoints | userId, appId, profileId, superAdmin |
| `authorizePublic` | `authorizePublic.js` | Public/optional auth | appId, (userId if authenticated) |
| `authorizeAdmin` | `authorizeAdmin.js` | Admin-only endpoints | userId, superAdmin |
| `authorizeNoApp` | `authorizeNoApp.js` | System endpoints | userId, superAdmin |

### How Authorization Works

#### 1. Token Extraction
```javascript
// handlers/authorize.js
const authorizationToken = headers.authorization || headers.Authorization;
const loginToken = authorizationToken.split(' ')[1];  // "Bearer <token>"
```

#### 2. Token Hashing
```javascript
// lib/hashLoginToken.ts
const hash = crypto.createHash('sha256');
hash.update(loginToken);
return hash.digest('base64');
```

#### 3. User Lookup
```javascript
// lib/authorizeUser.js
const user = await usersCollection.findOne({
  $or: [
    { 'services.resume.loginTokens.hashedToken': hashedToken },
    { 'services.apiTokens.hashedToken': hashedToken },
  ],
  appId: { $in: [appId, ADMIN_APP] }
});
```

#### 4. Policy Generation
```javascript
// lib/generatePolicy.js
return {
  principalId: userId,
  policyDocument: {
    Version: '2012-10-17',
    Statement: [{
      Action: 'execute-api:Invoke',
      Effect: 'Allow',  // or 'Deny'
      Resource: '*'
    }]
  },
  context: {
    userId, appId, perms, roles, superAdmin, profileId
  }
};
```

### Key Files

| File | Purpose |
|------|---------|
| `handlers/authorize.js` | Standard authorization |
| `handlers/authorizeWithPerms.js` | Auth with permissions lookup |
| `handlers/authorizeRole.js` | Auth with roles lookup |
| `handlers/authorizeAdmin.js` | Admin-only authorization |
| `lib/authorizeUser.js` | User lookup by token |
| `lib/generatePolicy.js` | IAM policy generation |
| `lib/getAppFromKey.js` | App lookup by API key |
| `lib/oldPerms.js` | Default super admin permissions |

### Using Authorizers in serverless.js

```javascript
// In any service's serverless.js
functions: {
  myFunction: {
    handler: 'handlers/myFunction.default',
    events: [{
      http: {
        path: 'my-path',
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

**Available Authorizer IDs:**
- `ApiGatewayAuthorizerId` - Standard auth
- `ApiGatewayAuthorizerWithPermsId` - With permissions
- `ApiGatewayAuthorizerRoleId` - With roles
- `ApiGatewayAuthorizerArtistId` - Artist only
- `ApiGatewayAuthorizerPublicId` - Public/optional
- `ApiGatewayAuthorizerAdminId` - Admin only
- `ApiGatewayAuthorizerNoAppId` - No app context

---

## Auth Service (Authentication)

### Location
`/auth/`

### Purpose
Handles user login, registration, password management, and social authentication.

### Endpoints

| Method | Path | Handler | Purpose |
|--------|------|---------|---------|
| POST | `/auth/login` | login.js | Email/password login |
| POST | `/auth/register` | register.js | User registration |
| POST | `/auth/logout` | logout.js | Session termination |
| POST | `/auth/changePassword` | changePassword.js | Change password |
| POST | `/auth/forgotPassword` | forgotPassword.js | Request reset |
| POST | `/auth/resetPassword` | resetPassword.js | Apply reset |
| POST | `/auth/validateEmail` | validateEmail.js | Email verification |
| POST | `/auth/facebook` | facebookLogin.js | Facebook OAuth |
| POST | `/auth/apple` | appleLogin.js | Apple Sign-In |
| POST | `/auth/oidc` | oidcLogin.js | OIDC login |
| POST | `/auth/saml` | samlLogin.js | SAML login |
| POST | `/auth/saml/acs` | samlACSCallback.js | SAML callback |

### Authentication Backends

#### Native (Crowdaa)
Default authentication using email/username and password.

```javascript
// lib/backends/crowdaaLogin.ts
export const crowdaaLogin = async (username, rawEmail, password, app) => {
  // Find user by email or username
  const selector = { appId };
  if (rawEmail) {
    selector['emails.address'] = rawEmail.toLowerCase();
  } else {
    selector.username = username;
  }

  const user = await usersCollection.findOne(selector);

  // Verify password (bcrypt)
  await checkPassword(user, password);

  // Generate session token
  const token = Random.secret();
  await addSessionTokenFor(user._id, appId, token);

  return { userId: user._id, authToken: token, user };
};
```

#### WordPress
For apps with WordPress backend integration.

```javascript
// App configuration
app.backend = { type: 'wordpress', url: 'https://...' };

// Login flow delegates to WordPress API
const result = await wordpressLogin(username, password, app);
```

#### OAuth (Facebook, Apple, Twitter, Instagram)
Social login via OAuth providers.

#### SAML
Enterprise SSO via SAML 2.0.

#### OIDC
Generic OpenID Connect providers with JWKS validation.

### Password Security

#### Hashing (Two-Layer)
```javascript
// lib/password.ts

// Layer 1: SHA-256 (client-friendly)
const getPasswordString = (password) => {
  if (typeof password === 'string') {
    const hash = crypto.createHash('sha256');
    hash.update(password);
    return hash.digest('hex');
  }
  return password.digest;  // Already hashed
};

// Layer 2: bcrypt (10 rounds)
const hashPassword = (password) => {
  return bcrypt.hash(getPasswordString(password), 10);
};
```

#### Verification
```javascript
const checkPassword = async (user, password) => {
  const hash = user.services.password?.bcrypt;
  const formatted = getPasswordString(password);

  if (!(await bcrypt.compare(formatted, hash))) {
    throw new Error('incorrect_password');
  }
};
```

### Token System

#### Token Generation
```javascript
// lib/addSessionTokenFor.ts
const token = Random.secret();  // Cryptographically secure
const hashedToken = hashLoginToken(token);  // SHA-256

await usersCollection.updateOne(
  { _id: userId, appId },
  {
    $addToSet: {
      'services.resume.loginTokens': {
        hashedToken,
        when: new Date()
      }
    }
  }
);

return token;  // Return unhashed to client
```

#### Token Storage (User Document)
```javascript
{
  _id: 'user-id',
  services: {
    resume: {
      loginTokens: [
        { hashedToken: 'base64...', when: Date, backend: 'crowdaa' },
        { hashedToken: 'base64...', when: Date, backend: 'wordpress', wpToken: '...', expiresAt: timestamp }
      ]
    },
    password: {
      bcrypt: '$2a$10$...'
    },
    apiTokens: [
      { hashedToken: 'base64...' }
    ]
  }
}
```

### Login Flow

```
Client                    API Gateway                Auth Service               Database
  │                           │                           │                        │
  │  POST /auth/login         │                           │                        │
  │  {email, password}        │                           │                        │
  │─────────────────────────►│                           │                        │
  │                           │                           │                        │
  │                           │  invoke login handler     │                        │
  │                           │──────────────────────────►│                        │
  │                           │                           │                        │
  │                           │                           │  findOne(email)        │
  │                           │                           │───────────────────────►│
  │                           │                           │◄───────────────────────│
  │                           │                           │                        │
  │                           │                           │  bcrypt.compare()      │
  │                           │                           │                        │
  │                           │                           │  Generate token        │
  │                           │                           │  Hash token (SHA-256)  │
  │                           │                           │                        │
  │                           │                           │  updateOne (add token) │
  │                           │                           │───────────────────────►│
  │                           │                           │◄───────────────────────│
  │                           │                           │                        │
  │                           │  {userId, authToken, user}│                        │
  │                           │◄──────────────────────────│                        │
  │                           │                           │                        │
  │  200 OK                   │                           │                        │
  │  {userId, authToken}      │                           │                        │
  │◄─────────────────────────│                           │                        │
```

### Registration Flow

```javascript
// lib/register.js
export const register = async (email, username, password, appId, options) => {
  // 1. Check app plan quota
  const allowed = await checkAppPlanForLimitIncrease(app, 'activeUsers', ...);
  if (!allowed) throw new CrowdaaError(...);

  // 2. Route to backend
  if (app.backend?.type === 'wordpress') {
    return wordpressRegister(email, username, password, app);
  }
  return crowdaaRegister(email, username, password, app, options);
};

// lib/backends/crowdaaRegister.ts
export const crowdaaRegister = async (...) => {
  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user document
  const user = {
    _id: new ObjectID().toString(),
    createdAt: new Date(),
    emails: [{ address: email.toLowerCase() }],
    username,
    services: { password: { bcrypt: hashedPassword } },
    appId,
    profile: { username, email },
    badges: app.defaultBadges || []
  };

  // Insert with duplicate check
  await usersCollection.insertOne(user);

  // Generate token and return
  const token = await addSessionTokenFor(user._id, appId);
  return { userId: user._id, authToken: token };
};
```

### Password Reset Flow

#### 1. Forgot Password
```javascript
// handlers/forgotPassword.js -> lib/forgotPassword.js
const token = crypto.randomBytes(3).toString('hex').toUpperCase();  // 6-char token

await usersCollection.updateOne(
  { _id: user._id },
  { $set: { 'services.password.reset': { token, when: new Date() } } }
);

// Send email with reset link
const url = `${REACT_APP_AUTH_URL}/password-reset-landing?token=${token}&email=${email}`;
await sendEmail({ to: email, subject: 'Reset Password', html: template });
```

#### 2. Reset Password
```javascript
// handlers/resetPassword.js -> lib/resetPassword.js
// Validate token
const user = await usersCollection.findOne({
  'emails.address': email,
  'services.password.reset.token': token,
  appId
});

// Hash new password and clear all sessions
await usersCollection.updateOne(
  { _id: user._id },
  {
    $set: {
      'services.resume.loginTokens': [],  // Force re-login everywhere
      'services.password.bcrypt': await hashPassword(newPassword),
      'emails.$.verified': true
    },
    $unset: { 'services.password.reset': '' }
  }
);
```

---

## Permission System

### Location
`libs/perms/checkPermsFor.ts`

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

### Role Hierarchies

**Apps:** `owner > admin > editor > moderator > viewer`
**Organizations:** `owner > admin > member`
**Websites:** `owner > admin`

### Permission Checking

```javascript
import { checkPermsForApp, checkFeaturePermsForApp } from '../../libs/perms/checkPermsFor.ts';

// Check app-level permission (throws if denied)
await checkPermsForApp(userId, appId, ['admin', 'editor']);

// Check with feature permissions (badges)
await checkFeaturePermsForApp(userId, appId, ['articlesEditor']);

// Silent check (returns boolean)
const hasAccess = await checkPermsForApp(userId, appId, ['admin'], { dontThrow: true });

// Check organization permission
await checkPermsForOrganization(userId, orgId, ['admin']);

// Check super admin
await checkPermsIsSuperAdmin(userId);
```

### Permission Groups

Users can be assigned to permission groups:

```javascript
// User document
user.permGroupIds = ['group-1', 'group-2'];

// Permission group document
{
  _id: 'group-1',
  appId: 'app-1',
  name: 'Editors',
  perms: {
    apps_getInfos: true,
    pressArticles_all: true,
    files_upload: true
  }
}
```

### Super Admin Permissions

Super admins (`user.superAdmin === true`) get all permissions from `oldPerms.js`:

```javascript
export const allOldPerms = {
  apps_getInfos: true,
  apps_getProfile: true,
  crowd_blast: true,
  files_upload: true,
  pressArticles_all: true,
  pressCategories_all: true,
  search_press: true,
  userGeneratedContents_all: true,
  userGeneratedContents_notify: true
};
```

---

## Session Management

### Logout

```javascript
// handlers/logout.js
const loginToken = headers['x-auth-token'] || headers['X-Auth-Token'];
const hashedToken = hashLoginToken(loginToken);

await usersCollection.updateOne(
  { _id: userId, appId },
  { $pull: { 'services.resume.loginTokens': { hashedToken } } }
);
```

### Session Checks (WordPress)

For WordPress backends, sessions are periodically validated:

```javascript
// lib/sessionChecks.js
if (app.backend.type === 'wordpress' && loginTokenObj.backend === 'wordpress') {
  // Call WordPress API to validate session
  const response = await wpApi.authCall('GET', '/crowdaa-sync/v1/session/checks', wpToken);

  // Handle token refresh
  if (response.token !== loginTokenObj.wpToken) {
    // Update stored token
  }
}
```

### Token Expiration (WordPress)

```javascript
// lib/authorizeUser.js
if (dbToken.backend === 'wordpress' && dbToken.expiresAt <= Date.now()) {
  // Remove expired token
  await usersCollection.updateOne(
    { _id: user._id },
    { $pull: { 'services.resume.loginTokens': dbToken } }
  );
  return null;  // Deny access
}
```

---

## Key Files Reference

### Account Service
| File | Purpose |
|------|---------|
| `handlers/authorize.js` | Standard authorizer |
| `handlers/authorizeWithPerms.js` | Permissions authorizer |
| `handlers/authorizeRole.js` | Roles authorizer |
| `handlers/authorizeAdmin.js` | Admin authorizer |
| `handlers/authorizeArtist.js` | Artist authorizer |
| `handlers/authorizePublic.js` | Public authorizer |
| `handlers/authorizeNoApp.js` | No-app authorizer |
| `lib/authorizeUser.js` | User token lookup |
| `lib/authorizeWithPerms.js` | Permissions lookup |
| `lib/generatePolicy.js` | IAM policy generation |
| `lib/getAppFromKey.js` | App lookup by API key |
| `lib/hashLoginToken.ts` | Token hashing |

### Auth Service
| File | Purpose |
|------|---------|
| `handlers/login.js` | Login endpoint |
| `handlers/register.js` | Registration endpoint |
| `handlers/logout.js` | Logout endpoint |
| `handlers/changePassword.js` | Change password |
| `handlers/forgotPassword.js` | Request reset |
| `handlers/resetPassword.js` | Apply reset |
| `handlers/appleLogin.js` | Apple Sign-In |
| `handlers/facebookLogin.js` | Facebook OAuth |
| `handlers/oidcLogin.js` | OIDC login |
| `handlers/samlLogin.js` | SAML login |
| `lib/login.js` | Login orchestration |
| `lib/register.js` | Registration orchestration |
| `lib/backends/crowdaaLogin.ts` | Native login |
| `lib/backends/crowdaaRegister.ts` | Native registration |
| `lib/backends/wordpressLogin.ts` | WordPress login |
| `lib/password.ts` | Password hashing |
| `lib/addSessionTokenFor.ts` | Token generation |
| `lib/hashLoginToken.ts` | Token hashing |
| `lib/sessionChecks.js` | Session validation |

### Shared Permissions
| File | Purpose |
|------|---------|
| `libs/perms/checkPermsFor.ts` | Permission checking |
| `libs/tokens/generateToken.js` | Token generation |
| `libs/tokens/hashToken.js` | Token hashing |

---

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `user_not_found` | 404 | User doesn't exist |
| `incorrect_password` | 401 | Wrong password |
| `missing_payload` | 400 | No request body |
| `missing_arguments` | 400 | Required field missing |
| `email_already_exists` | 409 | Email taken |
| `username_already_exists` | 409 | Username taken |
| `token_expired` | 403 | Session expired |
| `access_forbidden` | 403 | Permission denied |
| `invalid_token` | 401 | JWT validation failed |
