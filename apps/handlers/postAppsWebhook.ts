/* eslint-disable import/no-relative-packages */
// import stripe from ('stripe')(
//   'sk_test_51LBJZKKD2Srbl7Iomp6ag5TPCImTUfKOJGxzb7MPFfgBhgaN36c0C9FHzAvUTj4kuWXRx2B5dhQamqFxKZNJAepW00vwksLCFx'
// );
import { APIGatewayProxyEvent } from 'aws-lambda';

import Stripe from 'stripe';

import response, { handleException } from '../../libs/httpResponses/response';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  CHECKOUT_SESSION_INSTANCIATION_FAILED_CODE,
  ERROR_TYPE_SETUP,
  ERROR_TYPE_STRIPE,
  MISSING_ENVIRONMENT_VARIABLE_CODE,
} from '../../libs/httpResponses/errorCodes';

import { getApp, getApplicationOrganizationId } from '../lib/appsUtils';
import { getOrganization } from '../../organizations/lib/organizationsUtils';
import { getStripeClient } from '../../libs/stripe';

import { checkBodyIsPresent } from '../../libs/httpResponses/checks';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

const YOUR_DOMAIN = 'http://localhost:4242';

const STRIPE_WEBHOOK_SECRET =
  'whsec_f87467f40045df67affa6b33de01b7b1d8da6d41bc480facacbd3d8fcae7ec71';

export default async (event: APIGatewayProxyEvent) => {
  try {
    const payload = checkBodyIsPresent(event.body);

    const stripe = getStripeClient();

    let stripeEvent: Stripe.Event | undefined;

    try {
      const sig = event.headers['Stripe-Signature'] as string;
      stripeEvent = await stripe.webhooks.constructEventAsync(
        payload,
        sig,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (exception) {
      return response({
        code: 400,
        body: formatResponseBody({
          errors: [
            {
              type: 'STRIPE_WEEKHOOK',
              code: '400',
              message: `Webhook Error: ${exception.message}`,
              details: exception.stack,
            },
          ],
        }),
      });
    }

    // console.log('stripeEvent.type', stripeEvent.type);

    // if (stripeEvent.type === 'customer.subscription.created') {
    //   console.log('STRIPEEVENT.type', stripeEvent.type);
    //   console.log('stripeEvent', stripeEvent);
    // }

    if (stripeEvent.type === 'customer.subscription.updated') {
      console.log('STRIPEEVENT.type', stripeEvent.type);
      console.log('stripeEvent', stripeEvent);
      const {
        id,
        metadata: { initial },
      } = stripeEvent.data.object;

      console.log('initial', initial);

      if (initial === 'true') {
        console.log('trigger suspense update => update metadata');
        await stripe.subscriptions.update(id, {
          metadata: {
            initial: 'false',
          },
          // Suspense the current subscription
          pause_collection: {
            behavior: 'mark_uncollectible',
          },
        });
      }
    }

    return response({ code: 200, body: 'Ok' });
  } catch (exception) {
    // console.log('exception', exception);
    return handleException(exception);
  }
};
