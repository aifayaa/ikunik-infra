import getContactList from '../lib/getContactList';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const { appId, profileId } = event.requestContext.authorizer;
    const contactListId = event.pathParameters.id;
    const {
      limit,
      skip,
      sortBy,
      sortOrder,
    } = event.queryStringParameters || {};
    const results = await getContactList(
      userId,
      profileId,
      contactListId,
      appId,
      { limit,
        skip,
        sortBy,
        sortOrder },
    );
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
