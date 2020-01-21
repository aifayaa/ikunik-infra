import postTicketCategoriesByLineup from '../lib/postTicketCategoriesByLineup';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const lineupId = event.pathParameters.id;
  const userId = event.requestContext.authorizer.principalId;
  const { appId, profileId } = event.requestContext.authorizer;

  if (!event.body) {
    throw new Error('mal formed request');
  }

  const { price, qty, startSale, endSale, name } = JSON.parse(event.body);
  if (!price || !qty || !startSale || !endSale || !name) {
    throw new Error('mal formed request');
  }

  try {
    const results = await postTicketCategoriesByLineup(
      lineupId,
      price,
      qty,
      startSale,
      endSale,
      name,
      userId,
      profileId,
      appId,
    );
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
