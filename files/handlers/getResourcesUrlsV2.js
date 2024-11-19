/* eslint-disable import/no-relative-packages */
import getResourcesUrlsV2, {
  resourcesFormats,
} from '../lib/getResourcesUrlsV2';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const resources = Object.keys(resourcesFormats).reduce((acc, platform) => {
      Object.keys(resourcesFormats[platform]).forEach((imageName) => {
        acc.push({ platform, imageName });
      });
      return acc;
    }, []);

    const body = await getResourcesUrlsV2(appId, {
      resources,
    });
    return response({ code: 200, body });
  } catch (e) {
    return response(errorMessage(e));
  }
};
