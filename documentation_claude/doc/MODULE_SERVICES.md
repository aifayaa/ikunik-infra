# Service Modules Documentation

**A guide to the main service modules in the Crowdaa platform**

---

## Table of Contents

1. [Users Service](#1-users-service)
2. [Files Service](#2-files-service)
3. [Chat Service](#3-chat-service)
4. [Notifications Services](#4-notifications-services)
5. [Blast Service](#5-blast-service)
6. [Press & Articles Services](#6-press--articles-services)
7. [Purchases & Products Services](#7-purchases--products-services)
8. [Crowd Service](#8-crowd-service)

---

## 1. Users Service

### Location
`/users/`

### Purpose
User management operations including profiles, settings, and user-related data.

### Endpoints

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/users/search` | searchUser.js | Search users with filters |
| GET | `/users/export` | exportUsers.js | Export user data |
| GET | `/users/{id}` | getUser.js | Get user by ID |
| PUT | `/users/{id}` | editProfile.js | Update user profile |
| GET | `/users/{id}/profile` | getPublicProfile.js | Get public profile |
| GET | `/users/{id}/apps` | getApps.js | Get user's apps |
| GET | `/users/{id}/apps/previews` | getAppsPreviews.js | Get app previews |
| GET | `/users/{id}/balances` | getBalances.js | Get account balances |
| GET | `/users/{id}/history` | getHistory.js | Get activity history |
| POST | `/users/{id}/history` | addHistory.js | Add history entry |
| DELETE | `/users/{id}` | deleteUser.js | Delete user account |
| PUT | `/users/{id}/finalizeProfile` | finalizeProfile.js | Complete profile setup |
| PUT | `/users/{id}/settings` | editUserSettings.js | Update user settings |
| POST | `/users/{id}/phone` | sendPinCode.js | Send SMS verification |
| POST | `/users/{id}/phone/validation` | checkPinCode.js | Validate PIN code |
| POST | `/users/{id}/apiToken` | generateApiToken.js | Generate API token |
| GET | `/users/{id}/isBlastable` | isBlastable.js | Check blast eligibility |
| POST | `/users/{id}/blast/email` | blastEmail.js | Send email to user |
| POST | `/users/{id}/blast/notification` | blastNotification.js | Send push to user |
| POST | `/users/{id}/blast/text` | blastText.js | Send SMS to user |

### Key Operations

#### Search Users
```javascript
// lib/searchUser.js
const results = await searchUser(appId, {
  limit: 20,
  start: 0,
  search: 'query',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  onlyPendingBadges: false,
  onlyRejectedBadges: false
});
```

#### Edit Profile
```javascript
// lib/editProfile.js
await editProfile(userId, appId, {
  'profile.username': 'newUsername',
  'profile.bio': 'New bio'
});
```

#### Get Balances
```javascript
// lib/getBalances.js
const balances = await getBalances(userId, appId);
// Returns: { emailsBalance, textBalance, notifBalance, ... }
```

### Collections Used
- `users` - Primary user data
- `userHistory` - Activity history
- `userBalances` - Account balances
- `userBadges` - Badge assignments
- `userMetrics` - Engagement metrics
- `purchases` - Purchase records

---

## 2. Files Service

### Location
`/files/`

### Purpose
File upload, storage, and media processing (images, videos, documents).

### Endpoints

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | `/files` | getUploadUrl.js | Get presigned S3 URL |
| GET | `/files/formats` | getSupportedFileFormats.js | List supported formats |
| GET | `/files/resources` | getResourcesUrlsV2.js | Get resource URLs |
| DELETE | `/files/{id}` | deleteFile.js | Delete a file |

### Event Handlers (S3/MediaConvert)

| Event | Handler | Trigger |
|-------|---------|---------|
| S3 Create | onFileCreated.js | New file uploaded to S3 |
| MediaConvert Complete | onMediaconvertDone.ts | Video encoding done |
| MediaConvert Error | onVideoEncodeError.js | Video encoding failed |

### File Upload Flow

```
Client                        Files Service                    AWS S3
  │                                │                             │
  │  POST /files                   │                             │
  │  {type: 'image/jpeg', ...}     │                             │
  │───────────────────────────────►│                             │
  │                                │                             │
  │  {uploadUrl, resourceUrl}      │  createPresignedPost()      │
  │◄───────────────────────────────│                             │
  │                                │                             │
  │  PUT uploadUrl (binary)        │                             │
  │────────────────────────────────┼────────────────────────────►│
  │                                │                             │
  │                                │  S3 Event: ObjectCreated    │
  │                                │◄────────────────────────────│
  │                                │                             │
  │                                │  onFileCreated handler      │
  │                                │  - Create DB record         │
  │                                │  - Process image/video      │
  │                                │                             │
```

### Get Upload URL
```javascript
// lib/getUploadUrl.js
const { uploadUrl, resourceUrl } = await getUploadUrl({
  type: 'image/jpeg',  // MIME type
  userId,
  appId,
  filename: 'photo.jpg'
});
```

### S3 Buckets
- `S3_UPLOAD_BUCKET` - Initial uploads
- `S3_PICTURES_BUCKET` - Processed images
- `S3_VIDEOS_BUCKET` - Processed videos
- `S3_APPS_RESSOURCES` - App resources
- `S3_APPS_PUBLIC_RESSOURCES` - Public resources

### Collections Used
- `pictures` - Image metadata
- `video` - Video metadata
- `documents` - Document metadata

---

## 3. Chat Service

### Location
`/chat/`

### Purpose
Real-time chat functionality with Firebase Realtime Database integration.

### Endpoints

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/chat/self/session` | getChatSession.js | Get/create chat session |
| PUT | `/chat/channel/{id}/messageSent` | chatMessageSent.js | Mark message as sent |
| PUT | `/chat/self/activity` | chatSelfActivity.js | Update activity status |
| GET | `/chat/users/search` | chatUsersSearch.js | Search users for chat |
| POST | `/chat/invitations` | chatInviteUser.js | Send chat invitation |
| PUT | `/chat/invitations/{id}` | chatInvitationAction.js | Accept/reject invitation |
| PUT | `/chat/channel/{id}/leave` | chatLeaveChannel.js | Leave chat channel |

### Chat Session Flow
```javascript
// lib/getChatSession.js
const session = await getChatSession(userId, appId);
// Returns Firebase database reference and session tokens
```

### Architecture
- **Storage:** Firebase Realtime Database
- **Authentication:** Firebase Admin SDK
- **Invitations:** MongoDB (COLL_INVITATIONS)

---

## 4. Notifications Services

### Location
`/notifications/` - In-app notifications
`/pushNotifications/` - Mobile push registration

### In-App Notifications Endpoints

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/notifications` | getMyNotifications.js | Get user's notifications |
| POST | `/notifications/{id}/clicked` | notificationClicked.js | Track click |

### Push Notifications Endpoints

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | `/pushNotifications` | registerDevice.js | Register device for push |

### Getting Notifications
```javascript
// lib/getMyNotifications.js
const notifications = await getMyNotifications(userId, appId, {
  limit: 20,
  start: 0
});
```

### Registering for Push
```javascript
// lib/registerDevice.js
await registerDevice(userId, appId, {
  token: 'device-push-token',
  platform: 'ios'  // or 'android'
});
```

### Collections Used
- `notifications` - Notification messages
- `sentNotifications` - Delivery tracking
- `pushNotifications` - Device registrations
- `devices` - Device information

---

## 5. Blast Service

### Location
`/blast/`

### Purpose
Mass communication delivery (email, SMS, push notifications) with AWS Step Functions orchestration.

### Endpoints

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/blasts` | getBlasts.js | Get blast history |
| PUT | `/blast/users/push` | sendBlastUsersPush.js | Push to filtered users |

### Internal Handlers (Step Functions)

| Handler | Purpose |
|---------|---------|
| blastEmail.js | Send bulk emails via Mailgun |
| blastNotif.js | Send bulk push notifications |
| blastText.js | Send bulk SMS |
| queueNotifications.js | Queue for processing |
| unqueueNotifications.js | Remove from queue |
| removeBlastToken.js | Deduct from balance |
| sendNotifications.js | Orchestrate delivery |

### Blast Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Blast Request   │────►│ Step Function    │────►│ Queue           │
│ (API call)      │     │ State Machine    │     │ Notifications   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │                        │
                                ▼                        ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │ Balance Check    │     │ Send via        │
                        │ (has credits?)   │     │ Mailgun/SNS     │
                        └──────────────────┘     └─────────────────┘
                                │                        │
                                ▼                        ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │ Deduct Tokens    │     │ Log Delivery    │
                        └──────────────────┘     └─────────────────┘
```

### Sending Email Blast
```javascript
// lib/blastEmail.js
await blastEmail({
  userId,
  appId,
  recipients: ['user1', 'user2'],
  subject: 'Hello',
  body: '<html>...</html>'
});
```

### Collections Used
- `blasts` - Blast campaigns
- `pressBlasts` - Press blast campaigns
- `blastNotificationsQueue` - Pending notifications
- `artistEmailsBalance` - Email credits
- `artistTextMessageBalance` - SMS credits
- `artistNotificationBalance` - Push credits

### External Integrations
- **Mailgun** - Email delivery
- **AWS SNS** - Push notification handling
- **AWS Step Functions** - Workflow orchestration

---

## 6. Press & Articles Services

### Location
`/press/` - Press overview
`/pressArticles/` - Full article management

### Press Endpoints

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/press` | getPress.js | Get press releases |
| GET | `/admin/press` | getAdminPress.js | Admin press view |

### Press Articles Endpoints

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/press/articles/` | getArticles.js | Get published articles |
| GET | `/press/articles/v2/` | getArticlesV2.js | Get articles (v2) |
| GET | `/admin/press/articlesAll/` | getAllArticles.js | All articles (admin) |
| GET | `/press/articles/{id}` | getArticle.js | Get single article |
| GET | `/press/articles/{id}/draft` | getArticleDraft.js | Get article draft |
| GET | `/press/articles/{id}/shareUrl` | getArticleShareUrl.js | Get share URL |
| POST | `/press/articles` | postArticle.js | Create article |
| PUT | `/press/articles` | putArticle.js | Update article |
| PUT | `/press/articles/{id}/publish` | publishArticle.js | Publish article |
| PUT | `/press/articles/{id}/unpublish` | unpublishArticle.js | Unpublish article |
| DELETE | `/press/articles/{id}` | removeArticle.js | Delete article |
| POST | `/press/articles/{id}/purchase` | purchaseArticle.js | Purchase article |
| PUT | `/press/articles/{id}/like` | addLikeArticle.js | Like article |
| PUT | `/press/articles/{id}/view` | addViewArticle.js | Track view |
| GET | `/admin/press/articles/stats` | getArticlesStats.js | Article statistics |
| PUT | `/admin/press/articles/generate` | generateContent.js | AI content generation |

### Article Lifecycle

```
┌─────────┐    ┌─────────┐    ┌───────────┐    ┌───────────┐
│ Draft   │───►│ Review  │───►│ Published │───►│ Archived  │
└─────────┘    └─────────┘    └───────────┘    └───────────┘
     │              │               │
     ▼              ▼               ▼
   Edit          Edit           Unpublish
  Delete        Publish          Delete
```

### Creating an Article
```javascript
// lib/postArticle.js
const articleId = await postArticle(userId, appId, {
  title: 'Article Title',
  content: '<html>...</html>',
  categoryId: 'cat-123',
  tags: ['news', 'update']
});
```

### Publishing an Article
```javascript
// lib/publishArticle.js
await publishArticle(articleId, appId, {
  sendNotifications: true,  // Notify subscribers
  scheduleAt: null          // Publish immediately
});
```

### Collections Used
- `pressArticles` - Article content and metadata
- `pressArticlesCache` - Cached article data
- `pressDrafts` - Draft versions
- `pressCategories` - Categories
- `pressModals` - Article modals/popups
- `pressPolls` - Article polls
- `pressPollsVotes` - Poll votes
- `pressIapPolls` - In-app purchase polls
- `purchasableProducts` - Article access products
- `purchases` - Article purchases

### External Integrations
- **AWS Step Functions** - Notification orchestration
- **SSR Service** - HTML rendering

---

## 7. Purchases & Products Services

### Location
`/purchases/` - Purchase recovery
`/purchasableProducts/` - Product management

### Purchases Endpoints

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/purchases/hasRecoverablePurchasesFor/{id}` | hasRecoverablePurchasesFor.js | Check recoverable |
| GET | `/purchases/recoverPurchasesFor/{id}` | recoverPurchasesFor.js | Recover purchases |

### Purchasable Products Endpoints

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | `/purchasableProducts/validate` | validatePurchase.js | Validate IAP receipt |
| GET | `/purchasableProducts/` | findPurchasableProduct.js | Find products |
| GET | `/purchasableProducts/{id}` | getPurchasableProduct.js | Get product |
| POST | `/purchasableProducts/` | postPurchasableProduct.js | Create product |
| PATCH | `/purchasableProducts/{id}` | patchPurchasableProduct.js | Update product |
| DELETE | `/purchasableProducts/{id}` | deletePurchasableProduct.js | Delete product |

### Scheduled Handlers

| Handler | Schedule | Purpose |
|---------|----------|---------|
| cronSubscriptionChecks.js | Hourly | Check subscription renewals |

### Purchase Validation Flow

```
Mobile App                 API                    Apple/Google
    │                       │                         │
    │  Purchase in store    │                         │
    │──────────────────────►│                         │
    │                       │                         │
    │  Receipt data         │                         │
    │◄──────────────────────│                         │
    │                       │                         │
    │  POST /validate       │                         │
    │  {receipt, platform}  │                         │
    │──────────────────────►│                         │
    │                       │                         │
    │                       │  Validate with store    │
    │                       │────────────────────────►│
    │                       │                         │
    │                       │  Receipt valid          │
    │                       │◄────────────────────────│
    │                       │                         │
    │                       │  Record purchase        │
    │                       │  Grant access           │
    │                       │                         │
    │  {success: true}      │                         │
    │◄──────────────────────│                         │
```

### Validating a Purchase
```javascript
// lib/validatePurchase.js
const result = await validatePurchase({
  userId,
  appId,
  receipt: 'base64-receipt-data',
  platform: 'ios',  // or 'android'
  productId: 'prod-123'
});
```

### Product Document Structure
```javascript
{
  _id: 'prod-123',
  appId: 'app-123',
  type: 'subscription',  // or 'consumable', 'non-consumable'
  price: 9.99,
  contents: ['article-1', 'article-2'],  // What this unlocks
  options: {
    appleProductId: 'com.app.product',
    googleProductId: 'product_sku',
    expiresIn: 30 * 24 * 60 * 60 * 1000  // 30 days
  },
  createdAt: Date
}
```

### Collections Used
- `purchasableProducts` - Product definitions
- `purchases` - Purchase records
- `externalPurchases` - External store purchases
- `userSubscriptions` - Active subscriptions
- `subscriptions` - Subscription metadata

### External Integrations
- **Apple App Store** - iOS receipt validation
- **Google Play** - Android receipt validation
- **in-app-purchase** npm library

---

## 8. Crowd Service

### Location
`/crowd/`

### Purpose
Audience targeting and mass operations (search, filter, blast, mass update).

### Endpoints

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/admin/crowd/search` | crowdSearch.js | Search/filter users |
| GET | `/admin/crowd/search.geojson` | crowdSearchGeoJSON.js | GeoJSON search |
| GET | `/admin/crowd/last.geojson` | crowdLastGeoJSON.js | Latest locations |
| POST | `/crowd/blast/email` | blastSearchEmail.js | Email filtered users |
| POST | `/crowd/blast/notification` | blastSearchNotification.js | Push filtered users |
| POST | `/crowd/blast/text` | blastSearchText.js | SMS filtered users |
| GET | `/admin/press/crowd` | pressSearch.js | Press audience search |
| POST | `/admin/press/crowd/blast/notifications` | pressBlastSearchNotification.js | Press push blast |
| POST | `/admin/crowd/{action}` | crowdMassUpdate.js | Bulk user operations |

### Search Filters

| Parameter | Type | Description |
|-----------|------|-------------|
| search | string | Text search (name, email, username) |
| city | string | Filter by city |
| country | string | Filter by country |
| coordinates | array | Geo-coordinates |
| minimumAge | number | Minimum age |
| maximumAge | number | Maximum age |
| gender | string | Gender filter |
| hasEmail | boolean | Has email address |
| hasNotification | boolean | Has push enabled |
| hasText | boolean | Has phone number |
| languages | array | Language preferences |
| purchased | boolean | Has made purchases |
| articleId | string | Engaged with article |
| limit | number | Results limit |
| page | number | Page number |
| sortBy | string | Sort field |
| sortOrder | string | 'asc' or 'desc' |

### Crowd Search Example
```javascript
// lib/crowdSearch.js
const results = await crowdSearch(appId, {
  search: 'john',
  city: 'New York',
  minimumAge: 18,
  hasEmail: true,
  limit: 100
});
```

### Mass Update Operations
```javascript
// lib/crowdMassUpdate.js
await crowdMassUpdate(appId, {
  action: 'assignBadge',
  badgeId: 'badge-123',
  filters: {
    city: 'Paris',
    hasNotification: true
  }
});
```

### Aggregation Pipeline

The service uses MongoDB aggregation pipelines for complex queries:

```javascript
// lib/pipelines/crowdPipeline.js
const pipeline = [
  { $match: { appId } },
  { $lookup: { from: 'userBadges', ... } },
  { $match: { /* filters */ } },
  { $sort: { [sortBy]: sortOrder } },
  { $skip: start },
  { $limit: limit },
  { $project: { /* fields */ } }
];
```

### Collections Used
- `users` - User data
- `userBadges` - Badge assignments
- `userMetrics` - Engagement metrics
- `userBalances` - Account balances
- `userHistory` - Activity history
- `purchases` - Purchase records
- `pressArticles` - For article-based filtering

---

## Service Dependencies Matrix

```
                     ┌─────────┬─────────┬─────────┬─────────┬─────────┐
                     │ MongoDB │ Firebase│   S3    │   SNS   │ Step Fn │
┌────────────────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ Users              │    ✓    │         │         │         │         │
├────────────────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ Files              │    ✓    │         │    ✓    │         │    ✓    │
├────────────────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ Chat               │    ✓    │    ✓    │         │         │         │
├────────────────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ Notifications      │    ✓    │         │         │         │         │
├────────────────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ Push Notifications │    ✓    │    ✓    │         │    ✓    │         │
├────────────────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ Blast              │    ✓    │         │         │    ✓    │    ✓    │
├────────────────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ Press Articles     │    ✓    │         │         │         │    ✓    │
├────────────────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ Purchases          │    ✓    │         │         │         │         │
├────────────────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ Products           │    ✓    │         │         │         │         │
├────────────────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ Crowd              │    ✓    │         │         │         │         │
└────────────────────┴─────────┴─────────┴─────────┴─────────┴─────────┘
```

---

## Quick Reference

### Finding Service Code

1. **API Route → Handler:** Check `serverless.js` → `functions`
2. **Handler → Business Logic:** Handler imports from `../lib/`
3. **Database Collection:** Check `libs/mongoCollections.json`
4. **Shared Utilities:** Check `libs/` directory

### Common Import Pattern

```javascript
/* eslint-disable import/no-relative-packages */
// Business logic
import { operation } from '../lib/operation';

// Response utilities
import response from '../../libs/httpResponses/response.ts';
import errorMessage from '../../libs/httpResponses/errorMessage';

// Permissions
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

// Database
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
```

### Standard Handler Template

```javascript
export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    await checkPermsForApp(userId, appId, ['admin']);
    const result = await businessLogic(appId, ...);
    return response({ code: 200, body: result });
  } catch (e) {
    return response(errorMessage(e));
  }
};
```
