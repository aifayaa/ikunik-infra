import getSelections from '../libs/getSelections';
import response from '../../libs/httpResponses/response';

// To avoid getting a warning with lint
const jsConsole = console;

export default async (event) => {
  try {
    const { type, web, mobile, root } = event.queryStringParameters || {};
    const { appId } = event.requestContext.authorizer;
    const results = await getSelections({ type, web, mobile, root, appId });
    return response({ code: 200, body: results });
  } catch (e) {
    jsConsole.error(e);
    return response({ code: 500, message: e.message });
  }
};
