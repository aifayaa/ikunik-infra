import getUploadUrl from '../lib/getUploadUrl';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';
import getCollectionFromContentType from '../lib/getCollectionFromContentType';

const permKey = 'files_upload';

export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
  if (!userId) {
    throw new Error('missing_user_id');
  }

  /* Check upload permissions */
  const perms = JSON.parse(event.requestContext.authorizer.perms);
  if (!checkPerms(permKey, perms)) {
    return new Promise(resolve => resolve(response({ code: 403, message: 'access_forbidden' })));
  }
  try {
    const {
      name,
      type,
      length,
      metadata = {},
    } = JSON.parse(event.body);
    const collection = getCollectionFromContentType(type);
    const info = await getUploadUrl(userId, appId, name, type, length, metadata, collection);
    return new Promise(resolve => resolve(response({ code: 200, body: info })));
  } catch (e) {
    return new Promise(resolve => resolve(response({ code: 500, message: e.message })));
  }
};
