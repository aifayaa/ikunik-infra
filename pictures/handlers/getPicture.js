import getPicture from '../lib/getPicture';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  try {
    const { id } = event.pathParameters;
    const { appId } = event.requestContext.authorizer;
    const results = await getPicture(id, appId, event.queryStringParameters || {});
    if (!results) throw new Error('picture_not_found');
    return response({ code: 200, body: results });
  } catch (e) {
    const code = e.message === 'picture_not_found' ? 404 : 500;
    return response({ code, message: e.message });
  }
};
