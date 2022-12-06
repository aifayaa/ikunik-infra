import getScanner from '../lib/getScanner';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  try {
    const { appId } = event.requestContext.authorizer;
    const scannerId = event.pathParameters.id;
    const results = await getScanner(scannerId, appId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
