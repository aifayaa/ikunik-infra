/* eslint-disable import/no-relative-packages */
import getResourcesUrls, {
  allResourceTypes,
  allResourceFormats,
  allActions,
} from '../lib/getResourcesUrls';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  const { action } = event.pathParameters;
  let { resourceTypes, resourceFormats } = event.queryStringParameters || {};

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    if (!action || allActions.indexOf(action) < 0) {
      throw new Error('mal_formed_request');
    }

    if (!resourceTypes) {
      resourceTypes = undefined;
    } else if (typeof resourceTypes === 'string') {
      resourceTypes = resourceTypes.split(',');
      resourceTypes.forEach((item) => {
        if (allResourceTypes.indexOf(item) < 0) {
          throw new Error('mal_formed_request');
        }
      });
    }
    if (!resourceFormats) {
      resourceFormats = undefined;
    } else if (typeof resourceFormats === 'string') {
      resourceFormats = resourceFormats.split(',');
      resourceFormats.forEach((item) => {
        if (allResourceFormats.indexOf(item) < 0) {
          throw new Error('mal_formed_request');
        }
      });
    }

    const body = await getResourcesUrls(appId, {
      action,
      resourceTypes,
      resourceFormats,
    });
    return response({ code: 200, body });
  } catch (e) {
    return response(errorMessage(e));
  }
};
