/* eslint-disable import/no-relative-packages */
import addAppId from '../lib/addAppId';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;

  try {
    const user = await addAppId(userId, appId);
    return response({ code: 200, body: user });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
