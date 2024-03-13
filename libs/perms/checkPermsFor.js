/* eslint-disable import/no-relative-packages */
import MongoClient from '../mongoClient';
import mongoCollections from '../mongoCollections.json';
import { indexObjectArrayWithKey } from '../utils';

const { COLL_USERS, COLL_PERM_GROUPS, COLL_APPS, COLL_WEBSITES } =
  mongoCollections;

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
 * The 'member' role is impled on orgs. It may be specified or omitted.
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
  const oldPermsPipeline = [
    {
      $match: { _id: userId },
    },
    {
      $lookup: {
        from: COLL_PERM_GROUPS,
        localField: 'permGroupIds',
        foreignField: '_id',
        as: 'oldPermGroups',
      },
    },
    {
      $project: {
        _id: 1,
        superAdmin: 1,
        perms: 1,
        oldPermGroups: {
          $filter: {
            input: '$permGroups',
            as: 'permGroup',
            cond: { $eq: [appId, '$$permGroup.appId'] },
          },
        },
      },
    },
  ];
  const client = await MongoClient.connect();
  try {
    const [{ oldPermGroups, superAdmin = false, perms } = {}] = await client
      .db()
      .collection(COLL_USERS)
      .aggregate(oldPermsPipeline)
      .toArray();

    let oldPerms = {};
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

    oldPerms = (oldPermGroups || []).reduce((acc, curr) => {
      Object.keys(curr.oldPerms).forEach((key) => {
        if (!acc[key]) {
          acc[key] = curr.oldPerms[key];
        }
      });
      return acc;
    }, {});

    const isAnyOldPerm = Object.values(oldPerms).indexOf(true) >= 0;
    if (isAnyOldPerm) {
      return {
        apps: [
          {
            _id: appId,
            roles: ['admin'],
          },
        ],
      };
    }
    return {};
  } finally {
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
  const perms = await getPermsOnApp(userId, appId);
  const appOrg = await getOrgIdOfApp(appId);

  const requestedPermsArray = [
    requestedPerm,
    ...(APP_PERMS_IMPLIED[requestedPerm] || []),
  ];

  if (perms.apps && perms.apps.length > 0) {
    const appsPerms = indexObjectArrayWithKey(perms.apps);
    if (appsPerms[appId]) {
      if (areArraysIntersecting(appsPerms[appId].roles, requestedPermsArray)) {
        return true;
      }
    }
  }

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
