import getUploadUrl from '../lib/getUploadUrl';
import response from '../../libs/httpResponses/response';

const permKey = 'files_upload';

export default async (event, context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
  const perms = JSON.parse(event.requestContext.authorizer.perms);
  const { appId } = event.requestContext.authorizer;
  if (!perms[permKey]) {
    callback(null, response({ code: 403, message: 'access forbidden' }));
    return;
  }

  try {
    const {
      name,
      type,
      length,
      metadata = {},
    } = JSON.parse(event.body);
    const info = getUploadUrl(userId, appId, name, type, length, metadata);
    callback(null, response({ code: 200, body: info }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
