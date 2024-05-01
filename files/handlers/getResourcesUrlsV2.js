/* eslint-disable import/no-relative-packages */
import getResourcesUrlsV2, {
  allActions,
  resourcesFormats,
} from '../lib/getResourcesUrlsV2';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { objGet } from '../../libs/utils';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  const { action } = event.pathParameters;
  let { resources } = event.queryStringParameters || {};

  try {
    const allowed = await checkPermsForApp(userId, appId, 'admin');
    if (!allowed) {
      throw new Error('access_forbidden');
    }

    if (!action || allActions.indexOf(action) < 0) {
      throw new Error('mal_formed_request');
    }

    if (!resources) {
      resources = undefined;
    } else {
      const list = resources.split(',').map((x) => x.split('.'));
      list.forEach(([platform, imageName]) => {
        if (!objGet(resourcesFormats, [platform, imageName])) {
          throw new Error('mal_formed_request');
        }
      });

      resources = list.map(([platform, imageName]) => ({
        platform,
        imageName,
      }));
    }

    const body = await getResourcesUrlsV2(appId, {
      action,
      resources,
    });
    return response({ code: 200, body });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
