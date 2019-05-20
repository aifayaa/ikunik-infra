import { doUnlinkMediaFromSelection } from '../libs/mediaSelections';
import response from '../../libs/httpResponses/response';

export default async (event, _context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
  const selectionId = event.pathParameters.id;
  try {
    const { mediaIds } = JSON.parse(event.body);
    await doUnlinkMediaFromSelection(userId, selectionId, mediaIds, appId);
    callback(null, response({ code: 200, body: true }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
