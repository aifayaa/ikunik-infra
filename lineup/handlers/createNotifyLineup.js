import createNotify from '../lib/createNotify';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  try {
    const { appId } = event.requestContext.authorizer;
    const lineupId = event.pathParameters.id;
    const results = await createNotify(lineupId, appId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
