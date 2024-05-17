/* eslint-disable import/no-relative-packages */
import listUserBadges from '../lib/listUserBadges';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const userBadges = await listUserBadges(appId);
    return response({ code: 200, body: { userBadges } });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
