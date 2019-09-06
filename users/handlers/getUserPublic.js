import pick from 'lodash/pick';
import doGetUser from '../lib/getUser';
import { getTos } from '../../termsOfServices/lib/getTos';
import response from '../../libs/httpResponses/response';

export default async (event, context, callback) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer;
    const urlId = event.pathParameters.id;
    const perms = JSON.parse(event.requestContext.authorizer.perms);

    if (userId !== urlId) {
      callback(null, response({ code: 403, message: 'Forbidden' }));
      return;
    }
    const results = pick(await doGetUser(userId, appId), [
      'country',
      'createdAt',
      'emails',
      'hasArtistProfile',
      'locale',
      'profile',
      'username',
      'optIn',
    ]);
    results.perms = perms;

    /* Check terms of services */
    const termsOfServices = await getTos(appId, false, { outdated: false, required: true });
    if (termsOfServices.length) {
      if (!results.optIn) {
        results.optIn = false;
      } else {
        let optInResult = true;
        termsOfServices.forEach((v) => {
          if (!(results.optIn.indexOf(v._id) + 1)) {
            optInResult = false;
          }
        });
        results.optIn = optInResult;
      }
    }

    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
