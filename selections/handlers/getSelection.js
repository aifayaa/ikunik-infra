import winston from 'winston';
import getSelection from '../libs/getSelection';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const selectionId = event.pathParameters.id;
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
  try {
    if (!selectionId) throw new Error('Missing id');
    const results = await getSelection(selectionId, userId, appId);
    if (!results) throw new Error('not_found');
    return response({ code: 200, body: results });
  } catch (e) {
    const code = (e.message === 'not_found') ? 404 : 500;
    winston.error(e);
    return response({ code, message: e.message });
  }
};

// BUG: a bug occured on awax stage where getSelection randomly return 404,
// a quick fix was to add this portion of code which store
// selection result on a collection, but selections can be user
// related, that's the case for subscription content which is related
// to user subscriptions, activate this code will broke subscriptions:
//
// import doGetBackupSelection from '../libs/doGetBackupSelection';
// import doRegisterBackupSelection from '../libs/doRegisterBackupSelection';
//
// if (!results) {
//   results = await doGetBackupSelection(selectionId);
//   if (!results) throw new Error('not_found');
// } else {
//   await doRegisterBackupSelection(results);
// }
