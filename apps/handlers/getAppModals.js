import { getAppModals } from '../lib/getAppModals';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  try {
    const {
      appId,
      principalId: userId,
    } = event.requestContext.authorizer;

    const results = await getAppModals(appId, {
      userId,
    });

    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
