/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import {
  APPLICATION_PERMISSION_CODE,
  APP_ALREADY_BUILD_CODE,
  ERROR_TYPE_ACCESS,
  ERROR_TYPE_INTERNAL_EXCEPTION,
} from '../../libs/httpResponses/errorCodes';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import delApp from '../lib/delApp';
import { isAppAlreadyBuild } from '../../organizations/lib/organizationsUtils';

const { COLL_APPS } = mongoCollections;

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const appId = event.pathParameters.id;
  const client = await MongoClient.connect();

  try {
    const appPermissionLevel = 'owner';
    // console.log('Before check');
    const allowedApp = await checkPermsForApp(
      userId,
      appId,
      appPermissionLevel
    );
    // console.log('After  check');
    if (!allowedApp) {
      throw new CrowdaaError(
        ERROR_TYPE_ACCESS,
        APPLICATION_PERMISSION_CODE,
        `User '${userId}' is not at least '${appPermissionLevel}' on application '${appId}'`,
        {
          details: {
            userId,
            appId,
            appPermissionLevel,
          },
        }
      );
    }

    const app = await client.db().collection(COLL_APPS).findOne({ _id: appId });
    if (isAppAlreadyBuild(app)) {
      throw new CrowdaaError(
        ERROR_TYPE_INTERNAL_EXCEPTION,
        APP_ALREADY_BUILD_CODE,
        `Application '${appId}' cannot be deleted because already built`,
        {
          details: {
            userId,
            appId,
            appPermissionLevel,
          },
        }
      );
    }

    const res = await delApp(userId, appId);
    // console.log('res', res);

    return response({
      code: 200,
      body: formatResponseBody({ data: res }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
