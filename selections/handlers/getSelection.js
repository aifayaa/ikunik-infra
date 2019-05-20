import winston from 'winston';
import getSelection from '../libs/getSelection';
import response from '../../libs/httpResponses/response';

export default async (event, _context, callback) => {
  try {
    const selectionId = event.pathParameters.id;
    const userId = event.requestContext.authorizer.principalId;
    const { appId } = event.requestContext.authorizer;
    if (!selectionId) throw new Error('Missing id');
    const results = await getSelection(selectionId, userId, appId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    const code = (e.message === 'Not found') ? 404 : 500;
    winston.error(e);
    callback(null, response({ code, message: e.message }));
  }
};
