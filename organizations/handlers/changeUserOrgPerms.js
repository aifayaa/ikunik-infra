/* eslint-disable import/no-relative-packages */
import { z } from 'zod';
import response, {
  handleException,
} from '../../libs/httpResponses/response.ts';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors.ts';
import { checkPermsForOrganization } from '../../libs/perms/checkPermsFor.ts';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody.ts';
import changeUserOrgPerms from '../lib/changeUserOrgPerms';
import {
  ERROR_TYPE_ACCESS,
  ORGANIZATION_PERMISSION_CODE,
} from '../../libs/httpResponses/errorCodes';
import {
  addUserOrganisationRoles,
  filterUserPrivateFields,
} from '../../users/lib/usersUtils.ts';
import { organizationRoles } from '../lib/organizationsUtils.ts';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError.ts';

export default async (event) => {
  const { principalId: sourceUserId } = event.requestContext.authorizer;
  const { id: orgId, userId: targetUserId } = event.pathParameters;

  try {
    const changeUserOrgPermsSchema = z
      .object({
        roles: z.array(z.enum(organizationRoles)).nonempty(),
      })
      .required();

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
    const orgPermissionLevelSourceUser = 'admin';
    const sourceUserAllowed = await checkPermsForOrganization(
      sourceUserId,
      orgId,
      orgPermissionLevelSourceUser
    );
    if (!sourceUserAllowed) {
      const errorBody = formatResponseBody({
        errors: [
          {
            type: ERROR_TYPE_ACCESS,
            code: ORGANIZATION_PERMISSION_CODE,
            message: `User '${sourceUserId}' is not at least '${orgPermissionLevelSourceUser}' on organization '${orgId}'`,
            details: {
              userId: sourceUserId,
              orgId,
              orgPermissionLevel: orgPermissionLevelSourceUser,
            },
          },
        ],
      });
      return response({ code: 200, body: errorBody });
    }

    const orgPermissionLevelTargetUser = 'member';
    const targetUserAllowed = await checkPermsForOrganization(
      targetUserId,
      orgId,
      orgPermissionLevelTargetUser
    );
    if (!targetUserAllowed) {
      throw new CrowdaaError(
        ERROR_TYPE_ACCESS,
        ORGANIZATION_PERMISSION_CODE,
        `User '${targetUserId}' is not at least '${orgPermissionLevelTargetUser}' on organization '${orgId}'`,
        {
          details: {
            userId: targetUserId,
            orgId,
            orgPermissionLevel: orgPermissionLevelTargetUser,
          },
        }
      );
    }

    const user = await changeUserOrgPerms(
      sourceUserId,
      targetUserId,
      orgId,
      roles
    );

    return response({
      code: 200,
      body: formatResponseBody({
        data: filterUserPrivateFields(addUserOrganisationRoles(user, orgId)),
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
