import getTicketCategoriesByLineup from '../lib/getTicketCategoriesByLineup';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  let { lineupId } = event.pathParameters;
  const { appId } = event.requestContext.authorizer;
  const { id } = event.pathParameters;
  let userId = id;
  if (event.resource.split('/')[1] === 'users') {
    userId = event.requestContext.authorizer.principalId;
  } else {
    userId = null;
    lineupId = id;
  }
  try {
    if (userId && userId !== id) throw new Error('forbidden');
    const results = await getTicketCategoriesByLineup(lineupId, userId, appId);
    return response({ code: 200, body: results });
  } catch (e) {
    let code;
    switch (e.message) {
      case 'forbidden':
      case 'ressource_not_owned':
        code = 403;
        break;
      default:
        code = 500;
    }

    return response({ code, message: e.message });
  }
};
