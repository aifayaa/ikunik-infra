import openOrder from '../lib/openOrder';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const { creditPackId } = JSON.parse(event.body);
    if (!creditPackId) {
      throw new Error('mal formed request');
    }
    const results = await openOrder(creditPackId, userId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
