/* eslint-disable import/no-relative-packages */
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody.ts';
import response, {
  handleException,
} from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';
import {
  addUserApplicationRoles,
  filterUserPrivateFields,
} from '../../users/lib/usersUtils.ts';
import { getApp } from '../lib/appsUtils.ts';
import getAppUsers from '../lib/getAppUsers';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const appId = event.pathParameters.id;

  try {
    const requestedPermissions = ['viewer', 'moderator', 'editor'];
    await checkPermsForApp(userId, appId, requestedPermissions);

    const users = await getAppUsers(appId);
    const app = await getApp(appId);

    return response({
      code: 200,
      body: formatResponseBody({
        data: {
          items: users
            .map((user) => addUserApplicationRoles(app, user))
            .map(filterUserPrivateFields),
          totalCount: users.length,
        },
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
