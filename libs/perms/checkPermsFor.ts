/* eslint-disable import/no-relative-packages */
import MongoClient from '../mongoClient.js';
import mongoCollections from '../mongoCollections.json';

import { CrowdaaError } from '../httpResponses/CrowdaaError';
import {
  APPLICATION_OUTSIDE_ORGANIZATION_CODE,
  APPLICATION_PERMISSION_CODE,
  ERROR_TYPE_ACCESS,
  ERROR_TYPE_NOT_ALLOWED,
  ERROR_TYPE_NOT_FOUND,
  ORGANIZATION_NOT_FOUND_CODE,
  ORGANIZATION_PERMISSION_CODE,
  USER_NOT_FOUND_CODE,
  SUPERADMIN_PERMISSION_CODE,
  FEATURE_PERMISSION_CODE,
} from '../httpResponses/errorCodes';
import { UserType } from '../../users/lib/userEntity';
import {
  AppsPermType,
  OrganizationPermType,
  OrganizationPermRanking,
  AppsFeaturePermType,
} from './permEntities';
import { getApp } from '../../apps/lib/appsUtils';
import { AppInOrgType, AppType } from '../../apps/lib/appEntity';
import BadgeChecker from '@libs/badges/BadgeChecker.js';
import { UserBadgeGenericEntryEntity } from 'userBadges/lib/userBadgesEntities.js';

const { COLL_USERS, COLL_ORGANIZATIONS, COLL_WEBSITES } = mongoCollections;

/**
 * Example of user.perms structure :
const user = {
  perms: {
    apps: [
      {
        _id: 'some-app-id',
        roles: ['owner', 'admin', 'editor', 'moderator', 'viewer'],
      },
    ],
    websites: [
      {
        _id: 'some-website-id',
        roles: ['owner', 'admin'],
      },
    ],
    organizations: [
      {
        _id: 'some-org-id1',
        roles: ['owner', 'admin', 'member'],
      },
    ],
  },
};

 * Example of app structure concerning organization permission:
const app = {
  _id: "app-id-string"
  ...
  organization: {
    _id: "org-id-string",
    users: [
      {
        _id: 'user-0-id-string',
        roles: ['admin', 'editor', 'moderator', 'viewer']
      },
      {
        _id: 'user-1-id-string',
        roles: ['admin', 'editor', 'moderator', 'viewer']
      },
    ]
  }
}

 * Example of website structure concerning organization permission:
const website = {
  _id: "website-id-string"
  ...
  organization: {
    _id: "org-id-string",
    users: [
      {
        _id: 'user-0-id-string',
        roles: ['admin', 'editor', 'moderator', 'viewer']
      },
      {
        _id: 'user-1-id-string',
        roles: ['admin', 'editor', 'moderator', 'viewer']
      },
    ]
  }
}

*****************************************************************************

Current organization roles stories

An organization owner:
  - can CRUD any resource within the organization

An organization admin:
  - can CRUD any resource within the organization, but:
  - cannot DELETE the organization
  - cannot DELETE an app of the organization
  - cannot DELETE a website of the organization

An organization member:
  - can READ any resource within the organization
 */

const APP_PERMS_IMPLIED = {
  owner: [],
  admin: ['owner'],
  editor: ['owner', 'admin'],
  moderator: ['owner', 'admin'],
  viewer: ['owner', 'admin'],
} as {
  [key in AppsPermType]: Array<AppsPermType>;
};

const WEBSITE_PERMS_IMPLIED = {
  admin: ['owner'],
};

const ORGANIZATION_PERMS_IMPLIED = {
  owner: [],
  admin: ['owner'],
  member: ['admin', 'owner'],
} as {
  [key in OrganizationPermType]: Array<OrganizationPermType>;
};

function areArraysIntersecting(a1: Array<string>, a2: Array<string>) {
  if (!a1) a1 = [];
  if (!a2) a2 = [];
  const intersect = !a1.every((i) => a2.indexOf(i) < 0);
  return intersect;
}

async function getOrgIdOfWebsite(websiteId: string) {
  const client = await MongoClient.connect();

  try {
    const website = await client
      .db()
      .collection(COLL_WEBSITES)
      .findOne({ _id: websiteId }, { projection: { organization: 1 } });

    if (!website || !website.organization) {
      return null;
    }
    return website.organization._id;
  } finally {
    client.close();
  }
}

