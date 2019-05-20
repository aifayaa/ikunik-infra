import winston from 'winston';
import getContacts from '../lib/getContacts';
import response from '../../libs/httpResponses/response';

export default async (event, _context, callback) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const { appId, profileId } = event.requestContext.authorizer;
    winston.info(userId, event.queryStringParameters);
    const {
      idsOnly, filter, limit, search, skip, sortBy, sortOrder, type,
    } = event.queryStringParameters || {};
    const results = await getContacts(userId, profileId, appId, {
      idsOnly, filter, limit, search, skip, sortBy, sortOrder, type,
    });
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    winston.error(e);
    callback(null, response({ code: 500, message: e.message }));
  }
};
