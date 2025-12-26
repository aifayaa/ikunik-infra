# AWS & Serverless Configuration Security Report

**Date:** December 5, 2025
**Scope:** AWS Lambda, API Gateway, IAM, S3, and Serverless Framework configurations

---

## Executive Summary

The AWS and Serverless configuration contains multiple security misconfigurations that could lead to privilege escalation, data exposure, and service compromise. Key issues include overly permissive IAM policies, exposed credentials, and inadequate API Gateway security controls.

---

## 1. IAM Permission Issues

### 1.1 Wildcard Lambda Invoke (CRITICAL)

**Affected Services:**
| Service | File | Line |
|---------|------|------|
| users | serverless.js | 50 |
| chat | serverless.js | 20 |
| media | serverless.js | 17 |
| appsStripe | serverless.js | 82 |
| auth | serverless.js | 39 |
| pressAutomation | serverless.js | - |
| forum | serverless.js | - |
| userReactions | serverless.js | - |
| userBadges | serverless.js | - |

**Current Configuration:**
```javascript
{
  Effect: 'Allow',
  Action: ['lambda:InvokeFunction'],
  Resource: '*',
}
```

**Risk:** Any Lambda function can invoke any other Lambda in the AWS account, enabling lateral movement and privilege escalation.

**Recommended Fix:**
```javascript
{
  Effect: 'Allow',
  Action: ['lambda:InvokeFunction'],
  Resource: [
    'arn:aws:lambda:${self:provider.region}:${aws:accountId}:function:crowdaa-${self:provider.stage}-*'
  ],
}
```

---

### 1.2 Wildcard S3 Permissions (HIGH)

**File:** `files/serverless.js` Lines 27, 33, 39

**Current Configuration:**
```javascript
{
  Effect: 'Allow',
  Action: ['s3:*'],
  Resource: 'arn:aws:s3:::${self:provider.environment.S3_UPLOAD_BUCKET}/*'
}
```

**Risk:** Lambda has full S3 control including:
- `s3:DeleteBucket`
- `s3:PutBucketAcl` (make public)
- `s3:PutBucketPolicy`

**Recommended Fix:**
```javascript
{
  Effect: 'Allow',
  Action: [
    's3:GetObject',
    's3:PutObject',
    's3:DeleteObject'
  ],
  Resource: 'arn:aws:s3:::${self:provider.environment.S3_UPLOAD_BUCKET}/*'
}
```

---

### 1.3 Broad EC2 Permissions (MEDIUM)

**File:** `auth/serverless.js` Lines 45-51

```javascript
{
  Effect: 'Allow',
  Action: [
    'ec2:DescribeNetworkInterfaces',
    'ec2:CreateNetworkInterface',
    'ec2:DeleteNetworkInterface',
    'ec2:DescribeInstances',
    'ec2:AttachNetworkInterface',
  ],
  Resource: '*',
}
```

**Risk:** These are VPC ENI permissions, but `ec2:DescribeInstances` is unnecessary and allows reconnaissance.

---

### 1.4 Dangerous S3 Permissions (HIGH)

**File:** `liveStream/serverless.js` Lines 110-116

```javascript
{
  Effect: 'Allow',
  Action: ['s3:CreateBucket', 's3:ListAllMyBuckets'],
  Resource: '*',
}
```

**Risk:** Lambda can create arbitrary S3 buckets in the account.

---

## 2. Exposed Credentials

### 2.1 Hardcoded API Key (CRITICAL)

**File:** `env.js` Line 5
```javascript
APP_API_KEY_DEFAULT: 'nQ9ZO9DEgfaOzWY44Xu2J2uaPtP92t176PpBkdqu',
```

**Immediate Action Required:**
1. Rotate this key immediately
2. Move to SSM Parameter Store:
```javascript
APP_API_KEY_DEFAULT: '${ssm:/crowdaa/${self:provider.stage}/app-api-key-default~true}'
```

---

### 2.2 AWS Account ID Exposure (HIGH)

**116 occurrences** of AWS account ID found across serverless configuration files.

**Example Locations:**
- `liveStream/serverless.js` Lines 20, 23, 25, 33, 37, 39...
- `appLiveStreams/serverless.js`
- `files/serverless.js` Lines 55, 233, 245, 257, 267
- `userGeneratedContents/serverless.js`

**Risk:** Account IDs aid targeted attacks and are used in ARN construction for unauthorized access attempts.

**Recommended Fix:** Use CloudFormation references:
```javascript
Resource: `arn:aws:lambda:${self:provider.region}:${AWS::AccountId}:function:*`
```

---

### 2.3 S3 Bucket Names Exposed (MEDIUM)

**File:** `env.js` Lines 27-28
```javascript
S3_BUCKET: 'crowdaa-user-content',
S3_BUCKET_TOS: 'crowdaa-tos',
```

Bucket names are globally unique and enumerable. Combined with misconfigured ACLs, this could lead to data exposure.

---

## 3. API Gateway Security

### 3.1 Open CORS Configuration (HIGH)

**File:** `auth/serverless.js` Lines 149-161

```javascript
cors: {
  origin: '*',
  headers: [
    'Content-Type',
    'X-Amz-Date',
    'Authorization',
    'X-Api-Key',
    'X-Amz-Security-Token',
    'X-Amz-User-Agent',
    'X-User-Id',
  ],
}
```

**Risk:** Any domain can make authenticated requests. Combined with XSS vulnerabilities, this enables credential theft.

