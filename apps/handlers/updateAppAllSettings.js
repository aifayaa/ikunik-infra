/* eslint-disable import/no-relative-packages */
import updateAppSettings from '../lib/updateAppSettings';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    const allowed = await checkPermsForApp(userId, appId, 'admin');
    if (!allowed) {
      throw new Error('access_forbidden');
    }

    const settings = JSON.parse(event.body);

    const results = await updateAppSettings(appId, settings);

    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
