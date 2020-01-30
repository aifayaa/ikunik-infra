import winston from 'winston';
import getSelections from '../libs/getSelections';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  try {
    const { type, web, mobile, root } = event.queryStringParameters || {};
    const { appId } = event.requestContext.authorizer;
    console.log('getSelections ');
    console.log({
      type,
      web,
      mobile,
      root,
      appId,
    });
    const results = await getSelections({ type, web, mobile, root, appId });
    return response({ code: 200, body: results });
  } catch (e) {
    winston.error(e);
    return response({ code: 500, message: e.message });
  }
};
