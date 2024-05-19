/* eslint-disable import/no-relative-packages */
import MongoClient from '../mongoClient';
import mongoCollections from '../mongoCollections.json';
import { indexObjectArrayWithKey } from '../utils';

import { CrowdaaError } from '../httpResponses/CrowdaaError.ts';
import {
  APPLICATION_OUTSIDE_ORGANIZATION_CODE,
  APPLICATION_PERMISSION_CODE,
  ERROR_TYPE_ACCESS,
  ERROR_TYPE_NOT_ALLOWED,
  ERROR_TYPE_NOT_FOUND,
  ORGANIZATION_NOT_FOUND_CODE,
} from '../httpResponses/errorCodes';
import getApp from '../../apps/lib/getApp';

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
  admin: ['owner'],
  editor: ['owner', 'admin'],
  moderator: ['owner', 'admin'],
  viewer: ['owner', 'admin'],
};

const WEBSITE_PERMS_IMPLIED = {
  admin: ['owner'],
};
const ORGANIZATION_PERMS_IMPLIED = {
  admin: ['owner'],
  member: ['admin', 'owner'],
};

function areArraysIntersecting(a1, a2) {
  if (!a1) a1 = [];
  if (!a2) a2 = [];
  const intersect = !a1.every((i) => a2.indexOf(i) < 0);
  return intersect;
}

async function getOrgIdOfWebsite(websiteId) {
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
async function getUserPermsOnWebsite(userId, websiteId) {
  const client = await MongoClient.connect();
  try {
    const user = await client
      .db()
      .collection(COLL_USERS)
      .findOne({ _id: userId }, { projection: { superAdmin: 1, perms: 1 } });

    if (!user) {
      return false;
    }

    const [{ superAdmin = false, perms } = {}] = user;

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
 * @param {string} userId The user ID
 * @param {string} orgId The app ID
 * @returns An object of permissions (stored in the user as user.perms)
 */
function getUserPermsOnOrganization(user, orgId) {
  const { superAdmin, perms } = user;

  if (superAdmin) {
    return { superAdmin, roles: ['owner'] };
  } else {
    if (perms && perms.organizations) {
      const theOrganization = perms.organizations.find(
        (org) => org._id === orgId
      );

      if (theOrganization) {
        return { superAdmin, roles: theOrganization.roles };
      }
    }

    return { superAdmin, roles: [] };
  }
}

function getAppOrgId(app) {
  return app.organization && app.organization._id;
}

function isUserSuperAdmin(user) {
  return user.superAdmin;
}

/**
 * Returns user permissions. It is backward compatible with old permissions system for now.
 * @param {string} userId The user ID
 * @param {string} appId The app ID
 * @returns An object of permissions (stored in the user as user.perms)
 */
function getUserPermsOnApp(user, app) {
  const appOrgId = getAppOrgId(app);

  if (isUserSuperAdmin(user)) {
    return { appOrgId, roles: ['owner'] };
  }

  if (appOrgId) {
    const userPerms = app.organization.users.find(
      (userWk) => userWk._id === user._id
    );

    if (!userPerms) {
      return { appOrgId, roles: [] };
    }

    return { appOrgId, roles: userPerms.roles };
  } else {
    const { perms } = user;

    if (!perms || !perms.apps) {
      return { appOrgId, roles: [] };
    }

    const userPermsOnApp = perms.apps.find(
      (appPerms) => appPerms._id === app._id
    );

    if (!userPermsOnApp) {
      return { appOrgId, roles: [] };
    }

    return { appOrgId, roles: userPermsOnApp.roles };
  }
}

export async function getApplicationWithinOrg(appId) {
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
    return application;
  } finally {
    client.close();
  }
}

export async function getApplicationOrganizationId(appId) {
  const application = await getApplicationWithinOrg(appId);

  return (
    application && application.organization && application.organization._id
  );
}

/**
 * Checks for user permissions on an app.
 * @param {string} db A db instance
 * @param {string} user The user ID
 * @param {string} appId The app ID
 * @param {string} requestedPerm The permission to check for, may be one of: owner, admin, editor, moderator, viewer
 * @returns true for a valid permission, false otherwise
 */
async function checkPermsForAppAux(user, appId, requestedPerm) {
  // The application exists
  const application = await getApp(appId);

  const userPermsOnApp = getUserPermsOnApp(user, application);

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
            userPermsOnApp.roles,
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

      return areArraysIntersecting(userPermsOnApp.roles, requestedPermsArray);
    }
  }

  return false;
}

