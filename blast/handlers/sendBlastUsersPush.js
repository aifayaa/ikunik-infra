/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response';
import sendBlastUsersPush from '../lib/sendBlastUsersPush';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    const allowed = await checkPermsForApp(userId, appId, 'admin');
    if (!allowed) {
      throw new Error('access_forbidden');
    }

    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const {
      filters,
      message: { title = '', content = '', extraData = {} },
    } = JSON.parse(event.body);

    const results = await sendBlastUsersPush(appId, {
      filters,
      message: {
        title,
        content,
        extraData,
      },
    });

    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
