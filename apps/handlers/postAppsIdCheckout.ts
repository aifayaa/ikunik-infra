import { z } from 'zod';
import { APIGatewayProxyEvent } from 'aws-lambda';
import {
  CHECKOUT_SESSION_INSTANCIATION_FAILED_CODE,
  ERROR_TYPE_NOT_FOUND,
  ERROR_TYPE_STRIPE,
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_APPLICATION_CODE,
  MISSING_BODY_CODE,
  STRIPE_CUSTOMER_ID_NOT_FOUND_CODE,
} from '@libs/httpResponses/errorCodes';

import { getOrganization } from '@organizations/lib/organizationsUtils';
import MongoClient from '@libs/mongoClient.js';
import response, { handleException } from '@libs/httpResponses/response';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import { checkPermsForApp } from '@libs/perms/checkPermsFor';
import { postAppsIdCheckout } from '@apps/lib/postAppsIdCheckout';
import { getApp, getApplicationOrganizationId } from '@apps/lib/appsUtils';
import { isEmpty } from 'lodash';
import { formatValidationErrors } from '@libs/httpResponses/formatValidationErrors';

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

    if (!event.body) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_BODY_CODE,
        'Body is missing from the request'
      );
    }

    const enableSubscriptionSchema = z
      .object({
        success_url: z
          .string({
            required_error: 'success_url is required',
            invalid_type_error: 'success_url must be a string',
          })
          .url()
          .trim(),
        cancel_url: z
          .string({
            required_error: 'cancel_url is required',
            invalid_type_error: 'cancel_url must be a string',
          })
          .url()
          .trim(),
      })
      .required();

    const body = JSON.parse(event.body);

    let validatedBody;
    // validation
    try {
      validatedBody = enableSubscriptionSchema.parse(body);
    } catch (exception) {
      return formatValidationErrors(exception);
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

    const sessionUrl = await postAppsIdCheckout({
      stripeCustomerId,
      userId,
      app,
      db,
      checkoutSessionCancelUrl: validatedBody.cancel_url,
      checkoutSessionSuccessUrl: validatedBody.success_url,
    });

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
