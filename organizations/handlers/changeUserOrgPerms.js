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
  addUserOrganisationRoles,
  filterUserPrivateFields,
} from '../../users/lib/usersUtils.ts';
import { organizationRoles } from '../lib/organizationsUtils.ts';

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
    await checkPermsForOrganization(
      sourceUserId,
      orgId,
      orgPermissionLevelSourceUser
    );

    const orgPermissionLevelTargetUser = 'member';
    await checkPermsForOrganization(
      targetUserId,
      orgId,
      orgPermissionLevelTargetUser
    );

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
