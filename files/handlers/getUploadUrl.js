import getUploadUrl from '../lib/getUploadUrl';

export default async (event, context, callback) => {
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
    } = JSON.parse(event.body);
    const uploadUrl = getUploadUrl(null, name, type);
    response.statusCode = 200;
    response.body = JSON.stringify({
      url: uploadUrl,
    });
  } catch (e) {
    response.statusCode = 500;
    response.body = JSON.stringify({
      message: e.message,
    });
  } finally {
    callback(null, response);
  }
};
