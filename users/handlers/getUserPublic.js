/* eslint-disable import/no-relative-packages */
import pick from 'lodash/pick';
import doGetUser from '../lib/getUser';
import { getTos } from '../../termsOfServices/lib/getTos';
import getSelfUserBadges from '../../userBadges/lib/getSelfUserBadges';
import response from '../../libs/httpResponses/response.ts';
import {
  checkFeaturePermsForApp,
  checkPermsForApp,
} from '../../libs/perms/checkPermsFor.ts';
import { allOldPerms, oldPressPerms } from '../../account/lib/oldPerms';

export default async (event) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer;
    const urlId = event.pathParameters.id;
    const perms = JSON.parse(event.requestContext.authorizer.perms);

    const isAdmin = await checkPermsForApp(userId, appId, ['admin'], {
      dontThrow: true,
    });
    if (userId !== urlId && !isAdmin) {
      return response({ code: 403, message: 'access_forbidden' });
    }

    const isArticleEditor = await checkFeaturePermsForApp(
      userId,
      appId,
      ['articlesEditor'],
      { dontThrow: true }
    );

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
      'superAdmin',
    ]);
    if (isAdmin) {
      results.perms = allOldPerms;
    } else if (isArticleEditor) {
      results.perms = oldPressPerms;
    } else {
      results.perms = perms;
    }
    try {
      results.allBadges = await getSelfUserBadges(appId, urlId);
    } catch (e) {
      results.allBadges = [];
    }

    /* Check terms of services */
    results.optInIds = results.optIn;
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
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
