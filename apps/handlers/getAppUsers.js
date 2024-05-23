/* eslint-disable import/no-relative-packages */
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import response, {
  handleException,
} from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';
import { filterUserPrivateFields } from '../../users/lib/usersUtils.ts';
import getAppUsers from '../lib/getAppUsers';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const appId = event.pathParameters.id;

  try {
    const requestedPermissions = ['viewer', 'moderator', 'editor'];
    await checkPermsForApp(userId, appId, requestedPermissions);

    const users = await getAppUsers(appId);

    return response({
      code: 200,
      body: formatResponseBody({
        data: {
          items: filterUserPrivateFields(users),
          totalCount: users.length,
        },
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
