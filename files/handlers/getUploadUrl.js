import getUploadUrl from '../lib/getUploadUrl';

export default async (event, context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
  const response = {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
  };
  try {
    const {
      name,
      type,
      length,
      metadata = {},
    } = JSON.parse(event.body);
    const info = getUploadUrl(userId, name, type, length, metadata);
    response.statusCode = 200;
    response.body = JSON.stringify(info);
  } catch (e) {
    response.statusCode = 500;
    response.body = JSON.stringify({
      message: e.message,
    });
  } finally {
    callback(null, response);
  }
};