/**
 * Returns user permissions. It is not backward compatible with old permissions system.
 * @param {string} userId The user ID
 * @param {string} websiteId The app ID
 * @returns An object of permissions (stored in the user as user.perms)
 */
async function getUserPermsOnWebsite(userId: string, websiteId: string) {
  const client = await MongoClient.connect();
  try {
    const user: UserType = await client
      .db()
      .collection(COLL_USERS)
      .findOne({ _id: userId }, { projection: { superAdmin: 1, perms: 1 } });

    if (!user) {
      return false;
    }

    const { superAdmin, perms } = user;

    if (superAdmin) {
      return {
        websites: [
          {
            _id: websiteId,
            roles: ['owner'],
          },
        ],
      };
    }

    if (perms) {
      return perms;
    }

    return {};
  } finally {
    client.close();
  }
}

/**
 * Returns user permissions.
 * @param {OrganizationPermType[]} roles The user list of roles on organisation
 * @returns The highest role from the input roles
 */
export function getUserOrganizationHighestRole(roles: OrganizationPermType[]) {
  // The lower ranking, the higher role privilege
  const lowestRanking = Math.min(
    ...roles
      .map((role: OrganizationPermType) => {
        // const ro: OrganizationPermType = 'owner';
        return OrganizationPermRanking.indexOf(role);
      })
      .filter((ind) => ind > -1)
  );

  console.log('lowestRanking', lowestRanking);
  console.log(
    'OrganizationPermRanking[lowestRanking]',
    OrganizationPermRanking[lowestRanking]
  );

  // return lowestRanking;
  return OrganizationPermRanking[lowestRanking];
}

/**
 * Returns user permissions.
 * @param {UserType} userId The user ID
 * @param {string} orgId The app ID
 * @returns An object of permissions (stored in the user as user.perms)
 */
export function getUserPermsOnOrganization(user: UserType, orgId: string) {
  const { superAdmin, perms } = user;

  if (superAdmin) {
    return { superAdmin, roles: ['owner'] as OrganizationPermType[] };
  } else {
    if (perms && perms.organizations) {
      const candidateOrganization = perms.organizations.find(
        (org) => org._id === orgId
      );

      if (candidateOrganization) {
        return { superAdmin: false, roles: candidateOrganization.roles };
      }
    }

    return { superAdmin: false, roles: [] as OrganizationPermType[] };
  }
}

function getAppOrgId(app: AppType) {
  return app.organization && app.organization._id;
}

export function isUserSuperAdmin(user: UserType) {
  return user.superAdmin;
}

/**
 * Returns user permissions. It is backward compatible with old permissions system for now.
 * @param {string} user A user object
 * @param {string} app A app object
 * @returns An object of permissions (stored in the user as user.perms)
 */
function getUserPermsOnApp(user: UserType, app: AppType) {
  const appOrgId = getAppOrgId(app);

  if (isUserSuperAdmin(user)) {
    return { superAdmin: true, appOrgId, roles: ['owner'] };
  }

  if (app.organization && app.organization._id) {
    const userPerms = app.organization.users.find(
      (userWk) => userWk._id === user._id
    );

    if (!userPerms) {
      return { superAdmin: false, appOrgId, roles: [] };
    }

    return { superAdmin: false, appOrgId, roles: userPerms.roles };
  } else {
    const { perms } = user;

    if (!perms || !perms.apps) {
      return { superAdmin: false, appOrgId, roles: [] };
    }

    const userPermsOnApp = perms.apps.find(
      (appPerms) => appPerms._id === app._id
    );

    if (!userPermsOnApp) {
      return { superAdmin: false, appOrgId, roles: [] };
    }

    return { superAdmin: false, appOrgId, roles: userPermsOnApp.roles };
  }
}

export async function getApplicationWithinOrg(appId: string) {
  const client = await MongoClient.connect();

  try {
    const application = await getApp(appId);

    if (!application.organization) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_ALLOWED,
        APPLICATION_OUTSIDE_ORGANIZATION_CODE,
        `The application '${appId}' is not in an organization`
      );
    }
    return application as AppInOrgType;
  } finally {
    client.close();
  }
}

/**
 * Checks for user permissions on an app.
 * @param {string} user A user object
 * @param {string} appId An app ID
 * @param {string} requestedPerm A permission to check for, may be one of: owner, admin, editor, moderator, viewer
 * @returns true for a valid permission, false otherwise
 */
