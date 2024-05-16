/* eslint-disable import/no-relative-packages */
import getAppAdmins from '../lib/getAppAdmins';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const rawAdmins = await getAppAdmins(appId);

    if (rawAdmins === false) {
      return response({ code: 404, message: 'app_not_found' });
    }
    const admins = rawAdmins.map((user) => ({
      _id: user._id,
      email: user.emails[0].address,
      firstname: user.profile.firstname,
      lastname: user.profile.lastname,
    }));
    return response({ code: 200, body: admins });
  } catch (exception) {
    return handleException(exception);
  }
};
