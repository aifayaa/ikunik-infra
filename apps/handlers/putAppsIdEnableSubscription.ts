import { APIGatewayProxyEvent } from 'aws-lambda';
import Stripe from 'stripe';

import response, { handleException } from '@libs/httpResponses/response';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_NOT_FOUND,
  ERROR_TYPE_STRIPE,
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_APPLICATION_CODE,
  STRIPE_SUBSCRIPTION_STATUS_NOT_ALLOWED_CODE,
  STRIPE_SUBSCRIPTION_NOT_FOUND_CODE,
} from '@libs/httpResponses/errorCodes';
import {
  getApp,
  getStripeSubscriptionMetadata,
  isStripeSubcriptionStatus,
} from '@apps/lib/appsUtils';
import { getStripeClient } from '@libs/stripe';
import { checkPermsForApp } from '@libs/perms/checkPermsFor';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';

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

    if (!app.stripe?.subscriptionId) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        STRIPE_SUBSCRIPTION_NOT_FOUND_CODE,
        'Application does not have a stripe subscriptionId',
        {
          details: {
            appId,
          },
        }
      );
    }

    const stripe = getStripeClient();

    const stripeSubscription = await stripe.subscriptions.retrieve(
      app.stripe.subscriptionId
    );

    if (!stripeSubscription) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        STRIPE_SUBSCRIPTION_NOT_FOUND_CODE,
        'Cannot find Stripe subscription',
        {
          details: {
            appId,
            subscriptionId: app.stripe.subscriptionId,
          },
        }
      );
    }

    if (
      stripeSubscription.status === 'canceled' ||
      (isStripeSubcriptionStatus(stripeSubscription.metadata.crowdaaStatus) &&
        stripeSubscription.metadata.crowdaaStatus !== 'hold')
    ) {
      throw new CrowdaaError(
        ERROR_TYPE_STRIPE,
        STRIPE_SUBSCRIPTION_STATUS_NOT_ALLOWED_CODE,
        'The subscription status is not in an allowed state to be processed',
        {
          details: {
            appId,
            status: stripeSubscription.status,
            crowdaaStatus: stripeSubscription.metadata.crowdaaStatus,
          },
        }
      );
    }

    const update: Stripe.SubscriptionUpdateParams = {
      // Resume the subscription payment collection
      billing_cycle_anchor: 'now',
      pause_collection: '',
      proration_behavior: 'none',
      metadata: {
        ...stripeSubscription.metadata,
        ...getStripeSubscriptionMetadata('active'),
      },
    };

    const updatedSubscription = await stripe.subscriptions.update(
      app.stripe.subscriptionId,
      update
    );

    return response({
      code: 200,
      body: formatResponseBody({
        data: {
          message: 'Subscription updated',
          details: {
            subscriptionId: updatedSubscription.id,
            update,
          },
        },
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