/**
 * Checks for user permissions on an app.
 * @param {string} userId The user ID
 * @param {string} appId The app ID
 * @param {Array<'owner' | 'admin' | 'editor' | 'moderator' | 'viewer'>} requestedPermissions The
 * permission to check for, may be one of: owner, admin, editor, moderator, viewer
 * @param {object} options (facultative) precise if the function throw or not
 * @throws {CrowdaaError} If user is not allowed
 * @returns true for a valid permission, false otherwise
 */
export async function checkPermsForApp(
  userId,
  appId,
  requestedPermissions,
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
    return false;
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

/**
 * Checks for user permissions on a website.
 * @param {string} userId The user ID
 * @param {string} websiteId The website ID
 * @param {string} requestedPerm The permission to check for, may be one of : owner, admin
 * @returns true for a valid permission, false otherwise
 */
// TODO: rewrite to take into account the new data structure for perms, as 'checkPermsForApp()'
export const checkPermsForWebsite = async (
  userId,
  websiteId,
  requestedPerm
) => {
  const perms = await getUserPermsOnWebsite(userId, websiteId);
  const websiteOrg = await getOrgIdOfWebsite(websiteId);

  const requestedPermsArray = [
    requestedPerm,
    ...(WEBSITE_PERMS_IMPLIED[requestedPerm] || []),
  ];

  if (perms.websites && perms.websites.length > 0) {
    const websitesPerms = indexObjectArrayWithKey(perms.websites);
    if (websitesPerms[websiteId]) {
      if (
        areArraysIntersecting(
          websitesPerms[websiteId].roles,
          requestedPermsArray
        )
      ) {
        return true;
      }
    }
  }

  if (perms.orgs && perms.orgs.length > 0) {
    const orgsPerms = indexObjectArrayWithKey(perms.orgs);
    if (orgsPerms[websiteOrg]) {
      if (
        areArraysIntersecting(orgsPerms[websiteOrg].roles, ['owner', 'admin'])
      ) {
        return true;
      }

      if (orgsPerms[websiteOrg].websites) {
        if (
          areArraysIntersecting(
            orgsPerms[websiteOrg].websites.roles,
            requestedPermsArray
          )
        ) {
          return true;
        }
      }
    }
  }

  return false;
};

/**
 * Checks for user permissions on an organization.
 * @param {string} userId The user ID
 * @param {string} orgId The organization ID
 * @param {string} requestedPerm The permission to check for, may be one of : owner, admin, member
 * @returns true for a valid permission, false otherwise
 */
export const checkPermsForOrganization = async (
  userId,
  orgId,
  requestedPerm
) => {
  const client = await MongoClient.connect();

  const db = client.db();
  const organization = await db
    .collection(COLL_ORGANIZATIONS)
    .findOne({ _id: orgId }, { projection: { name: 1 } });

  if (!organization) {
    throw new CrowdaaError(
      ERROR_TYPE_NOT_FOUND,
      ORGANIZATION_NOT_FOUND_CODE,
      `Cannot found the organization '${orgId}'`,
      {
        details: {
          userId,
          orgId,
        },
      }
    );
  }

  const user = await db
    .collection(COLL_USERS)
    .findOne({ _id: userId }, { projection: { superAdmin: 1, perms: 1 } });

  if (!user) {
    return false;
  }

  const { superAdmin, roles } = getUserPermsOnOrganization(user, orgId);

  if (superAdmin) {
    return true;
  } else {
    const requestedPermsArray = [
      requestedPerm,
      ...(ORGANIZATION_PERMS_IMPLIED[requestedPerm] || []),
    ];

    return areArraysIntersecting(roles, requestedPermsArray);
  }
};
