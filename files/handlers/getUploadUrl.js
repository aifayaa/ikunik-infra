/* eslint-disable import/no-relative-packages */
import getUploadUrl from '../lib/getUploadUrl';
import response from '../../libs/httpResponses/response.ts';

export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;

  /* Check upload permissions */
  // TODO: better rights management, Upload File is allowed for all logged users
  try {
    if (!userId) {
      throw new Error('missing_user_id');
    }

    const { files, metadata = {} } = JSON.parse(event.body);

    if (typeof files !== 'object' || !files.length) {
      throw new Error('wrong_argument');
    }

    if (typeof metadata !== 'object') {
      throw new Error('wrong_argument_type');
    }

    if (!metadata) {
      throw new Error('wrong_argument');
    }

    files.forEach((v) => {
      const { name, type, size } = v;
      if (
        typeof name !== 'string' ||
        typeof type !== 'string' ||
        typeof size !== 'number'
      ) {
        throw new Error('wrong_argument_type');
      }
      if (!name || !type || !size) {
        throw new Error('wrong_argument');
      }
    });

    const info = await getUploadUrl(userId, appId, files, metadata);
    return response({ code: 200, body: info });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
