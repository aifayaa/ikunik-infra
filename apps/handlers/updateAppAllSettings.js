/* eslint-disable import/no-relative-packages */
import updateAppSettings from '../lib/updateAppSettings';
import response, {
  handleException,
} from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  const {
    appId,
    principalId: userId,
    superAdmin = false,
  } = event.requestContext.authorizer;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const settings = JSON.parse(event.body);

    const results = await updateAppSettings(appId, settings, superAdmin);

    return response({ code: 200, body: results });
  } catch (exception) {
    return handleException(exception);
  }
};
