/* eslint-disable import/no-relative-packages */
import { z } from 'zod';
import { applicationRolesInOrganization } from '../../organizations/lib/organizationsUtils';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import {
  checkPermsForApp,
  checkPermsForOrganization,
} from '../../libs/perms/checkPermsFor';
import { getApp, getApplicationOrganizationId } from '../lib/appsUtils';
import putAppUserPerms from '../lib/putAppUserPerms';
import response, { handleException } from '../../libs/httpResponses/response';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import {
  addUserApplicationRoles,
  filterUserPrivateFields,
  getUser,
} from '../../users/lib/usersUtils';
import { APIGatewayProxyEvent } from 'aws-lambda';
import {
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_BODY_CODE,
} from '../../libs/httpResponses/errorCodes';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import { OrganizationPermType } from '../../libs/perms/permEntities';

/**
 * As the source user must be an 'admin' of the application, he can give
 * any roles to the target user.
 */
export default async (event: APIGatewayProxyEvent) => {
  const { principalId: sourceUserId } = event.requestContext.authorizer as {
    principalId: string;
  };
  const { id: appId } = event.pathParameters as {
    id: string;
  };

  try {
    const putAppUserPermsSchema = z
      .object({
        roles: z.array(z.enum(applicationRolesInOrganization)),
        userId: z
          .string({
            required_error: 'userId is required',
            invalid_type_error: 'userId must be a string',
          })
          .trim(),
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

    let validatedBody;
    try {
      validatedBody = putAppUserPermsSchema.parse(body);
    } catch (exception) {
      return formatValidationErrors(exception);
    }

    const { roles, userId: targetUserId } = validatedBody;

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

    const updatedApp = await putAppUserPerms(appId, roles, targetUserId);
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