async function checkPermsForAppAux(
  user: UserType,
  appId: string,
  requestedPerm: AppsPermType
) {
  // The application exists
  const application = await getApp(appId);

  const userPermsOnApp = getUserPermsOnApp(user, application);

  if (userPermsOnApp.superAdmin) {
    return true;
  }

  // If the application is in an organization
  if (userPermsOnApp.appOrgId) {
    // Find a match between user organizations and the organization of the application
    if (user.perms && user.perms.organizations) {
      const theUserOrgPerms = user.perms.organizations.find(
        (org) => org._id === userPermsOnApp.appOrgId
      );

      if (theUserOrgPerms) {
        // 1. Check if the user is 'owner' or 'admin' of the organization
        if (
          theUserOrgPerms.roles.includes('owner') ||
          theUserOrgPerms.roles.includes('admin')
        ) {
          return true;
        }

        // 2. Else, check if the user has perms on application
        if (userPermsOnApp.roles.length !== 0) {
          const requestedPermsArray = [
            requestedPerm,
            ...(APP_PERMS_IMPLIED[requestedPerm] || []),
          ];

          return areArraysIntersecting(
            userPermsOnApp.roles as string[],
            requestedPermsArray
          );
        }
      }
    }
  }
  // If the application is NOT in an organization
  else {
    // Else, check if the user has perms on application
    if (userPermsOnApp.roles.length !== 0) {
      const requestedPermsArray = [
        requestedPerm,
        ...(APP_PERMS_IMPLIED[requestedPerm] || []),
      ];

      return areArraysIntersecting(
        userPermsOnApp.roles as string[],
        requestedPermsArray
      );
    }
  }

  return false;
}

/**
 * Checks whether a user is a superAdmin.
 * @param {string} userId The user ID
 * @returns true for a valid superAdmin user, false otherwise
 */
export async function checkPermsIsSuperAdmin(
  userId: string,
  options = { dontThrow: false }
) {
  const client = await MongoClient.connect();
  const db = client.db();

  const user = await db.collection(COLL_USERS).findOne(
    { _id: userId, appId: process.env.ADMIN_APP },
    {
      projection: {
        superAdmin: 1,
      },
    }
  );

  const isSuperAdmin = user && user.superAdmin;
  if (isSuperAdmin) {
    return true;
  }

  if (options.dontThrow) {
    return false;
  }

  throw new CrowdaaError(
    ERROR_TYPE_ACCESS,
    SUPERADMIN_PERMISSION_CODE,
    `User '${userId}' is not a superadmin`,
    {
      details: {
        userId,
      },
    }
  );
}

/**
 * Checks for user permissions on an app.
 * @param {string} userId The user ID
 * @param {string} appId The app ID
 * @param {Array<AppsPermType>} requestedPermissions The
 * permission to check for, may be one of: owner, admin, editor, moderator, viewer
 * @param {object} options (facultative) precise if the function throw or not
 * @throws {CrowdaaError} If user is not allowed
 * @returns true for a valid permission, false otherwise
 */
export async function checkPermsForApp(
  userId: string,
  appId: string,
  requestedPermissions: Array<AppsPermType>,
  options = { dontThrow: false }
) {
  const client = await MongoClient.connect();
  const db = client.db();

  const user = await db.collection(COLL_USERS).findOne(
    { _id: userId },
    {
      projection: {
        superAdmin: 1,
        perms: 1,
      },
    }
  );

  if (!user) {
    if (options.dontThrow) {
      return false;
    } else {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        USER_NOT_FOUND_CODE,
        `Cannot found user '${userId}'`
      );
    }
  }

  try {
    const promisesToRevolve = requestedPermissions.map((permissionToCheck) =>
      checkPermsForAppAux(user, appId, permissionToCheck)
    );

    const isAllow = await Promise.all(promisesToRevolve);

    const res = isAllow.some(Boolean);
    if (options.dontThrow) {
      return res;
    }

    if (!res) {
      throw new CrowdaaError(
        ERROR_TYPE_ACCESS,
        APPLICATION_PERMISSION_CODE,
        `User '${userId}' is not at least '${requestedPermissions.join(' or ')}' on application '${appId}'`,
        {
          details: {
            userId,
            appId,
            requestPermissions: requestedPermissions,
          },
        }
      );
    }

    return res;
  } finally {
    client.close();
  }
}

