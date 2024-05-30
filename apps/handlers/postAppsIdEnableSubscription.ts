/* eslint-disable import/no-relative-packages */
import { APIGatewayProxyEvent } from 'aws-lambda';

import response, { handleException } from '../../libs/httpResponses/response';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_NOT_FOUND,
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_APPLICATION_CODE,
  SUBSCRIPTION_NOT_FOUND_CODE,
} from '../../libs/httpResponses/errorCodes';

import { getApp } from '../lib/appsUtils';
import { getStripeClient } from '../../libs/stripe';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event: APIGatewayProxyEvent) => {
  const { principalId: userId } = (event.requestContext || {}).authorizer || {};
  const appId = event.pathParameters?.id;

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

    if (!app.stripeSubscriptionId) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        SUBSCRIPTION_NOT_FOUND_CODE,
        `Cannot find Stripe subscription for application '${appId}'`
      );
    }

    const stripe = getStripeClient();

    await stripe.subscriptions.update(app.stripeSubscriptionId, {
      // Resume the subscription
      billing_cycle_anchor: 'now',
      pause_collection: '',
    });

    return response({ code: 200, body: 'Ok' });
  } catch (exception) {
    return handleException(exception);
  }
};
