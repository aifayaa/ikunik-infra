/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { modifyAppSchema } from '../validators/modifyAppSchema.schema';
import modifyApp from '../lib/modifyApp';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const appId = event.pathParameters.id;
  try {
    if (!userId) throw new Error('no_user_found');

    const allowed = await checkPermsForApp(userId, appId, 'admin');
    if (!allowed) {
      throw new Error('access_forbidden');
    }

    // Validate the body of the request
    const update = JSON.parse(event.body);

    try {
      modifyAppSchema.parse(update);
    } catch (err) {
      const errors = formatValidationErrors(err);
      const body = formatResponseBody({ errors });
      return response({ code: 200, body });
    }

    const app = await modifyApp(appId, update);

    return response({ code: 200, body: { app } });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
