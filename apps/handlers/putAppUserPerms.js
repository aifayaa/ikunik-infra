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
import putAppUserPerms from '../lib/putAppUserPerms';
import {
  filterAppPrivateFields,
  getApp,
  getApplicationOrganizationId,
} from '../lib/appsUtils.ts';
import { applicationRolesInOrganization } from '../../organizations/lib/organizationsUtils.ts';

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
    } catch (exception) {
      return formatValidationErrors(exception);
    }

    const { roles, userId: targetUserId } = validatedBody;

    await checkPermsForApp(sourceUserId, appId, ['admin']);

    const app = await getApp(appId);
    const orgId = getApplicationOrganizationId(app);

    const organizationPermissionLevel = ['member'];
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

    const modifiedApp = await putAppUserPerms(appId, roles, targetUserId);

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
