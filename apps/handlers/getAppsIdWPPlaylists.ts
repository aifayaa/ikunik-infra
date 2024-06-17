/* eslint-disable import/no-relative-packages */
import { APIGatewayProxyEvent } from 'aws-lambda';
import { AppsPermType } from '../../libs/perms/permEntities';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import response, { handleException } from '../../libs/httpResponses/response';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import getAppsIdWPPlaylists from '../lib/getAppsIdWPPlaylists';

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

    const playlists = await getAppsIdWPPlaylists(appId);

    return response({
      code: 200,
      body: formatResponseBody({
        data: playlists,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
