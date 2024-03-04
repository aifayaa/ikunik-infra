/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import reorderCategory from '../lib/reorderCategory';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const permKey = 'pressCategories_all';

export default async (event) => {
  const { id: categoryId } = event.pathParameters;
  const { appId, perms } = event.requestContext.authorizer;
  const permsParsed = JSON.parse(perms);

  try {
    if (!checkPerms(permKey, permsParsed)) {
      throw new Error('access_forbidden');
    }
    if (!event.body) {
      throw new Error('malformed_request');
    }
    if (!categoryId) {
      throw new Error('missing_argument');
    }
    const { order } = JSON.parse(event.body);

    if (typeof order !== 'number') {
      throw new Error('missing_argument');
    }

    const reorderResult = await reorderCategory(appId, categoryId, order);

    return response({ code: 200, body: reorderResult });
  } catch (e) {
    return response(errorMessage(e));
  }
};
