/* eslint-disable import/no-relative-packages */
import { z } from 'zod';
import response, { handleException } from '../../libs/httpResponses/response';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import {
  checkPermsForApp,
  checkPermsForOrganization,
  getApplicationOrganizationId,
} from '../../libs/perms/checkPermsFor';
import putAppUserPerms from '../lib/putAppUserPerms';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  APPLICATION_PERMISSION_CODE,
  ERROR_TYPE_ACCESS,
} from '../../libs/httpResponses/errorCodes';
import { filterAppPrivateFields } from '../lib/appsUtils';
import { applicationRolesInOrganization } from '../../organizations/lib/organizationsUtils';

/**
 * As the source user must be an 'admin' of the application, he can give
 * any roles to the target user.
 */
export default async (event) => {
  const { principalId: sourceUserId } = event.requestContext.authorizer;
  const { id: appId } = event.pathParameters;

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

    // Validate the body of the request
    const body = JSON.parse(event.body);

    let validatedBody;
    try {
      validatedBody = putAppUserPermsSchema.parse(body);
    } catch (err) {
      const errors = formatValidationErrors(err);
      const errorBody = formatResponseBody({ errors });
      return response({ code: 200, body: errorBody });
    }

    const { roles, userId: targetUserId } = validatedBody;

    const appPermissionLevel = 'admin';
    const allowed = await checkPermsForApp(
      sourceUserId,
      appId,
      appPermissionLevel
    );
    if (!allowed) {
      throw new CrowdaaError(
        ERROR_TYPE_ACCESS,
        APPLICATION_PERMISSION_CODE,
        `User '${sourceUserId}' is not at least '${appPermissionLevel}' on application '${appId}'`,
        {
          details: {
            userId: sourceUserId,
            appId,
            appPermissionLevel,
          },
        }
      );
    }

    const orgId = await getApplicationOrganizationId(appId);

    const organizationPermissionLevel = 'member';
    const organizationUserSourceAllowed = await checkPermsForOrganization(
      sourceUserId,
      orgId,
      organizationPermissionLevel
    );

    if (!organizationUserSourceAllowed) {
      throw new CrowdaaError(
        ERROR_TYPE_ACCESS,
        APPLICATION_PERMISSION_CODE,
        `User '${sourceUserId}' is not at least '${organizationPermissionLevel}' on organization '${orgId}'`,
        {
          details: {
            sourceUserId,
            orgId,
            organizationPermissionLevel,
          },
        }
      );
    }
    const organizationTargetUserAllowed = await checkPermsForOrganization(
      targetUserId,
      orgId,
      organizationPermissionLevel
    );
    if (!organizationTargetUserAllowed) {
      throw new CrowdaaError(
        ERROR_TYPE_ACCESS,
        APPLICATION_PERMISSION_CODE,
        `User '${targetUserId}' is not at least '${organizationPermissionLevel}' on organization '${orgId}'`,
        {
          details: {
            targetUserId,
            orgId,
            organizationPermissionLevel,
          },
        }
      );
    }

    // TODO: an admin must always remain on an application
    const app = await putAppUserPerms(appId, roles, targetUserId);

    return response({
      code: 200,
      body: formatResponseBody({
        data: filterAppPrivateFields(app),
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
