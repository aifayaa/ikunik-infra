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
    orgs: [
      {
        _id: 'some-org-id1',
        roles: ['owner', 'admin', 'member'],
      },
      {
        _id: 'some-org-id2',
        roles: ['owner', 'admin', 'member'],
        apps: {
          roles: ['owner', 'admin', 'editor', 'moderator', 'viewer'],
        },
        websites: {
          roles: ['owner', 'admin'],
        },
      },
    ],
  },
};
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

async function getOrgIdOfApp(appId) {
  const client = await MongoClient.connect();

  try {
    const app = await client
      .db()
      .collection(COLL_APPS)
      .findOne({ _id: appId }, { projection: { orgId: 1 } });

    if (!app) {
      return null;
    }
    return app.orgId;
  } finally {
    client.close();
  }
}

async function getOrgIdOfWebsite(websiteId) {
  const client = await MongoClient.connect();

  try {
    const app = await client
      .db()
      .collection(COLL_WEBSITES)
      .findOne({ _id: websiteId }, { projection: { orgId: 1 } });

    if (!app) {
      return null;
    }
    return app.orgId;
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
async function getPermsOnWebsite(userId, websiteId) {
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
async function getPermsOnOrganization(userId, orgId) {
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
async function getPermsOnApp(userId, appId) {
  console.log('getPermsOnApp');
  console.log('getPermsOnApp: PASS 0');
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
  console.log('getPermsOnApp: PASS 1');
  console.log('process.env: ', process.env);
  console.dir(process.env);
  console.dir(process.env['$<<']);
  const client = await MongoClient.connect();
  console.log('getPermsOnApp: PASS 2');
  try {
    const [{ superAdmin = false, perms } = {}] = await client
      .db()
      .collection(COLL_USERS)
      .aggregate(oldPermsPipeline)
      .toArray();

    console.log('getPermsOnApp: PASS 3');
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

    console.log('getPermsOnApp: PASS 4');
    if (perms) {
      return perms;
    }

    console.log('getPermsOnApp: PASS 5');
    return {};
  } finally {
    console.log('getPermsOnApp: PASS 6');
    client.close();
  }
}

/**
 * Checks for user permissions on an app.
 * @param {string} userId The user ID
 * @param {string} appId The app ID
 * @param {string} requestedPerm The permission to check for, may be one of : owner, admin, editor, moderator, viewer
 * @returns true for a valid permission, false otherwise
 */
export const checkPermsForApp = async (userId, appId, requestedPerm) => {
  console.log('checkPermsForApp');
  console.log('checkPermsForApp: PASS 0');
  const perms = await getPermsOnApp(userId, appId);
  console.log('checkPermsForApp: PASS 1');
  const appOrg = await getOrgIdOfApp(appId);
  console.log('checkPermsForApp: PASS 2');

  const requestedPermsArray = [
    requestedPerm,
    ...(APP_PERMS_IMPLIED[requestedPerm] || []),
  ];

  console.log('checkPermsForApp: PASS 3');
  if (perms.apps && perms.apps.length > 0) {
    const appsPerms = indexObjectArrayWithKey(perms.apps);
    if (appsPerms[appId]) {
      if (areArraysIntersecting(appsPerms[appId].roles, requestedPermsArray)) {
        return true;
      }
    }
  }

  console.log('checkPermsForApp: PASS 4');
  if (perms.orgs && perms.orgs.length > 0) {
    const orgsPerms = indexObjectArrayWithKey(perms.orgs);
    if (orgsPerms[appOrg]) {
      if (areArraysIntersecting(orgsPerms[appOrg].roles, ['owner', 'admin'])) {
        return true;
      }

      if (orgsPerms[appOrg].apps) {
        if (
          areArraysIntersecting(
            orgsPerms[appOrg].apps.roles,
            requestedPermsArray
          )
        ) {
          return true;
        }
      }
    }
  }

  console.log('checkPermsForApp: PASS 5');
  return false;
};

/**
 * Checks for user permissions on a website.
 * @param {string} userId The user ID
 * @param {string} websiteId The website ID
 * @param {string} requestedPerm The permission to check for, may be one of : owner, admin
 * @returns true for a valid permission, false otherwise
 */
export const checkPermsForWebsite = async (
  userId,
  websiteId,
  requestedPerm
) => {
  const perms = await getPermsOnWebsite(userId, websiteId);
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
  const perms = await getPermsOnOrganization(userId, orgId);

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
