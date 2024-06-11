/* eslint-disable import/no-relative-packages */
// import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody.ts';
// import response, {
//   handleException,
// } from '../../libs/httpResponses/response.ts';
// import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';
// import { filterAppPrivateFields } from '../lib/appsUtils.ts';
import delUserAppPerms from '../lib/delUserAppPerms';

import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';
import response, {
  handleException,
} from '../../libs/httpResponses/response.ts';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody.ts';
import { filterAppPrivateFields } from '../lib/appsUtils.ts';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const { id: appId, userId: targetUserId } = event.pathParameters;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const app = await delUserAppPerms(targetUserId, appId);

    return response({
      code: 200,
      body: formatResponseBody({
        data: {
          items: filterAppPrivateFields(app),
        },
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
