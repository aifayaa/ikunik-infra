/* eslint-disable import/no-relative-packages */
import delOrgApp from '../lib/delOrgApp';
import response, { handleException } from '../../libs/httpResponses/response';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import { checkPermsForOrganization } from '../../libs/perms/checkPermsFor';
import {
  APP_ALREADY_BUILD_CODE,
  APP_NOT_FOUND_CODE,
  ERROR_TYPE_ACCESS,
  ERROR_TYPE_INTERNAL_EXCEPTION,
  ERROR_TYPE_NOT_FOUND,
  ORGANIZATION_PERMISSION_CODE,
} from '../../libs/httpResponses/errorCodes';
import { isAppAlreadyBuild } from '../../apps/lib/appsUtils';
import getApp from '../../apps/lib/getApp';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError.ts';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const { id: orgId, appId } = event.pathParameters;

  try {
    const orgPermissionLevel = 'admin';
    const allowed = await checkPermsForOrganization(
      userId,
      orgId,
      orgPermissionLevel
    );
    if (!allowed) {
      const errorBody = formatResponseBody({
        errors: [
          {
            type: ERROR_TYPE_ACCESS,
            code: ORGANIZATION_PERMISSION_CODE,
            message: `User '${userId}' is not at least '${orgPermissionLevel}' on organization '${orgId}'`,
            details: {
              userId,
              orgId,
              orgPermissionLevel,
            },
          },
        ],
      });
      return response({ code: 200, body: errorBody });
    }

    const app = getApp(appId);

    if (
      app.organization === undefined ||
      app.organization._id === undefined ||
      app.organization._id !== orgId
    ) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        APP_NOT_FOUND_CODE,
        `Application '${appId}' is not in the organization '${orgId}'`,
        {
          details: {
            appId,
          },
        }
      );
    }

    // TODO: Quand on aura l'info de la publication de l'app sur les stores, prendre ça en compte plus tard.
    if (isAppAlreadyBuild(app)) {
      const errorBody = formatResponseBody({
        errors: [
          {
            type: ERROR_TYPE_INTERNAL_EXCEPTION,
            code: APP_ALREADY_BUILD_CODE,
            message: `Cannot delete application '${appId}' because it has been build.`,
          },
        ],
      });
      return response({ code: 200, body: errorBody });
    }

    const org = await delOrgApp(orgId, appId, userId);
    return response({ code: 200, body: formatResponseBody({ data: org }) });
  } catch (exception) {
    return handleException(exception);
  }
};
