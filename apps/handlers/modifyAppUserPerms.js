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
