import getContacts from '../lib/getContacts';
import response from '../../libs/httpResponses/response';

// To avoid getting a warning with lint
const jsConsole = console;

export default async (event) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const { appId, profileId } = event.requestContext.authorizer;
    jsConsole.info(userId, event.queryStringParameters);
    const {
      idsOnly, filter, limit, search, skip, sortBy, sortOrder, type,
    } = event.queryStringParameters || {};
    const results = await getContacts(userId, profileId, appId, {
      idsOnly, filter, limit, search, skip, sortBy, sortOrder, type,
    });
    return response({ code: 200, body: results });
  } catch (e) {
    jsConsole.error(e);
    return response({ code: 500, message: e.message });
  }
};
