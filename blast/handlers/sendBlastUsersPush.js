/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response';
import sendBlastUsersPush from '../lib/sendBlastUsersPush';
import { checkPerms } from '../../libs/perms/checkPerms';

const allowedPerms = ['pressArticles_all'];

export default async (event) => {
  try {
    const perms = JSON.parse(event.requestContext.authorizer.perms);
    const { appId } = event.requestContext.authorizer;

    if (!checkPerms(allowedPerms, perms)) {
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
