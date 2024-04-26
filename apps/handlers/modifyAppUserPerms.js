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
  const { id: appId, userId: targetUserId } = event.pathParameters;

  try {
    if (!userId) throw new Error('no_user_found');

    // Check right for userId to appId
    const allowed = await checkPermsForApp(userId, appId, 'admin');
    if (!allowed) {
      throw new Error('access_forbidden');
    }

    // Validate the body of the request
    const body = JSON.parse(event.body);

    let validatedBody;
    try {
      validatedBody = modifyAppUserPermsSchema.parse(body);
    } catch (err) {
      const errors = formatValidationErrors(err);
      const errorBody = formatResponseBody({ errors });
      return response({ code: 200, body: errorBody });
    }

    const app = await modifyAppUserPerms(appId, targetUserId, validatedBody);

    return response({ code: 200, body: app });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
