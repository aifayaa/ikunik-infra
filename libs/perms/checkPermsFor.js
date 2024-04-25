/* eslint-disable import/no-relative-packages */
import MongoClient from '../mongoClient';
import mongoCollections from '../mongoCollections.json';
import { indexObjectArrayWithKey } from '../utils';

const { COLL_USERS, COLL_APPS, COLL_WEBSITES } = mongoCollections;

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
    const [{ superAdmin = false, perms } = {}] = await client
      .db()
      .collection(COLL_USERS)
      .find({ _id: userId })
      .toArray();

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
async function getUserPermsOnOrganization(userId, orgId) {
  const client = await MongoClient.connect();
  try {
    const [{ superAdmin = false, perms } = {}] = await client
      .db()
      .collection(COLL_USERS)
      .find({ _id: userId })
      .toArray();

    if (superAdmin) {
      return {
        orgs: [
          {
            _id: orgId,
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
 * Returns user permissions. It is backward compatible with old permissions system for now.
 * @param {string} userId The user ID
 * @param {string} appId The app ID
 * @returns An object of permissions (stored in the user as user.perms)
 */
async function getUserPermsOnApp(userId, appId) {
  const oldPermsPipeline = [
    {
      $match: { _id: userId },
    },
    {
      $project: {
        _id: 1,
        superAdmin: 1,
        perms: 1,
      },
    },
  ];
  const client = await MongoClient.connect();
  try {
    const [{ superAdmin = false, perms } = {}] = await client
      .db()
      .collection(COLL_USERS)
      .aggregate(oldPermsPipeline)
      .toArray();

    if (superAdmin) {
      return {
        apps: [
          {
            _id: appId,
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

async function getApplication(appId) {
  const client = await MongoClient.connect();

  try {
    const app = await client
      .db()
      .collection(COLL_APPS)
      .findOne({ _id: appId }, { projection: { organization: 1 } });

    if (!app || !app.organization) {
      return null;
    }
    return app;
  } finally {
    client.close();
  }
}

/**
 * Checks for user permissions on an app.
 * @param {string} userId The user ID
 * @param {string} appId The app ID
 * @param {string} requestedPerm The permission to check for, may be one of: owner, admin, editor, moderator, viewer
 * @returns true for a valid permission, false otherwise
 */
export async function checkPermsForApp(userId, appId, requestedPerm) {
  const application = await getApplication(appId);
  const applicationOrganizationId =
    application && application.organization && application.organization._id;
  const userPerms = await getUserPermsOnApp(userId, appId);

  const requestedPermsArray = [
    requestedPerm,
    ...(APP_PERMS_IMPLIED[requestedPerm] || []),
  ];

  if (userPerms.apps && userPerms.apps.length > 0) {
    const appsPerms = indexObjectArrayWithKey(userPerms.apps);
    if (appsPerms[appId]) {
      if (areArraysIntersecting(appsPerms[appId].roles, requestedPermsArray)) {
        return true;
      }
    }
  }

  if (
    applicationOrganizationId &&
    userPerms.organizations &&
    userPerms.organizations.length > 0
  ) {
    const userOrganizationsPerms = indexObjectArrayWithKey(
      userPerms.organizations
    );

    if (userOrganizationsPerms[applicationOrganizationId]) {
      if (
        areArraysIntersecting(
          userOrganizationsPerms[applicationOrganizationId].roles,
          ['owner', 'admin']
        )
      ) {
        return true;
      }

      const applicationOrganizationUsers = indexObjectArrayWithKey(
        application.organization.users
      );

      if (
        applicationOrganizationUsers[userId] &&
        areArraysIntersecting(
          applicationOrganizationUsers[userId].roles,
          requestedPermsArray
        )
      ) {
        return true;
      }
    }
  }

  return false;
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
  const perms = await getUserPermsOnOrganization(userId, orgId);

  const requestedPermsArray = [
    requestedPerm,
    ...(ORGANIZATION_PERMS_IMPLIED[requestedPerm] || []),
  ];

  if (perms.orgs && perms.orgs.length > 0) {
    const orgsPerms = indexObjectArrayWithKey(perms.orgs);
    if (orgsPerms[orgId]) {
      if (
        areArraysIntersecting(
          orgsPerms[orgId].roles || ['member'],
          requestedPermsArray
        )
      ) {
        return true;
      }
    }
  }

  return false;
};
