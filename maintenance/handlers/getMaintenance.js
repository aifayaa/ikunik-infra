import getMaintenance from '../lib/getMaintenance';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  try {
    const msg = await getMaintenance(appId);
    return response({ code: 200, body: msg || {} });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
