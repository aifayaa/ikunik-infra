import postStage from '../lib/postStage';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  try {
    if (!event.body) {
      throw new Error('mal_formed_request');
    }
    const { name, addr } = JSON.parse(event.body);
    if (!name) {
      throw new Error('mal_formed_request');
    }

    const results = await postStage(name, addr, appId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
