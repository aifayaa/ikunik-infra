/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import getAppUsers from '../lib/getAppUsers';
import getUserApps from '../lib/getUserApps';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const appId = event.pathParameters.id;

  try {
    if (!userId) throw new Error('no_user_found');

    // Check if userId has access to appId before anything else
    const { apps, organizationsApps } = await getUserApps(userId);
    const appIds = apps
      .map((app) => app._id)
      .concat(organizationsApps.map((app) => app._id));

    if (!appIds.includes(appId)) {
      throw new Error('access_forbidden');
    }

    const users = await getAppUsers(appId);

    return response({ code: 200, body: users });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