// /**
//  * Checks for user permissions on a website.
//  * @param {string} userId The user ID
//  * @param {string} websiteId The website ID
//  * @param {string} requestedPerm The permission to check for, may be one of : owner, admin
//  * @returns true for a valid permission, false otherwise
//  */
// // TODO: rewrite to take into account the new data structure for perms, as 'checkPermsForApp()'
// export const checkPermsForWebsite = async (
//   userId,
//   websiteId,
//   requestedPerm
// ) => {
//   const perms = await getUserPermsOnWebsite(userId, websiteId);
//   const websiteOrg = await getOrgIdOfWebsite(websiteId);

//   const requestedPermsArray = [
//     requestedPerm,
//     ...(WEBSITE_PERMS_IMPLIED[requestedPerm] || []),
//   ];

//   if (perms.websites && perms.websites.length > 0) {
//     const websitesPerms = indexObjectArrayWithKey(perms.websites);
//     if (websitesPerms[websiteId]) {
//       if (
//         areArraysIntersecting(
//           websitesPerms[websiteId].roles,
//           requestedPermsArray
//         )
//       ) {
//         return true;
//       }
//     }
//   }

//   if (perms.orgs && perms.orgs.length > 0) {
//     const orgsPerms = indexObjectArrayWithKey(perms.orgs);
//     if (orgsPerms[websiteOrg]) {
//       if (
//         areArraysIntersecting(orgsPerms[websiteOrg].roles, ['owner', 'admin'])
//       ) {
//         return true;
//       }

//       if (orgsPerms[websiteOrg].websites) {
//         if (
//           areArraysIntersecting(
//             orgsPerms[websiteOrg].websites.roles,
//             requestedPermsArray
//           )
//         ) {
//           return true;
//         }
//       }
//     }
//   }

//   return false;
// };

/**
 * Checks for user permissions on an organization.
 * @param {string} userId The user ID
 * @param {string} orgId The organization ID
 * @param {Array<OrganizationPermType>} requestedPerms The permission to check for, may be one or several of : owner, admin, member
 * @param {object} options (facultative) precise if the function throw or not
 * @throws {CrowdaaError} If user is not allowed
 * @returns true for a valid permission, false otherwise
 */
export async function checkPermsForOrganization(
  userId: string,
  orgId: string,
  requestedPerms: Array<OrganizationPermType>,
  options = { dontThrow: false }
) {
  const client = await MongoClient.connect();
  const db = client.db();

  const user = await db
    .collection(COLL_USERS)
    .findOne({ _id: userId }, { projection: { superAdmin: 1, perms: 1 } });

  const organization = await db
    .collection(COLL_ORGANIZATIONS)
    .findOne({ _id: orgId }, { projection: { name: 1 } });

  if (!organization) {
    throw new CrowdaaError(
      ERROR_TYPE_NOT_FOUND,
      ORGANIZATION_NOT_FOUND_CODE,
      `Cannot found the organization '${orgId}'`
    );
  }

  if (!user) {
    if (options.dontThrow) {
      return false;
    } else {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        USER_NOT_FOUND_CODE,
        `Cannot found user '${userId}'`
      );
    }
  }

  if (user.superAdmin) {
    return true;
  }

  try {
    const isAllow = requestedPerms.map((permToCheck) =>
      checkPermsForOrganizationAux(user, orgId, permToCheck)
    );

    const res = isAllow.some(Boolean);
    if (options.dontThrow) {
      return res;
    }

    if (!res) {
      throw new CrowdaaError(
        ERROR_TYPE_ACCESS,
        ORGANIZATION_PERMISSION_CODE,
        `User '${userId}' is not at least '${requestedPerms.join(' or ')}' on organization '${orgId}'`,
        {
          details: {
            userId,
            orgId,
            requestPermissions: requestedPerms,
          },
        }
      );
    }

    return res;
  } finally {
    client.close();
  }
}

/**
 * Checks for user permissions on an organization.
 * @param {UserType} user A user object
 * @param {string} orgId An organization ID
 * @param {string} requestedPerm A permission to check for, may be one of : owner, admin, member
 * @returns true for a valid permission, false otherwise
 */
