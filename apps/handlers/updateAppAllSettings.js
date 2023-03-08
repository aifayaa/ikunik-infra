import updateAppSettings from '../lib/updateAppSettings';
import getPerms from '../../libs/perms/getPerms';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const permKey = 'apps_getInfos';

export default async (event) => {
  const appId = event.pathParameters.id;
  const userId = event.requestContext.authorizer.principalId;
  try {
    const perms = await getPerms(userId, appId);
    if (!checkPerms(permKey, perms)) {
      throw new Error('access_forbidden');
    }

    const settings = JSON.parse(event.body);

    const results = await updateAppSettings(appId, settings);

    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
