import { APIGatewayProxyEvent } from 'aws-lambda';
import {
  CHECKOUT_SESSION_INSTANCIATION_FAILED_CODE,
  ERROR_TYPE_NOT_FOUND,
  ERROR_TYPE_STRIPE,
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_APPLICATION_CODE,
  STRIPE_CUSTOMER_ID_NOT_FOUND_CODE,
} from '@libs/httpResponses/errorCodes';

import { getOrganization } from '@organizations/lib/organizationsUtils';
import MongoClient from '@libs/mongoClient.js';
import response, { handleException } from '@libs/httpResponses/response';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import { checkPermsForApp } from '@libs/perms/checkPermsFor';
import { putAppsIdCheckout } from '@apps/lib/putAppsIdCheckout';
import { getApp, getApplicationOrganizationId } from '@apps/lib/appsUtils';
import { isEmpty } from 'lodash';

let client: any; // TODO type
let db: any; // TODO type

export default async (event: APIGatewayProxyEvent) => {
  const { principalId: userId } = (event.requestContext || {}).authorizer || {};
  const appId = event.pathParameters?.id;

  if (!client) client = await MongoClient.connect();
  if (!db) db = client.db();

  try {
    if (!appId) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_APPLICATION_CODE,
        `Path parameter appId is not defined: '${appId}'`
      );
    }

    await checkPermsForApp(userId, appId, ['admin']);

    const app = await getApp(appId);
    const appOrgId = getApplicationOrganizationId(app);
    const org = await getOrganization(appOrgId);
    const { stripeCustomerId } = org;

    if (isEmpty(stripeCustomerId)) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        STRIPE_CUSTOMER_ID_NOT_FOUND_CODE,
        'Organization does not have stripeCustomerId property'
      );
    }

    const sessionUrl = await putAppsIdCheckout({ stripeCustomerId, userId, app, db });
    if (!sessionUrl) {
      throw new CrowdaaError(
        ERROR_TYPE_STRIPE,
        CHECKOUT_SESSION_INSTANCIATION_FAILED_CODE,
        'Fail to create Stripe checkout session'
      );
    }

    return response({ code: 200, body: { url: sessionUrl } });
  } catch (exception) {
    return handleException(exception);
  } finally {
    await client.close();
  }
};
