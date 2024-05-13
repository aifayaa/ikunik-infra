/* eslint-disable import/no-relative-packages */
import { z } from 'zod';
import response, { handleException } from '../../libs/httpResponses/response';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import { checkPermsForOrganization } from '../../libs/perms/checkPermsFor';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import changeUserOrgPerms from '../lib/changeUserOrgPerms';
import {
  ERROR_TYPE_ACCESS,
  ORGANIZATION_PERMISSION_CODE,
} from '../../libs/httpResponses/errorCodes';
import {
  filterUserPrivateFields,
  organizationRoles,
} from '../lib/organizationsUtils';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USERS } = mongoCollections;

export const changeUserOrgPermsSchema = z
  .object({
    roles: z.array(z.enum(organizationRoles)).nonempty(),
  })
  .required();

export default async (event) => {
  const { principalId: sourceUserId } = event.requestContext.authorizer;
  const { id: orgId, userId: targetUserId } = event.pathParameters;

  try {
    const orgPermissionLevel = 'admin';
    const sourceUserAllowed = await checkPermsForOrganization(
      sourceUserId,
      orgId,
      orgPermissionLevel
    );
    if (!sourceUserAllowed) {
      const errorBody = formatResponseBody({
        errors: [
          {
            type: ERROR_TYPE_ACCESS,
            code: ORGANIZATION_PERMISSION_CODE,
            message: `User '${sourceUserId}' is not at least '${orgPermissionLevel}' on organization '${orgId}'`,
            details: {
              userId: sourceUserId,
              orgId,
              orgPermissionLevel,
            },
          },
        ],
      });
      return response({ code: 200, body: errorBody });
    }

    const targetUserAllowed = await checkPermsForOrganization(
      targetUserId,
      orgId,
      orgPermissionLevel
    );
    if (!targetUserAllowed) {
      const errorBody = formatResponseBody({
        errors: [
          {
            type: ERROR_TYPE_ACCESS,
            code: ORGANIZATION_PERMISSION_CODE,
            message: `User '${targetUserId}' is not at least '${orgPermissionLevel}' on organization '${orgId}'`,
            details: {
              userId: targetUserId,
              orgId,
              orgPermissionLevel,
            },
          },
        ],
      });
      return response({ code: 200, body: errorBody });
    }

    const body = JSON.parse(event.body);

    // validation
    let validatedBody;
    try {
      validatedBody = changeUserOrgPermsSchema.parse(body);
    } catch (err) {
      const errors = formatValidationErrors(err);
      const errorBody = formatResponseBody({ errors });
      return response({ code: 200, body: errorBody });
    }

    const { roles } = validatedBody;

    // If the target user is a superAdmin, return it
    const client = await MongoClient.connect();
    const db = client.db();
    const targetUser = await db
      .collection(COLL_USERS)
      .findOne({ _id: targetUserId });

    // If the target user is a superAdmin, don't change permissions
    const { superAdmin } = targetUser;
    if (superAdmin) {
      return response({
        code: 200,
        body: formatResponseBody({ data: filterUserPrivateFields(targetUser) }),
      });
    }

    const user = await changeUserOrgPerms(
      sourceUserId,
      targetUserId,
      orgId,
      roles
    );

    return response({
      code: 200,
      body: formatResponseBody({ data: filterUserPrivateFields(user) }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
