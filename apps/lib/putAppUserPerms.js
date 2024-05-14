/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_NOT_FOUND,
  USER_ALREADY_EXISTS_CODE,
} from '../../libs/httpResponses/errorCodes';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { getApplicationWithinOrg } from '../../libs/perms/checkPermsFor';
import { indexObjectArrayWithKey } from '../../libs/utils';
// import { applicationRolesInOrganization } from '../../organizations/lib/organizationsUtils';

const { COLL_APPS } = mongoCollections;

// async function getUserPermsOnApplication(db, userId, appId) {
//   const application = await db.collection(COLL_APPS).findOne({ _id: appId });

//   return application.organization.users.find((user) => user._id === userId)
//     .roles;
// }

// function getHighestRoleAux(roles) {
//   for (const role of applicationRolesInOrganization) {
//     if (roles.includes(role)) {
//       return role;
//     }
//   }

//   return applicationRolesInOrganization.at(-1);
// }

// async function getHighestRole(db, userId, appId) {
//   const userRoles = await getUserPermsOnApplication(db, userId, appId);
//   return getHighestRoleAux(userRoles);
// }

export default async (appId, roles, targetUserId) => {
  const client = await MongoClient.connect();

  try {
    const db = client.db();

    const app = await getApplicationWithinOrg(appId);

    const appsOrganizationUsers = indexObjectArrayWithKey(
      app.organization.users
    );

    if (appsOrganizationUsers[targetUserId]) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        USER_ALREADY_EXISTS_CODE,
        `The user '${targetUserId}' already exists in application '${appId}'`
      );
    }

    // const targetUserHighestRole = await getHighestRole(db, targetUserId, appId);

    // // Check the case where the application orgId will lost an admin.
    // // Context:
    // //  - the targetUser is an 'admin'
    // //  - the new permissions doesn't involve the 'admin' role
    // const highestRight = applicationRolesInOrganization[0];
    // if (
    //   targetUserHighestRole === highestRight &&
    //   !roles.includes(highestRight)
    // ) {
    //   // const orgUsers = await db
    //   //   .collection(COLL_USERS)
    //   //   .find({ 'perms.organizations._id': orgId })
    //   //   .toArray();
    //   const appUsers = app.organization.users;

    //   const nbOwner = appUsers
    //     .map((user) => user.roles)
    //     .filter((roles) => roles.includes(highestRight))
    //     .filter(Boolean).length;

    //   // Currently, if the organization orgId has only one owner: exit
    //   if (nbOwner === 1) {
    //     throw new CrowdaaError(
    //       ERROR_TYPE_NOT_ALLOWED,
    //       AT_LEAST_ONE_OWNER_CODE,
    //       `User '${targetUserId}' is the only owner of organization '${orgId}'. ` +
    //         `Cannot change its permissions to '${updatedRoles}'.`
    //     );
    //   }
    // }

    await db
      .collection(COLL_APPS)
      .findOneAndUpdate(
        { _id: appId },
        { $push: { 'organization.users': { _id: targetUserId, roles } } }
      );

    return await db.collection(COLL_APPS).findOne({ _id: appId });
  } finally {
    client.close();
  }
};
