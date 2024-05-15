/* eslint-disable import/no-relative-packages */
import pick from 'lodash/pick';
import MongoClient from '../../libs/mongoClient';
import doGetUser from '../lib/getUser';
import { getTos } from '../../termsOfServices/lib/getTos';
import getSelfUserBadges from '../../userBadges/lib/getSelfUserBadges';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForAppAux } from '../../libs/perms/checkPermsFor';
import allPerms from '../../account/lib/allPerms';

export default async (event) => {
  const client = MongoClient.connect();
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer;
    const urlId = event.pathParameters.id;
    const perms = JSON.parse(event.requestContext.authorizer.perms);

    const isAdmin = await checkPermsForAppAux(
      client.db(),
      userId,
      appId,
      'admin'
    );
    if (userId !== urlId && !isAdmin) {
      return response({ code: 403, message: 'access_forbidden' });
    }

    const results = pick(await doGetUser(urlId, appId), [
      'country',
      'createdAt',
      'emails',
      'hasArtistProfile',
      'locale',
      'profile',
      'username',
      'optIn',
      'previewForAdmin',
      'settings',
    ]);
    results.perms = isAdmin ? allPerms : perms;
    try {
      results.allBadges = await getSelfUserBadges(appId, urlId);
    } catch (e) {
      results.allBadges = [];
    }

    /* Check terms of services */
    const termsOfServices = await getTos(appId, false, {
      outdated: false,
      required: true,
    });
    if (termsOfServices.length) {
      if (!results.optIn || !Array.isArray(results.optIn)) {
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
    return response({ code: 200, body: results });
  } catch (exception) {
    return handleException(exception);
  } finally {
    client.close();
  }
};
