/* eslint-disable import/no-relative-packages */
import { z } from 'zod';
import { APIGatewayProxyEvent } from 'aws-lambda';

import response, { handleException } from '../../libs/httpResponses/response';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import {
  checkPermsForApp,
  checkPermsForOrganization,
} from '../../libs/perms/checkPermsFor';
import modifyAppUserPerms from '../lib/modifyAppUserPerms';
import { applicationRolesInOrganization } from '../../organizations/lib/organizationsUtils';
import { getApp, getApplicationOrganizationId } from '../lib/appsUtils';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_BODY_CODE,
} from '../../libs/httpResponses/errorCodes';
import { OrganizationPermType } from '../../libs/perms/permEntities';
import {
  addUserApplicationRoles,
  filterUserPrivateFields,
  getUser,
} from '../../users/lib/usersUtils';

export default async (event: APIGatewayProxyEvent) => {
  const { principalId: sourceUserId } = event.requestContext.authorizer as {
    principalId: string;
  };
  const { id: appId, userId: targetUserId } = event.pathParameters as {
    id: string;
    userId: string;
  };

  try {
    const modifyAppUserPermsSchema = z
      .object({
        roles: z.array(
          z.enum(applicationRolesInOrganization as [string, ...string[]])
        ),
      })
      .required();

    if (!event.body) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_BODY_CODE,
        `Body is missing from the request`
      );
    }

    // Validate the body of the request
    const body = JSON.parse(event.body);

    const validatedBody = modifyAppUserPermsSchema.parse(body);

    const { roles } = validatedBody;

    // Check right for sourceUserId to appId
    await checkPermsForApp(sourceUserId, appId, ['admin']);

    const app = await getApp(appId);
    const orgId = getApplicationOrganizationId(app);

    const organizationPermissionLevel = ['member'] as OrganizationPermType[];
    await checkPermsForOrganization(
      sourceUserId,
      orgId,
      organizationPermissionLevel
    );

    await checkPermsForOrganization(
      targetUserId,
      orgId,
      organizationPermissionLevel
    );

    const updatedApp = await modifyAppUserPerms(
      sourceUserId,
      targetUserId,
      appId,
      roles
    );
    const user = await getUser(targetUserId);

    return response({
      code: 200,
      body: formatResponseBody({
        data: {
          ...filterUserPrivateFields(addUserApplicationRoles(updatedApp, user)),
        },
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
