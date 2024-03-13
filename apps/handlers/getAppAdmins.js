/* eslint-disable import/no-relative-packages */
import getAppAdmins from '../lib/getAppAdmins';
import response from '../../libs/httpResponses/response';
import errorMessage from '../../libs/httpResponses/errorMessage';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    const allowed = await checkPermsForApp(userId, appId, 'admin');
    if (!allowed) {
      throw new Error('access_forbidden');
    }

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
  } catch (e) {
    return response(errorMessage(e));
  }
};
