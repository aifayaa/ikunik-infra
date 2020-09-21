import errorMessage from '../../libs/httpResponses/errorMessage';
import getAppPreview from '../lib/getAppPreview';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const permKey = 'apps_getAppPreview';

export default async (event) => {
  const {
    pathParameters,
    requestContext,
  } = event;
  const { id: key } = pathParameters;
  const { perms: rawPerms } = requestContext.authorizer;
  const perms = JSON.parse(rawPerms);

  try {
    if (!checkPerms(permKey, perms)) {
      throw new Error('access_forbidden');
    }

    const results = await getAppPreview(key);

    if (results === false) {
      throw new Error('app_not_found');
    }

    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
