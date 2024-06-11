/* eslint-disable import/no-relative-packages */
import { APIGatewayProxyEvent } from 'aws-lambda';
import { AppsPermType } from '../../libs/perms/permEntities';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { getApp } from '../lib/appsUtils';

import {
  addUserApplicationRoles,
  filterUserPrivateFields,
} from '../../users/lib/usersUtils';
import getAppUsers from '../lib/getAppUsers.js';
import { UserType } from '../../users/lib/userEntity';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_NOT_FOUND,
  USER_NOT_FOUND_CODE,
} from '../../libs/httpResponses/errorCodes';
import response, { handleException } from '../../libs/httpResponses/response';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';

export default async (event: APIGatewayProxyEvent) => {
  const { principalId: userId } = event.requestContext.authorizer as {
    principalId: string;
  };
  const { id: appId, userId: targetUserId } = event.pathParameters as {
    id: string;
    userId: string;
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

    const userCandidate = users.find(
      (userWk: UserType) => userWk._id === targetUserId
    );

    if (!userCandidate) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        USER_NOT_FOUND_CODE,
        `Cannot found user '${userId}' in application '${appId}'`
      );
    }

    return response({
      code: 200,
      body: formatResponseBody({
        data: {
          ...filterUserPrivateFields(
            addUserApplicationRoles(app, userCandidate)
          ),
        },
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
