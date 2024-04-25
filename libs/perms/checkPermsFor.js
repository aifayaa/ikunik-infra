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

async function getOrgIdOfApp(appId) {
  const client = await MongoClient.connect();

  try {
    const app = await client
      .db()
      .collection(COLL_APPS)
      .findOne({ _id: appId }, { projection: { organization: 1 } });

    if (!app || !app.organization) {
      return null;
    }
    return app.organization._id;
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

/**
 * Checks for user permissions on an app.
 * @param {string} userId The user ID
 * @param {string} appId The app ID
 * @param {string} requestedPerm The permission to check for, may be one of : owner, admin, editor, moderator, viewer
 * @returns true for a valid permission, false otherwise
 */
export const checkPermsForApp = async (userId, appId, requestedPerm) => {
  const userPerms = await getPermsOnApp(userId, appId);
  const appOrgId = await getOrgIdOfApp(appId);

  console.log('userId', userId);
  console.log('appId', appId);
  console.log('requestedPerm', requestedPerm);
  console.log('userPerms', userPerms);

  const requestedPermsArray = [
    requestedPerm,
    ...(APP_PERMS_IMPLIED[requestedPerm] || []),
  ];

  console.log('requestedPermsArray', requestedPermsArray);

  if (userPerms.apps && userPerms.apps.length > 0) {
    const appsPerms = indexObjectArrayWithKey(userPerms.apps);
    console.log('appId', appId);
    console.log('appsPerms', appsPerms);
    console.log('appsPerms[appId]', appsPerms[appId]);
    if (appsPerms[appId]) {
      if (areArraysIntersecting(appsPerms[appId].roles, requestedPermsArray)) {
        return true;
      }
    }
  }

  console.log('PASS 3');
  if (userPerms.organizations && userPerms.organizations.length > 0) {
    const orgsPerms = indexObjectArrayWithKey(userPerms.organizations);
    console.log('appOrgId', appOrgId);
    console.log('orgsPerms', orgsPerms);
    console.log('orgsPerms[appOrgId]', orgsPerms[appOrgId]);
    if (orgsPerms[appOrgId]) {
      if (
        areArraysIntersecting(orgsPerms[appOrgId].roles, ['owner', 'admin'])
      ) {
        return true;
      }

      const client = await MongoClient.connect();
      const applicationList = await client
        .db()
        .collection(COLL_APPS)
        .aggregate([
          {
            $match: { _id: appId },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              organization: 1,
            },
          },
        ])
        .toArray();

      // if (applicationList.length < 1) {
      //   throw new Error('app_not_found');
      // }

      const application = applicationList[0];

      const userOrgIds = userPerms.organizations.map((org) => org._id);
      console.log('userOrgIds', userOrgIds);

      console.log('application');
      console.log(application);

      const applicationOrgId =
        application.organization && application.organization._id;

      console.log('applicationOrgId', applicationOrgId);
      // const applicationUsers = application.organization.map();
      if (userOrgIds.includes(applicationOrgId)) {
        const applicationOrgUsers = application.organization.users;
        console.log('applicationOrgUsers', applicationOrgUsers);
        const applicationOrgUser = applicationOrgUsers.find(
          (user) => user._id === userId
        );

        console.log('applicationOrgUser', applicationOrgUser);

        if (applicationOrgUser) {
          const userRoles = applicationOrgUser.roles;
          console.log('userRoles', userRoles);
          console.log('requestedPermsArray', requestedPermsArray);

          console.log(
            'cond',
            areArraysIntersecting(userRoles, requestedPermsArray)
          );

          if (areArraysIntersecting(userRoles, requestedPermsArray)) {
            return true;
          }

          // console.log('orgsPerms[appOrgId].apps', orgsPerms[appOrgId].apps);
          // if (orgsPerms[appOrgId].apps) {
          //   if (
          //     areArraysIntersecting(
          //       orgsPerms[appOrgId].apps.roles,
          //       requestedPermsArray
          //     )
          //   ) {
          //     return true;
          //   }
          // }
        }
      }
    }
  }

  console.log('PASS 4');
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
