import pick from 'lodash/pick';
import doGetUser from '../lib/getUser';
import response from '../../libs/httpResponses/response';

export default async (event, context, callback) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const urlId = event.pathParameters.id;
    const perms = JSON.parse(event.requestContext.authorizer.perms);

    if (userId !== urlId) {
      callback(null, response({ code: 403, message: 'Forbidden' }));
      return;
    }
    const results = pick(await doGetUser(userId), [
      'country',
      'createdAt',
      'emails',
      'hasArtistProfile',
      'locale',
      'profile',
      'username',
    ]);
    results.perms = perms;

    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
