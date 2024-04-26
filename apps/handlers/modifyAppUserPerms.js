/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import getUserApps from '../lib/getUserApps';
import { modifyAppUserPermsSchema } from '../validators/modifyAppUserPermsSchema.schema';
// import modifyAppUserPerms from '../lib/modifyAppUserPerms';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const appId = event.pathParameters.id;
  const targetUserId = event.pathParameters.userId;

  try {
    if (!userId) throw new Error('no_user_found');

    // Check if userId has access to appId before anything else
    const { apps, orgsApps } = await getUserApps(userId);
    const appIds = apps
      .map((app) => app._id)
      .concat(orgsApps.map((app) => app._id));

    if (!appIds.includes(appId)) {
      throw new Error('access_forbidden');
    }

    // Validate the body of the request
    const update = JSON.parse(event.body);
    // console.log('update', update);

    try {
      modifyAppUserPermsSchema.parse(update);
    } catch (err) {
      const errors = formatValidationErrors(err);
      const body = formatResponseBody({ errors });
      return response({ code: 200, body });
    }

    // const users = await modifyAppUserPerms(appId, targetUserId);

    const res = { modifyAppUserPerms: true };

    return await response({ code: 200, body: res });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
