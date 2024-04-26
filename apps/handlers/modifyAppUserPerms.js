/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import { modifyAppUserPermsSchema } from '../validators/modifyAppUserPermsSchema.schema';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import modifyAppUserPerms from '../lib/modifyAppUserPerms';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const appId = event.pathParameters.id;
  const targetUserId = event.pathParameters.userId;

  try {
    if (!userId) throw new Error('no_user_found');

    // Check right for userId to appId
    const allowed = await checkPermsForApp(userId, appId, 'admin');
    if (!allowed) {
      throw new Error('access_forbidden');
    }

    // Validate the body of the request
    const body = JSON.parse(event.body);
    // console.log('update', update);

    let bodyValidated;
    try {
      bodyValidated = modifyAppUserPermsSchema.parse(body);
    } catch (err) {
      const errors = formatValidationErrors(err);
      const errorBody = formatResponseBody({ errors });
      return response({ code: 200, body: errorBody });
    }

    // return response({ code: 200, body: zodRes });

    const app = await modifyAppUserPerms(appId, targetUserId, bodyValidated);

    return await response({ code: 200, body: app });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