**Recommended Fix:**
```javascript
cors: {
  origin: [
    'https://app.crowdaa.com',
    'https://admin.crowdaa.com'
  ],
  // ...
}
```

---

### 3.2 Disabled Request Validators (MEDIUM)

**All serverless.js files:**
```javascript
{
  'serverless-disable-request-validators': {
    action: 'delete',
  },
}
```

**Risk:** Invalid requests reach Lambda functions, increasing attack surface and cost.

**Recommendation:** Enable request validators for all endpoints with body schemas.

---

### 3.3 Authorizer Cache Disabled (MEDIUM)

**File:** `account/serverless.js` Multiple locations

```javascript
AuthorizerResultTtlInSeconds: 0,
```

**Issues:**
1. Every request invokes authorizer Lambda (cost + latency)
2. No protection against timing attacks
3. Increased attack surface for authorization bypass

**Recommendation:** Set TTL to 300 seconds (5 minutes):
```javascript
AuthorizerResultTtlInSeconds: 300,
```

---

## 4. CloudFormation Security

### 4.1 Sensitive Data in Exports (MEDIUM)

**File:** `api-v1/serverless.js` Lines 235-280

```javascript
MongoURL: {
  Description: 'MongoDB URL',
  Value: '${self:custom.mongoDB.${self:provider.stage}.${self:provider.region}}',
  Export: {
    Name: '${self:service}:${self:provider.stage}:MongoURL',
  },
},
```

**Risk:** CloudFormation exports are visible to anyone with `cloudformation:ListExports` permission.

**Recommendation:** Use SSM Parameter Store for cross-stack references.

---

## 5. Lambda Configuration

### 5.1 Insufficient Memory Allocation (MEDIUM)

Most services default to 128MB, which is minimal for Node.js:

```javascript
memorySize: 128,  // Default in most services
```

**Issues:**
- Cold start latency increased
- Node.js garbage collection issues
- Potential OOM on complex operations

**Recommendation:** Minimum 256MB for most functions, 512MB for handlers with image/file processing.

---

### 5.2 Inconsistent Timeout Configuration

**Examples:**
- Most functions: 30 seconds (default)
- State machines: 600 seconds
- Some functions: undefined (inherits default)

**Risk:** Functions calling external APIs may timeout unpredictably.

---

## 6. Deployment Security

### 6.1 Predictable Deployment Bucket (LOW)

```javascript
deploymentBucket: 'ms-deployment-${self:provider.region}',
```

Bucket names are predictable (`ms-deployment-us-east-1`, `ms-deployment-eu-west-3`).

---

### 6.2 No Build Security Controls (MEDIUM)

**File:** `buildspec/ms-deploy-release.yml`
```yaml
- ./deployDiff.sh prod "$AWS_REGION"
```

No artifact signing, integrity verification, or deployment approval gates.

---

## 7. Logging Configuration

### 7.1 Log Retention (INFO)

**Positive:** 7-day log retention configured via `serverless-plugin-log-retention`.

### 7.2 Logging Level (INFO)

```javascript
LoggingLevel: 'INFO',
```

Consider `ERROR` only for sensitive endpoints to reduce exposure.

---

## 8. Remediation Summary

### Immediate (P0)
| Issue | Action | Effort |
|-------|--------|--------|
| Hardcoded API key | Rotate + move to SSM | 2 hours |
| Wildcard Lambda invoke | Scope to service prefix | 4 hours |
| Wildcard S3 permissions | Reduce to needed actions | 2 hours |

### High Priority (P1)
| Issue | Action | Effort |
|-------|--------|--------|
| CORS origin: * | Whitelist allowed domains | 2 hours |
| AWS Account ID exposure | Use CloudFormation refs | 8 hours |
| S3:CreateBucket permission | Remove or scope | 1 hour |

### Medium Priority (P2)
| Issue | Action | Effort |
|-------|--------|--------|
| Disabled request validators | Enable + add schemas | 16 hours |
| Authorizer cache disabled | Set appropriate TTL | 2 hours |
| CloudFormation exports | Move to SSM | 4 hours |
| Memory allocation | Increase to 256MB+ | 2 hours |

---

## 9. Security Architecture Recommendations

### 9.1 Implement VPC for Lambda
Currently, Lambda functions appear to run in public subnets. Consider:
- Private subnets for database access
- VPC endpoints for AWS services
- Security groups for network isolation

### 9.2 Enable AWS Config Rules
- `lambda-function-public-access-prohibited`
- `s3-bucket-public-read-prohibited`
- `iam-policy-no-statements-with-admin-access`

### 9.3 Enable CloudTrail
Ensure CloudTrail is logging:
- Lambda invocations
- API Gateway access
- S3 data events (for sensitive buckets)

### 9.4 Implement AWS WAF
Add Web Application Firewall rules for:
- Rate limiting
- SQL injection protection
- Known bad actors (IP reputation)

---

## Appendix: Files Requiring Changes

```
env.js                              # Remove hardcoded credentials
account/serverless.js               # Fix authorizer TTL
auth/serverless.js                  # Fix CORS, reduce permissions
files/serverless.js                 # Reduce S3 permissions
users/serverless.js                 # Scope Lambda invoke
chat/serverless.js                  # Scope Lambda invoke
media/serverless.js                 # Scope Lambda invoke
liveStream/serverless.js            # Remove s3:CreateBucket
api-v1/serverless.js                # Remove sensitive exports
```
