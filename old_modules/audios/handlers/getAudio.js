import getAudio from '../lib/getAudio';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  try {
    const { appId } = event.requestContext.authorizer;
    const audioId = event.pathParameters.id;
    const results = await getAudio(audioId, appId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
