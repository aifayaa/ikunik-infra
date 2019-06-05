import postCategory from '../lib/postCategory';
import response from '../../libs/httpResponses/response';

export default async (event, context, callback) => {
  const catId = event.pathParameters.id;
  const { appId } = event.requestContext.authorizer;
  try {
    const {
      name,
      pathName,
      color,
    } = JSON.parse(event.body);

    if (!name || !pathName || !color) {
      throw new Error('Missing arguments');
    }
    [
      name,
      pathName,
      color,
    ].forEach((item) => {
      if (item && typeof item !== 'string') {
        throw new Error('Wrong argument type');
      }
    });

    const results = await postCategory(appId, catId, name, pathName, color);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};

