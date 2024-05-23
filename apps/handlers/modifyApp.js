/* eslint-disable import/no-relative-packages */
import response, {
  handleException,
} from '../../libs/httpResponses/response.ts';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';
import { modifyAppSchema } from '../validators/modifyAppSchema.schema';
import modifyApp from '../lib/modifyApp';
import { filterAppPrivateFields, getAppLockedFields } from '../lib/appsUtils';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const appId = event.pathParameters.id;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

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

    return response({
      code: 200,
      body: formatResponseBody({
        data: {
          ...filterAppPrivateFields(app),
          locked: getAppLockedFields(app),
        },
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
