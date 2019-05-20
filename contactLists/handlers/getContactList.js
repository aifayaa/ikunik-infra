import getContactList from '../lib/getContactList';

export default async (event, context, callback) => {
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
    const response = {
      statusCode: 200,
      body: JSON.stringify(results),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    const response = {
      statusCode: 500,
      body: JSON.stringify({ message: e.message }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  }
};
