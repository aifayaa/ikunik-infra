/* eslint-disable import/no-relative-packages */
import response, {
  handleException,
} from '../../libs/httpResponses/response.ts';
import sendBlastUsersPush from '../lib/sendBlastUsersPush';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

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
  } catch (exception) {
    return handleException(exception);
  }
};
