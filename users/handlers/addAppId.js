import addAppId from '../lib/addAppId';
import response from '../../libs/httpResponses/response';

export default async (event, context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;

  try {
    const user = await addAppId(userId, appId);
    callback(null, response({ code: 200, body: user }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