function checkPermsForOrganizationAux(
  user: UserType,
  orgId: string,
  requestedPerm: OrganizationPermType
) {
  const { superAdmin, roles } = getUserPermsOnOrganization(user, orgId);

  if (superAdmin) {
    return true;
  }

  const requestedPermsArray = [
    requestedPerm,
    ...(ORGANIZATION_PERMS_IMPLIED[requestedPerm] || []),
  ];

  return areArraysIntersecting(roles, requestedPermsArray);
}

/**
 * Checks for user permissions on specific features of an app.
 * @param {string} userId The user ID
 * @param {string} appId The app ID
 * @param {Array<AppsFeaturePermType>} requestedPermissions The permission to check for
 * @param {object} options (facultative) precise if the function throws or not
 * @throws {CrowdaaError} If user is not allowed
 * @returns true for a valid permission, false otherwise
 */
export async function checkFeaturePermsForApp(
  userId: string,
  appId: string,
  requestedPermissions: Array<AppsFeaturePermType>,
  { dontThrow = false, requireAll = false } = {}
) {
  const client = await MongoClient.connect();
  const badgeChecker = new BadgeChecker(appId);

  try {
    const db = client.db();

    const user = await db.collection(COLL_USERS).findOne(
      { _id: userId, appId },
      {
        projection: {
          badges: 1,
        },
      }
    );

    const app = await getApp(appId);

    if (!user) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        USER_NOT_FOUND_CODE,
        `Cannot find user '${userId}'`
      );
    }

    const { featuresPerms = {} } = app.settings || {};

    const finalFeaturesPerm = requestedPermissions.reduce(
      (acc, key) => {
        if (featuresPerms[key]) {
          acc[key] = featuresPerms[key];
        } else {
          acc[key] = null;
        }
        return acc;
      },
      {} as Record<AppsFeaturePermType, UserBadgeGenericEntryEntity | null>
    );

    if (!requireAll) {
      const allIsNull = Object.values(finalFeaturesPerm).every(
        (x) => x === null
      );
      if (allIsNull) {
        throw new CrowdaaError(
          ERROR_TYPE_ACCESS,
          FEATURE_PERMISSION_CODE,
          `Access to features ${requestedPermissions.join(', ')} not allowed`
        );
      }
    }

    const userBadges = [...((user && user.badges) || [])];

    await badgeChecker.init;

    badgeChecker.registerBadges(userBadges.map(({ id }) => id));

    Object.keys(finalFeaturesPerm).forEach((permKey: string) => {
      const permKeyCasted = permKey as AppsFeaturePermType;

      if (!finalFeaturesPerm[permKeyCasted]) {
        if (requireAll) {
          throw new CrowdaaError(
            ERROR_TYPE_ACCESS,
            FEATURE_PERMISSION_CODE,
            `Access to feature ${permKeyCasted} not allowed`
          );
        }
      } else {
        badgeChecker.registerBadges(
          finalFeaturesPerm[permKeyCasted].list.map(({ id }) => id)
        );
      }
    });

    await badgeChecker.loadBadges();

    let haveAtLeastOnePerm = false;
    const promises = Object.keys(finalFeaturesPerm).map(
      async (permKey: string) => {
        const permKeyCasted = permKey as AppsFeaturePermType;

        if (finalFeaturesPerm[permKeyCasted]) {
          const checkerResults = await badgeChecker.checkBadges(
            userBadges,
            finalFeaturesPerm[permKeyCasted],
            { userId, appId }
          );

          if (!checkerResults.canRead) {
            if (requireAll) {
              throw new CrowdaaError(
                ERROR_TYPE_ACCESS,
                FEATURE_PERMISSION_CODE,
                `Access to feature ${permKeyCasted} not allowed`
              );
            }
          } else {
            haveAtLeastOnePerm = true;
          }
        }
      }
    );

    const results = await Promise.allSettled(promises);

    if (!haveAtLeastOnePerm && !requireAll) {
      throw new CrowdaaError(
        ERROR_TYPE_ACCESS,
        FEATURE_PERMISSION_CODE,
        `Access to features ${requestedPermissions.join(', ')} not allowed`
      );
    }

    results.forEach((value: PromiseSettledResult<void>) => {
      if (value.status === 'rejected') {
        throw value.reason;
      }
    });

    return true;
  } catch (e) {
    if (dontThrow) {
      return false;
    } else {
      throw e;
    }
  } finally {
    await badgeChecker.close();
    await client.close();
  }
}
