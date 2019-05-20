import winston from 'winston';
import getSelections from '../libs/getSelections';
import response from '../../libs/httpResponses/response';

export default async (event, _context, callback) => {
  try {
    const { type, web, mobile, root } = event.queryStringParameters || {};
    const { appId } = event.requestContext.authorizer;
    const results = await getSelections({ type, web, mobile, root, appId });
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    winston.error(e);
    callback(null, response({ code: 500, message: e.message }));
  }
};
