/* eslint-disable import/no-relative-packages */
import { z } from 'zod';
import response, {
  handleException,
} from '../../libs/httpResponses/response.ts';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors.ts';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody.ts';
import {
  checkPermsForApp,
  checkPermsForOrganization,
} from '../../libs/perms/checkPermsFor.ts';
import modifyAppUserPerms from '../lib/modifyAppUserPerms';
import { applicationRolesInOrganization } from '../../organizations/lib/organizationsUtils.ts';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError.ts';
import {
  ERROR_TYPE_ACCESS,
  ORGANIZATION_PERMISSION_CODE,
} from '../../libs/httpResponses/errorCodes';
import {
  filterAppPrivateFields,
  getApp,
  getApplicationOrganizationId,
} from '../lib/appsUtils.ts';

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
    await checkPermsForApp(sourceUserId, appId, ['admin']);

    const app = await getApp(appId);
    const orgId = getApplicationOrganizationId(app);

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

    const modifiedApp = await modifyAppUserPerms(
      sourceUserId,
      targetUserId,
      appId,
      roles
    );

    return response({
      code: 200,
      body: formatResponseBody({
        data: filterAppPrivateFields(modifiedApp),
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
