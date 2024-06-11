/* eslint-disable import/no-relative-packages */
import { APIGatewayProxyEvent } from 'aws-lambda';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { AppsPermType } from '../../libs/perms/permEntities';
import {
  addUserApplicationRoles,
  filterUserPrivateFields,
} from '../../users/lib/usersUtils';
import { getApp } from '../lib/appsUtils';
import getAppUsers from '../lib/getAppUsers';

export default async (event: APIGatewayProxyEvent) => {
  const { principalId: userId } = event.requestContext.authorizer as {
    principalId: string;
  };
  const { id: appId } = event.pathParameters as {
    id: string;
  };

  try {
    const requestedPermissions = [
      'viewer',
      'moderator',
      'editor',
    ] as AppsPermType[];
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
