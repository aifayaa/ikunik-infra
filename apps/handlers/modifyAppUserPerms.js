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
import modifyAppUserPerms from '../lib/modifyAppUserPerms';
import { applicationRolesInOrganization } from '../../organizations/lib/organizationsUtils';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  APPLICATION_PERMISSION_CODE,
  ERROR_TYPE_ACCESS,
  ORGANIZATION_PERMISSION_CODE,
} from '../../libs/httpResponses/errorCodes';
import { filterAppPrivateFields } from '../lib/appsUtils';

export default async (event) => {
  const { principalId: sourceUserId } = event.requestContext.authorizer;
  const { id: appId, userId: targetUserId } = event.pathParameters;

  try {
    const modifyAppUserPermsSchema = z
      .object({
        roles: z.array(z.enum(applicationRolesInOrganization)),
      })
      .required();

    // Validate the body of the request
    const body = JSON.parse(event.body);

    let validatedBody;
    try {
      validatedBody = modifyAppUserPermsSchema.parse(body);
    } catch (err) {
      const errors = formatValidationErrors(err);
      const errorBody = formatResponseBody({ errors });
      return response({ code: 200, body: errorBody });
    }

    const { roles } = validatedBody;

    // Check right for sourceUserId to appId
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
        ORGANIZATION_PERMISSION_CODE,
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
        ORGANIZATION_PERMISSION_CODE,
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

    const app = await modifyAppUserPerms(
      sourceUserId,
      targetUserId,
      appId,
      roles
    );

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
